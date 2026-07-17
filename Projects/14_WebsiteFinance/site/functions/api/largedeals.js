// GET /api/largedeals — NSE bulk & block deals (latest published day)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/market-data/large-deals",
};
const API = "https://www.nseindia.com/api/snapshot-capital-market-largedeal";

const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function newestAgeDays(j){
  // newest deal date across bulk+block, in days from now (null if unparseable)
  let newest = null;
  for(const arr of [j.BULK_DEALS_DATA, j.BLOCK_DEALS_DATA]){
    for(const d of (arr || [])){
      const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(d.date || "");
      if(!m) continue;
      const t = new Date(+m[3], MONTHS[m[2]] ?? 0, +m[1]).getTime();
      if(newest == null || t > newest) newest = t;
    }
  }
  return newest == null ? null : (Date.now() - newest) / 86400000;
}
async function fetchNSE(){
  // attempt 1: direct
  let j = null;
  let r = await fetch(API, { headers: HDRS });
  if(r.ok){
    try{ const t = await r.json(); if(t && (t.BULK_DEALS_DATA || t.BLOCK_DEALS_DATA)) j = t; }catch(e){}
  }
  // NSE serves stale snapshots to cookie-less datacenter clients — if the newest deal is
  // older than ~2 days (weekend-tolerant ~3.5), retry with a fresh cookie handshake.
  const age = j ? newestAgeDays(j) : null;
  if(j && age != null && age <= 3.5) return j;
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  r = await fetch(API, { headers: { ...HDRS, cookie: cookies.join("; ") } });
  if(r.ok){
    try{
      const j2 = await r.json();
      if(j2 && (j2.BULK_DEALS_DATA || j2.BLOCK_DEALS_DATA)){
        const age2 = newestAgeDays(j2);
        if(!j || age2 == null || age == null || age2 <= age) return j2;   // prefer fresher
      }
    }catch(e){}
  }
  if(j) return j;                       // stale beats nothing
  throw new Error(`NSE ${r.status}`);
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
        "cache-control": "public, s-maxage=900, max-age=300",
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
