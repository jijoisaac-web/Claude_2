// GET /api/news?symbol=RELIANCE&name=Reliance%20Industries
// Fetches recent headlines (Google News RSS) and, if the Workers AI binding is configured,
// generates a bull/bear brief with sentiment via @cf/meta/llama-3.1-8b-instruct.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function tag(block, t){
  const r = new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${t}>`).exec(block);
  return r ? r[1].trim() : null;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "").toUpperCase().replace(/\.NS$/, "");
  const name = url.searchParams.get("name") || symbol;
  if(!symbol) return new Response(JSON.stringify({error:"symbol required"}), {status:400, headers:{"content-type":"application/json"}});
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const q = encodeURIComponent(`"${name}" stock India`);
    const rss = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`, { headers: { "user-agent": UA } });
    if(!rss.ok) throw new Error(`news feed ${rss.status}`);
    const xml = await rss.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map(m => ({
      title: tag(m[1], "title"),
      link: tag(m[1], "link"),
      date: tag(m[1], "pubDate"),
      source: tag(m[1], "source"),
    })).filter(x => x.title);

    let ai = null;
    if(env.AI && items.length){
      try{
        const prompt = `Recent headlines about ${name} (NSE: ${symbol}), an Indian listed company:\n` +
          items.map(i => "- " + i.title).join("\n") +
          `\n\nBased ONLY on these headlines, return strict JSON (no markdown, no extra text):\n` +
          `{"summary":"2-3 sentence neutral summary","bull":"the bull case in 1-2 sentences","bear":"the bear case in 1-2 sentences","sentiment":<integer from -5 (very negative) to 5 (very positive)>,"catalysts":["up to 3 short upcoming catalysts or watch-items"]}`;
        const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: "You are a concise, skeptical equity analyst. Output strict JSON only. Never invent facts not implied by the headlines." },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
        });
        const txt = (r && (r.response || r.result || "")) + "";
        const jm = txt.match(/\{[\s\S]*\}/);
        if(jm){
          const parsed = JSON.parse(jm[0]);
          if(parsed && typeof parsed.summary === "string") ai = parsed;
        }
      }catch(e){ ai = { error: String(e.message || e) }; }
    }
    const out = { symbol, name, aiConfigured: !!env.AI, items: items.slice(0, 8), ai };
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=1800, max-age=600",
        "access-control-allow-origin": "*",
      },
    });
    await cache.put(cacheKey, res.clone());
    return res;
  }catch(e){
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}
