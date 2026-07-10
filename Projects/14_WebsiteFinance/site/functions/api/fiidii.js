// GET /api/fiidii — NSE provisional FII/DII cash-market activity for the latest trading day
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/reports/fii-dii",
};

async function fetchNSE(){
  // attempt 1: direct
  let r = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", { headers: HDRS });
  if(r.ok){
    const txt = await r.text();
    try{ const j = JSON.parse(txt); if(Array.isArray(j) && j.length) return j; }catch(e){}
  }
  // attempt 2: bootstrap cookies from the homepage, then retry
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  const cookie = cookies.join("; ");
  r = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", { headers: { ...HDRS, cookie } });
  if(!r.ok) throw new Error(`NSE ${r.status}`);
  const j = await r.json();
  if(!Array.isArray(j) || !j.length) throw new Error("empty response");
  return j;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const rows = await fetchNSE();
    const num = v => { const n = parseFloat(String(v).replace(/,/g,"")); return isNaN(n) ? null : n; };
    const out = { date: rows[0]?.date || null };
    for(const row of rows){
      const key = /FII|FPI/i.test(row.category) ? "fii" : /DII/i.test(row.category) ? "dii" : null;
      if(key) out[key] = { buy: num(row.buyValue), sell: num(row.sellValue), net: num(row.netValue) };
    }
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
