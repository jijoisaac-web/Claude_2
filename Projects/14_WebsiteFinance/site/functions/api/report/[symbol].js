// POST /api/report/:symbol — AI-generated research report, stitched together from the same numbers
// already computed and shown across the Fundamentals tab (valuation, quality/value scores, technical
// setup, news sentiment, promoter shareholding trend, insider filing activity). Same Workers AI
// pattern as news.js / finai.js / explain.js: this endpoint does no data-fetching of its own, it only
// interprets a compact bundle the client assembled from data it already has on screen — so the
// report can't contain anything not already visible elsewhere in the app, it just reads it as prose.
// Not edge-cached: POST body varies per stock while the URL doesn't (same reasoning as finai.js).
const fmtCr = v => v == null ? "—" : `₹${Math.round(v).toLocaleString("en-IN")} Cr`;
const fmtPct = v => v == null ? "—" : `${v.toFixed(1)}%`;

const REPORT_KEYS = ["overview", "financialHealth", "technicalPicture", "institutionalActivity", "risks", "bottomLine"];

// Small "fast" instruct models occasionally substitute typographic quotes/dashes for plain ASCII
// ones, or wrap the object in a ```json fence despite being told not to — neither breaks a human
// reading it, but both break JSON.parse outright. Normalize before ever trying to parse.
function normalizeModelText(s) {
  return (s || "")
    .replace(/```json/gi, "").replace(/```/g, "")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—]/g, "-");
}
// Pulls the JSON object out of the model's raw text and tolerates the failure modes actually seen
// in practice: normalization above, a literal newline or stray trailing comma inside an otherwise-
// valid object (cheap to repair), or the response getting cut off mid-sentence because max_tokens
// ran out before the model finished all 6 sections.
function extractJson(txt) {
  const cleanedFull = normalizeModelText(txt);
  const jm = cleanedFull.match(/\{[\s\S]*\}/);
  if (!jm) return null;
  const raw = jm[0];
  const attempts = [raw, raw.replace(/[\r\n]+/g, " ").replace(/,\s*([}\]])/g, "$1")];
  for (const a of attempts) { try { const p = JSON.parse(a); if (p) return p; } catch (e) {} }
  return null;
}
// Last-resort fallback when the object as a whole won't parse (e.g. one field has an unescaped
// quote the model forgot to escape) — pulls each expected "key":"value" pair out individually by
// regex, so five good fields aren't sunk by one broken one. Tolerant of either quote style since
// normalizeModelText already ran.
function extractFieldsFallback(txt) {
  const cleaned = normalizeModelText(txt);
  const out = {};
  for (const k of REPORT_KEYS) {
    const re = new RegExp(`"${k}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"[a-zA-Z]+"\\s*:|\\}\\s*$|\\})`, "m");
    const m = re.exec(cleaned);
    if (m) out[k] = m[1].replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
  }
  return out;
}
function countValidKeys(obj) {
  return obj ? REPORT_KEYS.filter(k => typeof obj[k] === "string" && obj[k].length > 0).length : 0;
}
// Workers AI's documented shape for this model is `{ response: "<text>" }`, and that's what all four
// AI endpoints in this app were built against. In practice (confirmed live: this endpoint returned
// "attempt 1: \"[object Object]\"" for two consecutive real invocations) `r.response` — or `r.result`
// — can itself already be a non-string object, one level deeper than expected. The old code did
// `(r.response || r.result || "") + ""`, which silently stringifies any object via JS's default
// toString() into the literal text "[object Object]", destroying the data before extraction ever ran.
// This walks the entire response value looking for either an object that already has our keys, or a
// string anywhere inside it that parses into one — so whatever shape Workers AI actually handed back,
// real content gets found instead of thrown away.
function deepFindJson(node, validate, depth) {
  depth = depth || 0;
  if (depth > 6 || node == null) return null;
  if (typeof node === "string") {
    const t = node.trim();
    if (t.length > 1 && (t[0] === "{" || t[0] === "[")) {
      const parsed = extractJson(node);
      if (parsed && validate(parsed)) return parsed;
    }
    return null;
  }
  if (typeof node === "object") {
    if (!Array.isArray(node) && validate(node)) return node;
    const vals = Array.isArray(node) ? node : Object.values(node);
    for (const v of vals) {
      const found = deepFindJson(v, validate, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
function fillGaps(obj) {
  const out = { ...obj };
  for (const k of REPORT_KEYS) if (typeof out[k] !== "string" || !out[k].length) out[k] = "Not enough information came back for this section — try Generate report again.";
  return out;
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
      // Try the whole-response deep search first (handles the object-shaped-response case above);
      // `raw` is a JSON.stringify of the entire response for the regex fallback + any diagnostic
      // snippet, which is far more useful to debug from than the old "[object Object]" text ever was.
      let raw;
      try { raw = JSON.stringify(r); } catch (e) { raw = String(r); }
      let obj = deepFindJson(r, o => countValidKeys(o) > 0);
      if (!obj) obj = extractJson(raw);
      let keyCount = countValidKeys(obj);
      if (keyCount < REPORT_KEYS.length) {
        // Whole-object parse failed or was incomplete — try pulling individual fields out by regex
        // before giving up on this attempt entirely; a partial recovery still beats a hard failure.
        const fallback = extractFieldsFallback(raw);
        const fbCount = countValidKeys(fallback);
        if (fbCount > keyCount) { obj = fallback; keyCount = fbCount; }
      }
      return { obj, keyCount, raw };
    }

    let a1 = await attempt(basePrompt, 900);
    if (a1.keyCount === REPORT_KEYS.length) {
      return new Response(JSON.stringify({ aiConfigured: true, ...a1.obj }), { headers: { "content-type": "application/json" } });
    }
    // One retry with an even harder cap on length — cheaper to ask for less than to debug why a
    // longer answer got cut off a second time.
    const retryPrompt = basePrompt.replace(/1-2 sentences/g, "1 sentence").replace(/2-3 sentences/g, "1-2 sentences");
    const a2 = await attempt(retryPrompt, 700);
    const best = a2.keyCount >= a1.keyCount ? a2 : a1;
    if (best.keyCount === REPORT_KEYS.length) {
      return new Response(JSON.stringify({ aiConfigured: true, ...best.obj }), { headers: { "content-type": "application/json" } });
    }
    if (best.keyCount >= 3) {
      // Recovered most of it — fill the rest with a plain placeholder rather than throwing away a
      // mostly-good report over one or two missing sections.
      return new Response(JSON.stringify({ aiConfigured: true, ...fillGaps(best.obj), _partial: true }), { headers: { "content-type": "application/json" } });
    }
    // Genuinely unusable both times — surface a snippet of what actually came back so this is
    // debuggable from the error message alone instead of needing another blind guess-and-redeploy
    // round: was the field empty (wrong response key from Workers AI?), truncated, or malformed?
    const snip = s => s ? JSON.stringify(s.slice(0, 180)) : "(empty)";
    throw new Error(`AI did not return usable JSON — attempt 1: ${snip(a1.raw)} | attempt 2: ${snip(a2.raw)}`);
  } catch (e) {
    return new Response(JSON.stringify({ aiConfigured: true, error: String(e.message || e) }),
      { status: 502, headers: { "content-type": "application/json" } });
  }
}
