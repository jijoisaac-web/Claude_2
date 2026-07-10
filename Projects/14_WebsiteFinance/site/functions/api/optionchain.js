// GET /api/optionchain?symbol=NIFTY|RELIANCE[&expiry=DD-Mon-YYYY] — trimmed NSE option chain
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/option-chain",
};
const INDICES = new Set(["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50"]);

async function fetchNSE(apiUrl){
  let r = await fetch(apiUrl, { headers: HDRS });
  if(r.ok){ try{ const j = await r.json(); if(j && j.records) return j; }catch(e){} }
  const home = await fetch("https://www.nseindia.com/option-chain", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  r = await fetch(apiUrl, { headers: { ...HDRS, cookie: cookies.join("; ") } });
  if(!r.ok) throw new Error(`NSE ${r.status}`);
  const j = await r.json();
  if(!j || !j.records) throw new Error("empty chain");
  return j;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "NIFTY").toUpperCase().replace(/\.NS$/, "");
  const wantExpiry = url.searchParams.get("expiry");
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const kind = INDICES.has(symbol) ? "indices" : "equities";
    const j = await fetchNSE(`https://www.nseindia.com/api/option-chain-${kind}?symbol=${encodeURIComponent(symbol)}`);
    const rec = j.records;
    const expiries = rec.expiryDates || [];
    const expiry = wantExpiry && expiries.includes(wantExpiry) ? wantExpiry : expiries[0];
    const num = v => (v==null || isNaN(+v)) ? null : +v;
    const leg = x => x ? { oi:num(x.openInterest), chg:num(x.changeinOpenInterest),
      iv:num(x.impliedVolatility), ltp:num(x.lastPrice), vol:num(x.totalTradedVolume) } : null;
    const strikes = (rec.data || [])
      .filter(d => d.expiryDate === expiry)
      .map(d => ({ k:num(d.strikePrice), ce:leg(d.CE), pe:leg(d.PE) }))
      .filter(d => d.k!=null)
      .sort((a,b)=>a.k-b.k);
    if(!strikes.length) throw new Error("no option data for this symbol/expiry (not in F&O?)");
    const out = { symbol, spot:num(rec.underlyingValue), expiry, expiries:expiries.slice(0,6),
      asOf: rec.timestamp || null, strikes };
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=300, max-age=120",
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
