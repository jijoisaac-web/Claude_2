// GET /api/mf/holdings?q=<fund name> — best-effort portfolio holdings via Groww's public web APIs.
// Endpoint shapes are unofficial and may change; the UI has a paste-from-factsheet fallback.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const H = { "user-agent": UA, accept: "application/json" };

// find any array of {company-ish name + percent-ish weight} objects anywhere in a JSON blob
function findHoldings(o, depth){
  depth = depth || 0;
  if(depth > 7 || o == null) return null;
  if(Array.isArray(o)){
    if(o.length && typeof o[0] === "object" && o[0]){
      const keys = Object.keys(o[0]).map(k => k.toLowerCase());
      const nameKey = Object.keys(o[0]).find(k => /company|stock_name|security|^name$/i.test(k));
      const pctKey  = Object.keys(o[0]).find(k => /corpus|percent|pct|weight/i.test(k));
      if(nameKey && pctKey) return o.map(x => ({ name: String(x[nameKey]), pct: parseFloat(x[pctKey]) || null }))
        .filter(x => x.name && x.name.length > 2);
    }
    for(const v of o){ const r = findHoldings(v, depth+1); if(r) return r; }
    return null;
  }
  if(typeof o === "object"){
    for(const v of Object.values(o)){ const r = findHoldings(v, depth+1); if(r) return r; }
  }
  return null;
}
function findSlugs(o, acc, depth){
  depth = depth || 0;
  if(depth > 7 || o == null) return acc;
  if(typeof o === "string"){
    if(/^[a-z0-9]+(-[a-z0-9]+){2,}$/.test(o) && /fund|growth|direct|plan|cap/.test(o)) acc.add(o);
    return acc;
  }
  if(Array.isArray(o)){ for(const v of o) findSlugs(v, acc, depth+1); return acc; }
  if(typeof o === "object"){ for(const v of Object.values(o)) findSlugs(v, acc, depth+1); }
  return acc;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if(!q) return new Response(JSON.stringify({error:"q required"}), {status:400, headers:{"content-type":"application/json"}});
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    // 1) find candidate scheme slugs via Groww search variants
    const searchUrls = [
      `https://groww.in/v1/api/search/v1/derived/scheme?available_for_investment=true&doc_type=scheme&page=0&q=${encodeURIComponent(q)}&size=5`,
      `https://groww.in/v1/api/search/v1/entity/search?entity_type=mf&page=0&q=${encodeURIComponent(q)}`,
    ];
    const slugs = new Set();
    for(const su of searchUrls){
      try{
        const r = await fetch(su, { headers: H });
        if(r.ok) findSlugs(await r.json(), slugs);
      }catch(e){}
      if(slugs.size) break;
    }
    if(!slugs.size) throw new Error("scheme not found on the holdings source");
    // 2) fetch details for the first couple of slugs, spelunk for a holdings array
    let holdings = null, used = null;
    for(const slug of [...slugs].slice(0,3)){
      for(const du of [
        `https://groww.in/v1/api/data/mf/web/v3/scheme/details/${slug}`,
        `https://groww.in/v1/api/data/mf/web/v1/scheme/details/${slug}`,
      ]){
        try{
          const r = await fetch(du, { headers: H });
          if(!r.ok) continue;
          const h = findHoldings(await r.json());
          if(h && h.length >= 5){ holdings = h; used = slug; break; }
        }catch(e){}
      }
      if(holdings) break;
    }
    if(!holdings) throw new Error("holdings not available from the source (paste from the factsheet instead)");
    holdings.sort((a,b) => (b.pct||0) - (a.pct||0));
    const res = new Response(JSON.stringify({ q, slug: used, holdings: holdings.slice(0, 40) }), {
      headers: { "content-type":"application/json", "cache-control":"public, s-maxage=21600, max-age=3600", "access-control-allow-origin":"*" },
    });
    await cache.put(cacheKey, res.clone());
    return res;
  }catch(e){
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502, headers: { "content-type":"application/json" },
    });
  }
}
