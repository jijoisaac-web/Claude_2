// GET /api/shareholding/:symbol — NSE quarterly shareholding pattern (Promoter / Public / Employee Trusts %)
// Source: nseindia.com/api/corporate-share-holdings-master (the JSON backing the "Corporate Filings —
// Shareholding Pattern" page). This is the Table I summary only — it does NOT break Public% down into
// FII/DII/MF/Insurance sub-categories; that detail only exists in the per-filing XBRL attachment NSE
// links per quarter (`xbrl` field below), which isn't parsed here. Promoter% trend is still a real
// institutional-edge signal on its own (rising promoter stake = insider conviction; falling = distribution),
// just a coarser one than a full FII/DII breakdown would be.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
};
const API = "https://www.nseindia.com/api/corporate-share-holdings-master";

async function fetchNSE(symbol){
  let r = await fetch(`${API}?index=equities&symbol=${encodeURIComponent(symbol)}`, { headers: HDRS });
  let j = null;
  if(r.ok){
    try{ const t = await r.json(); if(Array.isArray(t) && t.length) j = t; }catch(e){}
  }
  if(j) return j;
  // NSE blocks cookie-less datacenter clients on most corporate-filings endpoints — bootstrap a
  // session cookie from the homepage (same trick used by fiidii.js / largedeals.js) and retry once.
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  r = await fetch(`${API}?index=equities&symbol=${encodeURIComponent(symbol)}`, { headers: { ...HDRS, cookie: cookies.join("; ") } });
  if(!r.ok) throw new Error(`NSE ${r.status}`);
  const j2 = await r.json();
  if(!Array.isArray(j2) || !j2.length) throw new Error("empty response — symbol may not be listed, or has no filings yet");
  return j2;
}

const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function parseDate(s){
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s || "");
  return m ? new Date(+m[3], MONTHS[m[2]] ?? 0, +m[1]).getTime() : 0;
}

export async function onRequestGet({ params }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase().replace(/\.(NS|BO)$/, "");
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/api/shareholding/${symbol}`);
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const raw = await fetchNSE(symbol);
    const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
    // one row per quarter's broadcast; de-dupe to the latest broadcast per as-on date, newest first
    const byDate = new Map();
    for(const row of raw){
      const ts = parseDate(row.date);
      const prev = byDate.get(row.date);
      if(!prev || parseDate(prev.submissionDate) < parseDate(row.submissionDate)) byDate.set(row.date, row);
    }
    const quarters = [...byDate.values()]
      .map(row => ({
        date: row.date,
        promoterPct: num(row.pr_and_prgrp),
        publicPct: num(row.public_val),
        employeeTrustPct: num(row.employeeTrusts),
        xbrlUrl: row.xbrl || null,
      }))
      .filter(q => q.promoterPct != null)
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 8);
    // quarter-over-quarter promoter delta, oldest-to-newest comparison direction (positive = accumulating)
    for(let i = 0; i < quarters.length; i++){
      const older = quarters[i + 1];
      quarters[i].promoterDeltaPp = older && older.promoterPct != null
        ? +(quarters[i].promoterPct - older.promoterPct).toFixed(2) : null;
    }
    const out = { symbol, quarters };
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
