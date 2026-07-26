// POST /api/finai/:symbol — AI read of a stock's own multi-quarter/multi-year ratio trend.
// Body: { name, quarterly: [{label,revenue,netIncome,netMargin,grossMargin,opMargin,roe,debt,debtToEq,retention}, ...],
//         yearly: [ same shape ] }
// The client computes the ratio trend itself (same numbers shown in the tables on screen) and posts
// it here purely so the analysis is grounded in exactly what the user is looking at — this endpoint
// does no data-fetching of its own. Same Workers AI model/pattern as news.js's bull/bear brief.
// Not edge-cached: the POST body (the actual trend data) varies per symbol while the URL doesn't,
// and Cloudflare's Cache API keys off the URL — caching here would silently serve one stock's
// analysis to another. Client-side localStorage caching (in index.html) covers the repeat-view case.

const fmtRow = p => `${p.label}: revenue ${p.revenue ?? "—"}, net profit ${p.netIncome ?? "—"}, ` +
  `net margin ${p.netMargin ?? "—"}%, gross margin ${p.grossMargin ?? "—"}%, operating margin ${p.opMargin ?? "—"}%, ` +
  `ROE ${p.roe ?? "—"}%, debt ${p.debt ?? "—"}, debt/equity ${p.debtToEq ?? "—"}x` +
  (p.retention != null ? `, retention ratio ${p.retention}%` : "");

export async function onRequestPost({ request, env, params }) {
  const symbol = decodeURIComponent(params.symbol || "");
  let body;
  try { body = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  const name = body.name || symbol;
  const quarterly = Array.isArray(body.quarterly) ? body.quarterly.slice(-8) : [];
  const yearly = Array.isArray(body.yearly) ? body.yearly.slice(-5) : [];
  const aiConfigured = !!env.AI;
  if (!aiConfigured) {
    return new Response(JSON.stringify({ aiConfigured: false }), { headers: { "content-type": "application/json" } });
  }
  if (quarterly.length < 2 && yearly.length < 2) {
    return new Response(JSON.stringify({ aiConfigured: true, error: "not enough periods to analyze a trend" }),
      { headers: { "content-type": "application/json" } });
  }
  try {
    const prompt =
      `You are analyzing ${name} (NSE: ${symbol.replace(".NS", "")}), an Indian listed company, from its own trailing ` +
      `financial-statement ratios (already computed — do not recompute, just interpret). Currency figures are in ₹ crore.\n\n` +
      (quarterly.length >= 2 ? `Quarterly, oldest to newest:\n${quarterly.map(fmtRow).join("\n")}\n\n` : "") +
      (yearly.length >= 2 ? `Yearly, oldest to newest:\n${yearly.map(fmtRow).join("\n")}\n\n` : "") +
      `Based ONLY on this data, return strict JSON (no markdown, no extra text):\n` +
      `{"summary":"2-3 sentence neutral read of the overall trend across both windows",` +
      `"best":"the single strongest/most-improved metric, name it and say why in 1 sentence",` +
      `"worst":"the single weakest/most-deteriorated or most concerning metric, name it and say why in 1 sentence",` +
      `"trend":"one sentence: improving, stable, or deteriorating overall, and the main reason"}`;
    const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: "You are a concise, skeptical equity analyst reading a company's own historical ratio trend. Output strict JSON only. Never invent numbers not given to you; if data is missing (shown as —), say so rather than guessing." },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
    });
    const txt = (r && (r.response || r.result || "")) + "";
    const jm = txt.match(/\{[\s\S]*\}/);
    if (!jm) throw new Error("AI did not return JSON");
    const parsed = JSON.parse(jm[0]);
    if (!parsed || typeof parsed.summary !== "string") throw new Error("unexpected AI response shape");
    return new Response(JSON.stringify({ aiConfigured: true, ...parsed }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ aiConfigured: true, error: String(e.message || e) }),
      { status: 502, headers: { "content-type": "application/json" } });
  }
}
