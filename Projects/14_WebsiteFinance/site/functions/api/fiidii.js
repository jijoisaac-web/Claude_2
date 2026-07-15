// GET /api/fiidii — NSE provisional FII/DII cash-market activity for the latest trading day
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/reports/fii-dii",
};

const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function rowAgeDays(rows){
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(rows[0]?.date || "");
  if(!m) return null;
  const d = new Date(+m[3], MONTHS[m[2]] ?? 0, +m[1]);
  return (Date.now() - d.getTime()) / 86400000;
}
async function fetchNSE(){
  // attempt 1: direct
  let r = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", { headers: HDRS });
  let j = null;
  if(r.ok){
    try{ const t = JSON.parse(await r.text()); if(Array.isArray(t) && t.length) j = t; }catch(e){}
  }
  // NSE sometimes serves STALE data to cookie-less datacenter clients — if the payload is
  // valid but older than ~5 days, force a fresh cookie handshake and retry.
  const age = j ? rowAgeDays(j) : null;
  if(j && (age == null || age <= 5)) return j;
  // attempt 2: bootstrap cookies from the homepage, then retry
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  const cookie = cookies.join("; ");
  r = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", { headers: { ...HDRS, cookie } });
  if(!r.ok){
    if(j) return j;                       // stale beats nothing
    throw new Error(`NSE ${r.status}`);
  }
  const j2 = await r.json();
  if(Array.isArray(j2) && j2.length){
    const age2 = rowAgeDays(j2);
    // prefer the fresher of the two
    if(!j || age2 == null || age == null || age2 <= age) return j2;
  }
  if(j) return j;
  throw new Error("empty response");
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
