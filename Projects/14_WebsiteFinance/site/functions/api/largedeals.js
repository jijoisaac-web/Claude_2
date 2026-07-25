// GET /api/largedeals — NSE bulk & block deals, last ~95 calendar days
// Uses NSE's historical endpoints (which accept a date range) rather than the old
// snapshot endpoint (which only ever returned the single latest published day — that's
// why the 3D/7D/14D/30D/60D/90D range buttons on the deals table used to be no-ops: there
// was never more than one day of data to filter into). Falls back to the snapshot endpoint
// (today only) if the historical endpoints are unavailable, so the table never goes blank.
//
// Debug: hit /api/largedeals?debug=1 directly to see exactly what NSE returned for each
// upstream call (status code, row count) without the cache getting in the way — useful for
// diagnosing "still only 1 day of data" without a browser DevTools session.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const BASE_HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "x-requested-with": "XMLHttpRequest",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};
const SNAPSHOT_HDRS = { ...BASE_HDRS, referer: "https://www.nseindia.com/market-data/large-deals" };
// The historical report page is a different route than the live snapshot page — NSE's WAF
// sometimes keys off referer, so use the page that actually calls this endpoint.
const HIST_HDRS = { ...BASE_HDRS, referer: "https://www.nseindia.com/report-detail/display-bulk-and-block-deals" };
const HIST_BULK = "https://www.nseindia.com/api/historical/bulk-deals";
const HIST_BLOCK = "https://www.nseindia.com/api/historical/block-deals";
const SNAPSHOT_API = "https://www.nseindia.com/api/snapshot-capital-market-largedeal";

const MONTHS_UP = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
const MONTHS_TITLE = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};

