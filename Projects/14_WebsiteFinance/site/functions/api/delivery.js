// GET /api/delivery — NSE security-wise delivery data (latest available trading day)
// Source: nsearchives sec_bhavdata_full_DDMMYYYY.csv. Returns compact rows for EQ series:
// { date, rows: [{ s: symbol, c: close, p: prev_close, d: deliv_per, t: turnover_lacs }] }
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function fmtDate(d){
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  return `${dd}${mm}${d.getFullYear()}`;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if(hit) return hit;
  try{
    let csv = null, used = null;
    for(let back=0; back<=7 && !csv; back++){
      const d = new Date(Date.now() - back*86400000);
      const dow = d.getUTCDay();
      if(dow===0 || dow===6) continue;      // skip weekends
      const ds = fmtDate(d);
      try{
        const r = await fetch(`https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${ds}.csv`,
          { headers: { "user-agent": UA, accept: "text/csv,*/*" } });
        if(r.ok){
          const text = await r.text();
          if(text && text.length > 10000 && /SYMBOL/i.test(text.slice(0,500))){ csv = text; used = ds; }
        }
      }catch(e){}
    }
    if(!csv) throw new Error("no bhavdata file found for the last 7 days");
    const lines = csv.split(/\r?\n/);
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
    const out = { date: used.replace(/(\d{2})(\d{2})(\d{4})/, "$1-$2-$3"), rows };
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
