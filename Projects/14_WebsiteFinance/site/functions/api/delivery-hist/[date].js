// GET /api/delivery-hist/:date — NSE security-wise delivery data for a SPECIFIC past trading date
// (date = YYYY-MM-DD), not just "whatever's latest" like /api/delivery. Same nsearchives bhavdata
// source, same CSV shape — this just parameterizes the date instead of always walking back from
// today. Built for the Conviction Scan backtest: that feature needs the delivery-% gate evaluated
// point-in-time at many past dates (not today's snapshot), and NSE's bhavdata archive turns out to
// be addressable by date, going back years — so a true walk-forward simulation of that gate is
// possible without any new historical archive of our own to maintain.
// Historical bhavdata files never change once published, so this is cached far longer (30 days)
// than the "latest" endpoint's 1 hour.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function fmtDDMMYYYY(d){
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  return `${dd}${mm}${d.getFullYear()}`;
}
function parseYMD(s){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if(!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
  return isNaN(d.getTime()) ? null : d;
}

async function fetchBhavdata(targetDate){
  // Walk backward up to 5 calendar days from the requested date to land on the nearest actual
  // trading session — the requested date itself may be a weekend/holiday when the backtest's
  // fixed cadence lands on one.
  for(let back=0; back<=5; back++){
    const d = new Date(targetDate.getTime() - back*86400000);
    const dow = d.getUTCDay();
    if(dow===0 || dow===6) continue;
    const ds = fmtDDMMYYYY(d);
    try{
      const r = await fetch(`https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${ds}.csv`,
        { headers: { "user-agent": UA, accept: "text/csv,*/*" } });
      if(r.ok){
        const text = await r.text();
        if(text && text.length > 10000 && /SYMBOL/i.test(text.slice(0,500))){
          return { csv: text, used: ds, daysBack: back };
        }
      }
    }catch(e){}
  }
  return null;
}

export async function onRequestGet({ params }) {
  const target = parseYMD(decodeURIComponent(params.date));
  if(!target) return new Response(JSON.stringify({ error: "date must be YYYY-MM-DD" }), { status: 400, headers: { "content-type": "application/json" } });
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/api/delivery-hist/${decodeURIComponent(params.date)}`);
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    const found = await fetchBhavdata(target);
    if(!found) throw new Error("no bhavdata file found within 5 days of the requested date (holiday run, or too far outside NSE's retained archive)");
    const lines = found.csv.split(/\r?\n/);
    const header = lines[0].split(",").map(h=>h.trim().toUpperCase());
    const col = n => header.indexOf(n);
    const iSym = col("SYMBOL"), iSer = col("SERIES"), iClose = col("CLOSE_PRICE"),
          iPrev = col("PREV_CLOSE"), iDeliv = col("DELIV_PER"), iTurn = col("TURNOVER_LACS");
    if(iSym<0 || iSer<0 || iDeliv<0) throw new Error("unexpected csv format: " + header.slice(0,6).join("|"));
    const num = v => { const n = parseFloat(String(v).trim()); return isNaN(n) ? null : n; };
    const rows = [];
    for(let i=1;i<lines.length;i++){
      const p = lines[i].split(",");
      if(p.length < header.length) continue;
      if((p[iSer]||"").trim() !== "EQ") continue;
      const d = num(p[iDeliv]);
      if(d==null) continue;
      rows.push({ s: p[iSym].trim(), c: num(p[iClose]), p: num(p[iPrev]), d, t: num(p[iTurn]) });
    }
    if(!rows.length) throw new Error("csv parsed but no EQ rows");
    const usedDate = found.used.replace(/(\d{2})(\d{2})(\d{4})/, "$1-$2-$3");
    const out = { requestedDate: decodeURIComponent(params.date), date: usedDate, daysBack: found.daysBack, rows };
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        // Immutable once published — cache hard.
        "cache-control": "public, s-maxage=2592000, max-age=86400",
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
