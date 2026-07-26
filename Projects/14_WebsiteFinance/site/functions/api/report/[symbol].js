// POST /api/report/:symbol — AI-generated research report, stitched together from the same numbers
// already computed and shown across the Fundamentals tab (valuation, quality/value scores, technical
// setup, news sentiment, promoter shareholding trend, insider filing activity). Same Workers AI
// pattern as news.js / finai.js / explain.js: this endpoint does no data-fetching of its own, it only
// interprets a compact bundle the client assembled from data it already has on screen — so the
// report can't contain anything not already visible elsewhere in the app, it just reads it as prose.
// Not edge-cached: POST body varies per stock while the URL doesn't (same reasoning as finai.js).
const fmtCr = v => v == null ? "—" : `₹${Math.round(v).toLocaleString("en-IN")} Cr`;
const fmtPct = v => v == null ? "—" : `${v.toFixed(1)}%`;

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
    const prompt =
      `Using ONLY the data below (already computed by the app, do not invent numbers), write a short research ` +
      `report on this NSE-listed Indian stock for a retail investor doing their own research. Be balanced — call ` +
      `out both strengths and concerns, and be explicit when a section's underlying data is thin or missing rather ` +
      `than papering over it.\n\n${lines.join("\n")}\n\n` +
      `Return strict JSON (no markdown, no extra text):\n` +
      `{"overview":"2-3 sentences on what the company is / does and its current standing",` +
      `"financialHealth":"3-4 sentences on profitability, margins, growth, balance sheet, valuation",` +
      `"technicalPicture":"2-3 sentences on the current price trend/setup",` +
      `"institutionalActivity":"2-3 sentences on promoter/insider/news signals, or say plainly if there's little to go on",` +
      `"risks":"2-3 sentences, the most important things that could go wrong or already look weak",` +
      `"bottomLine":"1-2 sentence balanced takeaway — not a buy/sell instruction, a summary of the trade-offs"}`;
    const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: "You are a careful, balanced equity research assistant writing for a retail investor. You never invent figures beyond what you're given, you flag thin or missing data honestly, and you never give a direct buy/sell instruction — only a balanced read of the trade-offs. Output strict JSON only." },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
    });
    const txt = (r && (r.response || r.result || "")) + "";
    const jm = txt.match(/\{[\s\S]*\}/);
    if (!jm) throw new Error("AI did not return JSON");
    const parsed = JSON.parse(jm[0]);
    if (!parsed || typeof parsed.overview !== "string") throw new Error("unexpected AI response shape");
    return new Response(JSON.stringify({ aiConfigured: true, ...parsed }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ aiConfigured: true, error: String(e.message || e) }),
      { status: 502, headers: { "content-type": "application/json" } });
  }
}
