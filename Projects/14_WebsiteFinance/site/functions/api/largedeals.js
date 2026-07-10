// GET /api/largedeals — NSE bulk & block deals (latest published day)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/market-data/large-deals",
};
const API = "https://www.nseindia.com/api/snapshot-capital-market-largedeal";

async function fetchNSE(){
  let r = await fetch(API, { headers: HDRS });
  if(r.ok){
    try{ const j = await r.json(); if(j && (j.BULK_DEALS_DATA || j.BLOCK_DEALS_DATA)) return j; }catch(e){}
  }
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  r = await fetch(API, { headers: { ...HDRS, cookie: cookies.join("; ") } });
  if(!r.ok) throw new Error(`NSE ${r.status}`);
  return r.json();
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const j = await fetchNSE();
    const num = v => { const n = parseFloat(String(v).replace(/,/g,"")); return isNaN(n) ? null : n; };
    const norm = (rows, type) => (rows||[]).map(d => {
      const qty = num(d.qty), price = num(d.watp);
      return { type, date: d.date, symbol: d.symbol, name: d.name,
        client: d.clientName, side: d.buySell, qty, price,
        valueCr: qty!=null && price!=null ? qty*price/1e7 : null };
    }).filter(d => d.symbol && d.qty);
    const out = { deals: [...norm(j.BLOCK_DEALS_DATA, "BLOCK"), ...norm(j.BULK_DEALS_DATA, "BULK")] };
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