function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDDMMYYYY(d){ return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`; }
// NSE's historical endpoint returns dates like "01-DEC-2025" (upper-case month) — reformat
// to "01-Dec-2025" so it matches the snapshot endpoint's casing and the client's date parser.
function toTitleDate(bd){
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(bd || "");
  if(!m) return bd || null;
  const mi = MONTHS_UP[m[2].toUpperCase()];
  if(mi == null) return bd;
  return `${m[1].padStart(2,"0")}-${MONTHS_TITLE[mi]}-${m[3]}`;
}
function newestDealTs(j){
  let newest = null;
  for(const arr of [j.BULK_DEALS_DATA, j.BLOCK_DEALS_DATA]){
    for(const d of (arr || [])){
      const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(d.date || "");
      if(!m) continue;
      const t = new Date(+m[3], MONTHS[m[2]] ?? 0, +m[1]).getTime();
      if(newest == null || t > newest) newest = t;
    }
  }
  return newest;
}

let _cookieCache = null;
async function getCookies(){
  if(_cookieCache) return _cookieCache;
  const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const cookies = [];
  home.headers.forEach((v, k) => { if(k.toLowerCase()==="set-cookie") cookies.push(v.split(";")[0]); });
  _cookieCache = cookies.join("; ");
  return _cookieCache;
}

async function fetchJson(url, hdrs, cookie){
  let r;
  try{ r = await fetch(url, { headers: cookie ? { ...hdrs, cookie } : hdrs }); }
  catch(e){ return { ok:false, status:"network-error: "+e.message, data:null, raw:null }; }
  let text;
  try{ text = await r.text(); }
  catch(e){ return { ok:false, status:r.status, data:null, raw:"<body read failed: "+e.message+">" }; }
  if(!r.ok) return { ok:false, status:r.status, data:null, raw:text.slice(0,400) };
  try{
    const j = JSON.parse(text);
    return { ok:true, status:r.status, data:j, raw:null };
  }catch(e){ return { ok:false, status:"parse-error", data:null, raw:text.slice(0,400) }; }
}

// Historical endpoints return either a bare array or {data:[...]} depending on NSE's mood —
// handle both.
function asArray(j){
  if(Array.isArray(j)) return j;
  if(j && Array.isArray(j.data)) return j.data;
  return [];
}

async function fetchHistorical(url, from, to){
  const qs = `?from=${from}&to=${to}`;
  // NSE's historical/report endpoints tend to need session cookies from the get-go (unlike
  // the live snapshot, which is sometimes servable cookie-less) — always warm up the session.
  const cookie = await getCookies();
  let res = await fetchJson(url + qs, HIST_HDRS, cookie);
  let rows = asArray(res.data);
  if((!res.ok || !rows.length)){
    // one retry with a fresh cookie in case the first session was already stale/blocked
    _cookieCache = null;
    const cookie2 = await getCookies();
    res = await fetchJson(url + qs, HIST_HDRS, cookie2);
    rows = asArray(res.data);
  }
  return { rows, status: res.status, ok: res.ok, raw: res.raw };
}

async function fetchSnapshotFallback(){
  let res = await fetchJson(SNAPSHOT_API, SNAPSHOT_HDRS);
  if(res.ok && res.data && (res.data.BULK_DEALS_DATA || res.data.BLOCK_DEALS_DATA) && newestDealTs(res.data) != null) return res.data;
  const cookie = await getCookies();
  const res2 = await fetchJson(SNAPSHOT_API, SNAPSHOT_HDRS, cookie);
  if(res2.ok && res2.data && (res2.data.BULK_DEALS_DATA || res2.data.BLOCK_DEALS_DATA)) return res2.data;
  return res.ok ? res.data : null;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  if(!debug){
    const hit = await cache.match(cacheKey);
    if(hit) return hit;
  }
  try{
    const num = v => { const n = parseFloat(String(v).replace(/,/g,"")); return isNaN(n) ? null : n; };
    const to = new Date();
    const from = new Date(to.getTime() - 97*86400000);   // ~97 calendar days back, covers the 90D button plus weekends/holidays
    const fromStr = fmtDDMMYYYY(from), toStr = fmtDDMMYYYY(to);

    const normHist = (rows, type) => (rows||[]).map(d => {
      const qty = num(d.BD_QTY_TRD), price = num(d.BD_TP_WATP);
      return { type, date: toTitleDate(d.BD_DT_DATE), symbol: d.BD_SYMBOL, name: d.BD_SCRIP_NAME,
        client: d.BD_CLIENT_NAME, side: d.BD_BUY_SELL, qty, price,
        valueCr: qty!=null && price!=null ? qty*price/1e7 : null };
    }).filter(d => d.symbol && d.qty && d.date);

    let deals = [];
    let source = "historical";
    let debugInfo = {};
    const [bulkRes, blockRes] = await Promise.all([
      fetchHistorical(HIST_BULK, fromStr, toStr).catch(e=>({rows:[],ok:false,status:"threw: "+e.message})),
      fetchHistorical(HIST_BLOCK, fromStr, toStr).catch(e=>({rows:[],ok:false,status:"threw: "+e.message})),
    ]);
    debugInfo.bulk = { ok:bulkRes.ok, status:bulkRes.status, rows:bulkRes.rows.length, ...(debug && bulkRes.raw ? {raw:bulkRes.raw} : {}) };
    debugInfo.block = { ok:blockRes.ok, status:blockRes.status, rows:blockRes.rows.length, ...(debug && blockRes.raw ? {raw:blockRes.raw} : {}) };
    deals = [...normHist(blockRes.rows, "BLOCK"), ...normHist(bulkRes.rows, "BULK")];

    // Historical endpoints occasionally come back empty (NSE flakiness/blocking, not just "no
    // deals in range") — fall back to the single-day snapshot so the table isn't blank.
    if(!deals.length){
      source = "snapshot-fallback";
      const snap = await fetchSnapshotFallback();
      debugInfo.snapshotUsed = !!snap;
      if(snap){
        const normSnap = (rows, type) => (rows||[]).map(d => {
          const qty = num(d.qty), price = num(d.watp);
          return { type, date: d.date, symbol: d.symbol, name: d.name,
            client: d.clientName, side: d.buySell, qty, price,
            valueCr: qty!=null && price!=null ? qty*price/1e7 : null };
        }).filter(d => d.symbol && d.qty);
        deals = [...normSnap(snap.BLOCK_DEALS_DATA, "BLOCK"), ...normSnap(snap.BULK_DEALS_DATA, "BULK")];
      }
    }
    if(!deals.length) throw new Error("NSE returned no deal data (historical or snapshot)");

    const out = { deals, source, windowFrom: fromStr, windowTo: toStr, ...(debug ? { debug: debugInfo } : {}) };
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        "cache-control": debug ? "no-store" : "public, s-maxage=1800, max-age=600",
        "access-control-allow-origin": "*",
      },
    });
    if(!debug) await cache.put(cacheKey, res.clone());
    return res;
  }catch(e){
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}
