// GET /api/optionchain?symbol=NIFTY|RELIANCE[&expiry=DD-Mon-YYYY]
// Uses NSE's v3 option-chain API (the old option-chain-indices/equities endpoints now return {}).
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/option-chain",
};
const INDICES = new Set(["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50"]);

let session = { cookie: "", ts: 0 };
async function nseGet(apiUrl){
  let r = await fetch(apiUrl, { headers: session.cookie ? { ...HDRS, cookie: session.cookie } : HDRS });
  let j = null;
  if(r.ok){ try{ j = await r.json(); }catch(e){} }
  if(j && Object.keys(j).length) return j;
  // bootstrap cookies and retry once
  const home = await fetch("https://www.nseindia.com/option-chain", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  session = { cookie: cookies.join("; "), ts: Date.now() };
  r = await fetch(apiUrl, { headers: { ...HDRS, cookie: session.cookie } });
  if(!r.ok) throw new Error(`NSE ${r.status}`);
  j = await r.json();
  if(!j || !Object.keys(j).length) throw new Error("empty response");
  return j;
}

const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function parseExpiry(s){
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s || "");
  return m ? new Date(+m[3], MONTHS[m[2]] ?? 0, +m[1]) : null;
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
    // 1) expiry list
    const info = await nseGet(`https://www.nseindia.com/api/option-chain-contract-info?symbol=${encodeURIComponent(symbol)}`);
    const all = info.expiryDates || [];
    if(!all.length) throw new Error("no option contracts for this symbol (not in F&O?)");
    const today = new Date(); today.setHours(0,0,0,0);
    const future = all.filter(x => { const d = parseExpiry(x); return d && d >= today; });
    const expiries = (future.length ? future : all).slice(0, 6);
    const expiry = wantExpiry && all.includes(wantExpiry) ? wantExpiry : expiries[0];
    // 2) chain for that expiry
    const kind = INDICES.has(symbol) ? "Indices" : "Equity";
    const j = await nseGet(`https://www.nseindia.com/api/option-chain-v3?type=${kind}&symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}`);
    const rec = j.records || {};
    const num = v => (v==null || isNaN(+v)) ? null : +v;
    const leg = x => x ? { oi:num(x.openInterest), chg:num(x.changeinOpenInterest),
      iv:num(x.impliedVolatility), ltp:num(x.lastPrice), vol:num(x.totalTradedVolume) } : null;
    const strikes = (rec.data || [])
      .map(d => ({ k: num(d.strikePrice ?? (d.CE && d.CE.strikePrice) ?? (d.PE && d.PE.strikePrice)),
                   ce: leg(d.CE), pe: leg(d.PE) }))
      .filter(d => d.k!=null)
      .sort((a,b)=>a.k-b.k);
    if(!strikes.length) throw new Error("empty chain for this expiry");
    const out = { symbol, spot:num(rec.underlyingValue), expiry, expiries,
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
