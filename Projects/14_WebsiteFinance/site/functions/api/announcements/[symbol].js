// GET /api/announcements/:symbol — NSE corporate announcements for the last 180 days.
// Source: nseindia.com/api/corporate-announcements. Used by the Fundamentals tab to surface
// concall / investor-meet / earnings-call filings — retail's after-the-fact equivalent of the
// corporate access institutions get live. Returns the raw filing list (subject + optional PDF
// attachment link); subject-matching for "which of these are concalls" happens client-side.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
};
const API = "https://www.nseindia.com/api/corporate-announcements";

function fmtDate(d){
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

async function fetchNSE(symbol, fromDate, toDate){
  const qs = `index=equities&symbol=${encodeURIComponent(symbol)}&from_date=${fromDate}&to_date=${toDate}`;
  let r = await fetch(`${API}?${qs}`, { headers: HDRS });
  let j = null;
  if(r.ok){
    try{ const t = await r.json(); if(Array.isArray(t)) j = t; }catch(e){}
  }
  if(j) return j;
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  r = await fetch(`${API}?${qs}`, { headers: { ...HDRS, cookie: cookies.join("; ") } });
  if(!r.ok) throw new Error(`NSE ${r.status}`);
  const j2 = await r.json();
  if(!Array.isArray(j2)) throw new Error("unexpected response shape");
  return j2;
}

export async function onRequestGet({ params }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase().replace(/\.(NS|BO)$/, "");
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/api/announcements/${symbol}`);
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const to = new Date(), from = new Date(Date.now() - 180 * 86400000);
    const raw = await fetchNSE(symbol, fmtDate(from), fmtDate(to));
    const items = raw
      .map(x => ({
        date: x.an_dt || x.broadcastDate || x.sort_date || null,
        subject: x.desc || x.attchmntText || x.subject || null,
        attachment: x.attchmntFile || null,
      }))
      .filter(x => x.subject)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const out = { symbol, items };
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=21600, max-age=3600",
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
