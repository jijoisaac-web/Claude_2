// GET /api/insider/:symbol — NSE insider trading disclosures (SEBI PIT Regulation 7(2))
// Source: nseindia.com/api/corporates-pit-gg — confirmed live via browser devtools (endpoint name
// doesn't follow the same "-master" convention as shareholding pattern, so it wasn't guessable from
// library source alone). Like shareholding pattern, this list endpoint only carries filing metadata
// (who filed, when, original vs revision) — the actual transaction detail (person, buy/sell, qty,
// value) lives in the linked iXBRL document per filing, not parsed here. Still real signal on its
// own: a burst of insider filings on a stock is itself informative, and the link goes straight to
// the same disclosure institutions/analysts read.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
};
const API = "https://www.nseindia.com/api/corporates-pit-gg";

async function fetchNSE(symbol){
  let r = await fetch(`${API}?index=equities&symbol=${encodeURIComponent(symbol)}`, { headers: HDRS });
  let j = null;
  if(r.ok){
    try{ const t = await r.json(); if(t && Array.isArray(t.data)) j = t.data; }catch(e){}
  }
  if(j) return j;
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  r = await fetch(`${API}?index=equities&symbol=${encodeURIComponent(symbol)}`, { headers: { ...HDRS, cookie: cookies.join("; ") } });
  if(!r.ok) throw new Error(`NSE ${r.status}`);
  const j2 = await r.json();
  if(!j2 || !Array.isArray(j2.data)) throw new Error("unexpected response shape");
  return j2.data;
}

const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function parseTs(s){
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/.exec(s || "");
  return m ? new Date(+m[3], MONTHS[m[2]] ?? 0, +m[1], +m[4], +m[5], +m[6]).getTime() : 0;
}

export async function onRequestGet({ params }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase().replace(/\.(NS|BO)$/, "");
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/api/insider/${symbol}`);
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const raw = await fetchNSE(symbol);
    const filings = raw
      .map(x => ({
        date: x.broadcastDateTime || x.exchdisstime || null,
        regulation: x.regulation || null,
        submissionType: x.typeOfSubmission || null,
        revisionRemark: x.revisionRemark || null,
        disclosureUrl: x.ixbrl || null,
      }))
      .filter(x => x.date)
      .sort((a, b) => parseTs(b.date) - parseTs(a.date))
      .slice(0, 20);
    const out = { symbol, filings };
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
