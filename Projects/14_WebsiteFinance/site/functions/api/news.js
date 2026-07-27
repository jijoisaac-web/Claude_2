// GET /api/news?symbol=RELIANCE&name=Reliance%20Industries
// Fetches recent headlines (Google News RSS) and, if the Workers AI binding is configured,
// generates a bull/bear brief with sentiment via @cf/meta/llama-3.1-8b-instruct-fast.
// (Note: the non "-fast" variant was deprecated by Cloudflare on 2026-05-30 — the "-fast"
// variant is the one Cloudflare confirmed stays active, same model family, same request shape.)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function tag(block, t){
  const r = new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${t}>`).exec(block);
  return r ? r[1].trim() : null;
}
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
// literal text "[object Object]" via JS's default toString(), destroying the content before parsing
// ever ran. Walk the whole response looking for either a matching object directly, or a string
// anywhere inside it that parses into one.
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
    let items = [], feedUsed = null, lastErr = null;

    // 1) Yahoo Finance search API — same host that already serves our chart proxy, so it reaches Cloudflare fine
    try{
      const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}.NS&newsCount=10&quotesCount=0`,
        { headers: { "user-agent": UA, accept: "application/json" } });
      if(r.ok){
        const j = await r.json();
        const got = (j.news || []).map(n => ({
          title: n.title,
          link: n.link,
          date: n.providerPublishTime ? new Date(n.providerPublishTime*1000).toUTCString() : null,
          source: n.publisher || "Yahoo Finance",
        })).filter(x => x.title);
        if(got.length){ items = got; feedUsed = "Yahoo Finance"; }
        else lastErr = "Yahoo empty";
      } else lastErr = `Yahoo ${r.status}`;
    }catch(e){ lastErr = "Yahoo: " + e.message; }

    // 2) GDELT — a public news index built for programmatic access; very datacenter-friendly
    if(!items.length){
      try{
        const r = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${name}"`)}&mode=ArtList&format=json&maxrecords=10&sort=DateDesc`,
          { headers: { "user-agent": UA, accept: "application/json" } });
        if(r.ok){
          const j = await r.json();
          const got = (j.articles || []).map(a => ({
            title: a.title, link: a.url,
            date: a.seendate ? a.seendate.replace(/(\d{4})(\d{2})(\d{2}).*/, "$3-$2-$1") : null,
            source: a.domain || "GDELT",
          })).filter(x => x.title);
          if(got.length){ items = got; feedUsed = "GDELT"; }
          else lastErr = "GDELT empty";
        } else lastErr = `GDELT ${r.status}`;
      }catch(e){ lastErr = "GDELT: " + e.message; }
    }

    // 3+4) RSS fallbacks
    if(!items.length){
      const FEEDS = [
        { src: "Bing News",   url: `https://www.bing.com/news/search?q=${q}&format=rss` },
        { src: "Google News", url: `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en` },
      ];
      for(const f of FEEDS){
        try{
          const rss = await fetch(f.url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" } });
          if(!rss.ok){ lastErr = `${f.src} ${rss.status}`; continue; }
          const xml = await rss.text();
          const got = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map(m => ({
            title: tag(m[1], "title"),
            link: tag(m[1], "link"),
            date: tag(m[1], "pubDate"),
            source: tag(m[1], "source") || f.src,
          })).filter(x => x.title && x.title.length > 5);
          if(got.length){ items = got; feedUsed = f.src; break; }
          lastErr = `${f.src} empty`;
        }catch(e){ lastErr = `${f.src}: ${e.message}`; }
      }
    }
    if(!items.length) throw new Error(lastErr || "all news sources unavailable");

    let ai = null;
    if(env.AI && items.length){
      try{
        const prompt = `Recent headlines about ${name} (NSE: ${symbol}), an Indian listed company:\n` +
          items.map(i => "- " + i.title).join("\n") +
          `\n\nBased ONLY on these headlines, return strict JSON (no markdown, no extra text):\n` +
          `{"summary":"2-3 sentence neutral summary","bull":"the bull case in 1-2 sentences","bear":"the bear case in 1-2 sentences","sentiment":<integer from -5 (very negative) to 5 (very positive)>,"catalysts":["up to 3 short upcoming catalysts or watch-items"]}`;
        const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
          messages: [
            { role: "system", content: "You are a concise, skeptical equity analyst. Output strict JSON only. Never invent facts not implied by the headlines." },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
        });
        let raw;
        try { raw = JSON.stringify(r); } catch (e) { raw = String(r); }
        const parsed = deepFindJson(r, o => typeof o.summary === "string") || extractJson(raw);
        if(parsed && typeof parsed.summary === "string") ai = parsed;
      }catch(e){ ai = { error: String(e.message || e) }; }
    }
    const out = { symbol, name, aiConfigured: !!env.AI, feed: feedUsed, items: items.slice(0, 8), ai };
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
