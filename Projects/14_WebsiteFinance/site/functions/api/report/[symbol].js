// POST /api/report/:symbol — AI-generated research report, stitched together from the same numbers
// already computed and shown across the Fundamentals tab (valuation, quality/value scores, technical
// setup, news sentiment, promoter shareholding trend, insider filing activity). Same Workers AI
// pattern as news.js / finai.js / explain.js: this endpoint does no data-fetching of its own, it only
// interprets a compact bundle the client assembled from data it already has on screen — so the
// report can't contain anything not already visible elsewhere in the app, it just reads it as prose.
// Not edge-cached: POST body varies per stock while the URL doesn't (same reasoning as finai.js).
const fmtCr = v => v == null ? "—" : `₹${Math.round(v).toLocaleString("en-IN")} Cr`;
const fmtPct = v => v == null ? "—" : `${v.toFixed(1)}%`;

// Pulls the JSON object out of the model's raw text and tolerates the two failure modes actually
// seen in practice: (a) a literal newline or stray trailing comma inside an otherwise-valid object
// (cheap to repair), and (b) the response getting cut off mid-sentence because max_tokens ran out
// before the model finished all 6 sections (only fixable by asking again with more room / less to say).
function extractJson(txt) {
  const jm = (txt || "").match(/\{[\s\S]*\}/);
  if (!jm) return null;
  const raw = jm[0];
  const cleaned = raw.replace(/[\r\n]+/g, " ").replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(cleaned); } catch (e) {}
  try { return JSON.parse(raw); } catch (e) {}
  return null;
}
const REPORT_KEYS = ["overview", "financialHealth", "technicalPicture", "institutionalActivity", "risks", "bottomLine"];
function validReport(parsed) {
  return !!parsed && REPORT_KEYS.every(k => typeof parsed[k] === "string" && parsed[k].length > 0);
}

export async function onRequestPost({ request, env, params }) {
  const symbol = decodeURIComponent(params.symbol || "");
  let body;
  try { body = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  const aiConfigured = !!env.AI;
  if (!aiConfigured) {
    return new Response(JSON.stringify({ aiConfigured: false }), { headers: { "content-type": "application/json" } });
  }
  const b = body || {};
  try {
    const lines = [];
    lines.push(`Company: ${b.name || symbol} (NSE: ${symbol.replace(".NS", "")})${b.sector ? ` — ${b.sector}${b.industry ? " / " + b.industry : ""}` : ""}`);
    lines.push(`Price: ₹${b.price ?? "—"} | Market cap: ${fmtCr(b.marketCapCr)} | P/E: ${b.pe ?? "—"} | P/B: ${b.pb ?? "—"} | EPS: ${b.eps ?? "—"} | Div yield: ${fmtPct(b.dividendYield)}`);
    lines.push(`ROE: ${fmtPct(b.roe)} | Debt/Equity: ${b.debtToEquity ?? "—"} | Net margin: ${fmtPct(b.profitMargin)} | Revenue growth: ${fmtPct(b.revenueGrowth)} | Earnings growth: ${fmtPct(b.earningsGrowth)}`);
    lines.push(`Analyst recommendation: ${b.recommendation || "—"} | Target price: ₹${b.targetPrice ?? "—"}`);
    lines.push(`App's own composite scores (0-100): Investability ${b.investScore ?? "—"} (quality ${b.qualityScore ?? "—"}, value-trap risk ${b.valueTrapRisk ?? "—"}, margin-of-safety valuation factored in), Technical setup ${b.techScore ?? "—"}${b.aboveSma200 == null ? "" : b.aboveSma200 ? ", price above its 200-day average" : ", price BELOW its 200-day average"}`);
    lines.push(`News sentiment (last few headlines, AI-scored -5 to +5): ${b.newsSentiment ?? "no recent headlines found"}`);
    lines.push(`Promoter shareholding trend: ${b.promoterTrend || "no clear multi-quarter trend on file"}${b.promoterPct != null ? ` (currently ${b.promoterPct}% held by promoters)` : ""}`);
    lines.push(`Insider (SEBI PIT) filings in the last 90 days: ${b.insiderFilings90d ?? 0}`);
    // Kept deliberately shorter per section than the first version of this endpoint shipped with —
    // that one asked for up to 4 sentences across 6 fields inside a 700-token budget, which was
    // cutting the response off mid-object before the closing brace often enough to break JSON
    // parsing outright (the actual bug behind "AI did not return JSON"). Tighter per-field length
    // + more headroom fixes the truncation; the single quote/newline rule below fixes the rarer
    // "complete but malformed" case.
    const basePrompt =
      `Using ONLY the data below (already computed by the app, do not invent numbers), write a short research ` +
      `report on this NSE-listed Indian stock for a retail investor doing their own research. Be balanced — call ` +
      `out both strengths and concerns, and be explicit when a section's underlying data is thin or missing rather ` +
      `than papering over it. Keep every section to the sentence count asked — brevity matters more than completeness ` +
      `here. Never use a double-quote character inside any text value, and never put a line break inside one.\n\n` +
      `${lines.join("\n")}\n\n` +
      `Return strict, complete JSON and nothing else (no markdown fences, no text before or after):\n` +
      `{"overview":"1-2 sentences on what the company is / does and its current standing",` +
      `"financialHealth":"2-3 sentences on profitability, margins, growth, balance sheet, valuation",` +
      `"technicalPicture":"1-2 sentences on the current price trend/setup",` +
      `"institutionalActivity":"1-2 sentences on promoter/insider/news signals, or say plainly if there's little to go on",` +
      `"risks":"1-2 sentences, the most important things that could go wrong or already look weak",` +
      `"bottomLine":"1 sentence balanced takeaway — not a buy/sell instruction, a summary of the trade-offs"}`;
    const systemMsg = "You are a careful, balanced equity research assistant writing for a retail investor. You never invent figures beyond what you're given, you flag thin or missing data honestly, and you never give a direct buy/sell instruction — only a balanced read of the trade-offs. Output strict, complete JSON only — no markdown, no unescaped quotes or line breaks inside string values.";

    async function attempt(promptText, tokens) {
      const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [{ role: "system", content: systemMsg }, { role: "user", content: promptText }],
        max_tokens: tokens,
      });
      const txt = (r && (r.response || r.result || "")) + "";
      return extractJson(txt);
    }

    let parsed = await attempt(basePrompt, 900);
    if (!validReport(parsed)) {
      // One retry with an even harder cap on length — cheaper to ask for less than to debug why a
      // longer answer got cut off a second time.
      const retryPrompt = basePrompt.replace(/1-2 sentences/g, "1 sentence").replace(/2-3 sentences/g, "1-2 sentences");
      parsed = await attempt(retryPrompt, 700);
    }
    if (!validReport(parsed)) throw new Error("AI did not return complete JSON after retry");
    return new Response(JSON.stringify({ aiConfigured: true, ...parsed }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ aiConfigured: true, error: String(e.message || e) }),
      { status: 502, headers: { "content-type": "application/json" } });
  }
}
