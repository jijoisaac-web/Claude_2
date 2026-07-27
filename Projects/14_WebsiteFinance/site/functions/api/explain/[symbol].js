// POST /api/explain/:symbol — AI read of "why did this stock move," from context the client has
// already assembled (today's price/volume move, where price sits vs the volume-profile value area,
// the nearest fresh order block, any recent disclosed bulk/block deal, and recent headlines). Same
// Workers AI pattern as news.js's bull/bear brief and finai.js's ratio-trend read: this endpoint
// does no data-fetching of its own, it only interprets numbers/text the client already has, so the
// explanation is grounded in exactly what's on screen (Smart Money tab).

// Tolerates the model wrapping valid JSON with a stray newline or trailing comma — same defensive
// treatment applied to the report/finai endpoints after a truncation bug there caused "AI did not
// return JSON" failures.
function extractJson(txt) {
  const jm = (txt || "").match(/\{[\s\S]*\}/);
  if (!jm) return null;
  const raw = jm[0];
  const cleaned = raw.replace(/[\r\n]+/g, " ").replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(cleaned); } catch (e) {}
  try { return JSON.parse(raw); } catch (e) {}
  return null;
}
// Workers AI is documented as returning `{ response: "<text>" }`, but has been confirmed (live, on
// the sibling /api/report endpoint) to sometimes hand back that field already as an object rather
// than a string — the naive `(r.response || r.result || "") + ""` stringifies any object into the
// literal text "[object Object]" via JS's default toString(), destroying the content before this
// function ever runs. Walk the whole response looking for either a matching object directly, or a
// string anywhere inside it that parses into one.
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
  const {
    name, changePct, volumeRatio, priceVsValueArea, nearestBlock, recentDeal, headlines,
  } = body;
  try {
    const lines = [];
    lines.push(`Stock: ${name || symbol} (NSE: ${symbol.replace(".NS", "")})`);
    lines.push(`Latest session change: ${changePct != null ? changePct.toFixed(2) + "%" : "unknown"}`);
    lines.push(`Volume vs its own 20-day average: ${volumeRatio != null ? volumeRatio.toFixed(2) + "x" : "unknown"}`);
    if (priceVsValueArea) lines.push(`Price relative to its recent volume-profile value area: ${priceVsValueArea}`);
    if (nearestBlock) lines.push(`Nearest fresh order block (structural support/resistance proxy): ${nearestBlock}`);
    lines.push(`Disclosed institutional bulk/block deal near this date: ${recentDeal || "none disclosed"}`);
    if (Array.isArray(headlines) && headlines.length) {
      lines.push(`Recent headlines (may or may not be the actual cause):`);
      headlines.slice(0, 6).forEach(h => lines.push(`- ${h}`));
    } else {
      lines.push(`No recent headlines were found for this stock.`);
    }
    const prompt =
      `Here is everything available about a recent price move in an NSE-listed Indian stock:\n\n${lines.join("\n")}\n\n` +
      `Write a short, plain-English explanation of what likely happened. Be honest about uncertainty — if the ` +
      `move looks like normal noise with no clear catalyst (no news, no unusual volume, no deal), say so plainly ` +
      `rather than inventing a narrative. Never state a headline as the definite cause unless the volume/deal ` +
      `evidence actually supports it — correlation in timing is not proof. Return strict JSON (no markdown, no extra text):\n` +
      `{"explanation":"2-4 sentences, plain English, naming the most likely driver(s) or saying none stands out",` +
      `"confidence":"high, medium, or low — how much real corroborating evidence (volume/deal/news) actually lines up"}`;
    const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: "You are a careful markets analyst. You never overstate certainty about why a stock moved — daily moves are frequently just noise, and you say so when the evidence doesn't support a real catalyst. Output strict JSON only." },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    });
    let raw;
    try { raw = JSON.stringify(r); } catch (e) { raw = String(r); }
    const parsed = deepFindJson(r, o => typeof o.explanation === "string") || extractJson(raw);
    if (!parsed || typeof parsed.explanation !== "string") {
      throw new Error(`AI did not return usable JSON — got: ${JSON.stringify((raw || "").slice(0, 180))}`);
    }
    return new Response(JSON.stringify({ aiConfigured: true, ...parsed }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ aiConfigured: true, error: String(e.message || e) }),
      { status: 502, headers: { "content-type": "application/json" } });
  }
}
