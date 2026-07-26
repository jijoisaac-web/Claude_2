// GET /api/results/:symbol — NSE's own quarterly/annual financial-results comparison feed.
// Source: nseindia.com/api/results-comparision — this is the same cookie-handshake pattern already
// working in production for announcements.js / insider/[symbol].js / shareholding/[symbol].js, just
// pointed at a different NSE endpoint. This is a candidate REPLACEMENT/SUPPLEMENT for the Yahoo
// fundamentals-timeseries fetch used by the Investor Presentations 8Q/5Y trend — since it would be
// NSE's own regulatory filing feed (the primary source every listed company files results into),
// it may carry deeper history for Indian names than Yahoo does, where Bajaj Finance topped out at
// ~5 quarters / 4 years (confirmed via ?debug=1 on the fundamentals endpoint).
// UNVERIFIED: this sandbox cannot reach nseindia.com (network-restricted), so neither the endpoint
// path nor the exact response field names below are confirmed against a live response yet. Use
// ?debug=1 to get the raw NSE payload back untouched (capped) — that tells us definitively whether
// this endpoint exists at all and what its real shape is, the same way ?debug=1 on the fundamentals
// endpoint just diagnosed the Yahoo side. If the field-mapping below is wrong, ?debug=1's raw output
// is exactly what's needed to fix it in one more pass.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HDRS = {
  "user-agent": UA,
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://www.nseindia.com/get-quotes/equity",
};
// Try a couple of plausible endpoint/param shapes — NSE's API naming isn't consistent across
// data types (compare corporate-announcements vs corporates-pit-gg), so more than one candidate URL
// is attempted before giving up. First one to return a non-empty array/object wins.
const CANDIDATES = (symbol) => [
  `https://www.nseindia.com/api/results-comparision?symbol=${encodeURIComponent(symbol)}`,
  `https://www.nseindia.com/api/results-comparision?index=equities&symbol=${encodeURIComponent(symbol)}`,
];

async function tryFetch(url, cookie) {
  const r = await fetch(url, { headers: cookie ? { ...HDRS, cookie } : HDRS });
  const status = r.status;
  let body = null, parseError = null;
  const text = await r.text();
  try { body = JSON.parse(text); } catch (e) { parseError = `non-JSON (first 200 chars): ${text.slice(0, 200)}`; }
  return { url, status, ok: r.ok, body, parseError, rawLength: text.length };
}

export async function onRequestGet({ request, params }) {
  const url = new URL(request.url);
  const wantDebug = url.searchParams.get("debug") === "1";
  const symbol = decodeURIComponent(params.symbol).toUpperCase().replace(/\.(NS|BO)$/, "");
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/api/results/${symbol}`);
  if (!wantDebug) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const attempts = [];
  try {
    let cookie = null;
    for (const candidateUrl of CANDIDATES(symbol)) {
      let attempt = await tryFetch(candidateUrl);
      attempts.push({ withCookie: false, ...attempt, body: wantDebug ? attempt.body : undefined });
      let dataArr = Array.isArray(attempt.body) ? attempt.body : (attempt.body && Array.isArray(attempt.body.data) ? attempt.body.data : null);
      if (attempt.ok && dataArr && dataArr.length) {
        return respond(symbol, dataArr, wantDebug, attempts, cache, cacheKey);
      }
      // First non-2xx (usually 401/403 without a session cookie) — fetch the NSE homepage once to
      // pick up a session cookie, then retry the same candidate URL with it attached.
      if (!attempt.ok && !cookie) {
        const home = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
        const cookies = [];
        home.headers.forEach((v, k) => { if (k.toLowerCase() === "set-cookie") cookies.push(v.split(";")[0]); });
        cookie = cookies.join("; ");
      }
      if (cookie) {
        attempt = await tryFetch(candidateUrl, cookie);
        attempts.push({ withCookie: true, ...attempt, body: wantDebug ? attempt.body : undefined });
        dataArr = Array.isArray(attempt.body) ? attempt.body : (attempt.body && Array.isArray(attempt.body.data) ? attempt.body.data : null);
        if (attempt.ok && dataArr && dataArr.length) {
          return respond(symbol, dataArr, wantDebug, attempts, cache, cacheKey);
        }
      }
    }
    // Nothing worked — return the diagnostics either way so the caller (or ?debug=1) can see why.
    return new Response(JSON.stringify({
      symbol, error: "no candidate endpoint returned usable data",
      _debug: wantDebug ? { attempts } : { attemptCount: attempts.length, statuses: attempts.map(a => a.status) },
    }), { status: 502, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ symbol, error: String(e.message || e), _debug: wantDebug ? { attempts } : undefined }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}

// Best-effort normalization — field names are unverified (see header comment), so this tries a wide
// set of candidate keys per metric and leaves anything unmatched as null rather than guessing wrong.
function pick(obj, keys) {
  for (const k of keys) { if (obj[k] != null && obj[k] !== "") return obj[k]; }
  return null;
}
function toNum(v) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}
function normalize(raw, wantDebug) {
  return raw.map(x => ({
    periodEnd: pick(x, ["reTo", "re_to", "toDate", "to_date", "reDate", "re_date"]),
    periodFrom: pick(x, ["reFrom", "re_from", "fromDate", "from_date"]),
    broadcastDate: pick(x, ["re_broadcast_date", "reBroadcastDate", "broadcastDate", "an_dt"]),
    consolidated: pick(x, ["consolidated", "reInd", "re_ind"]),
    audited: pick(x, ["audited", "reAuditedInd"]),
    income: toNum(pick(x, ["reIncome", "re_income", "income", "reTotalIncome", "totalIncome"])),
    expenditure: toNum(pick(x, ["reExpenditure", "re_expenditure", "expenditure"])),
    pbt: toNum(pick(x, ["reProfitBeforeTax", "re_pbt", "pbt", "profitBeforeTax"])),
    netProfit: toNum(pick(x, ["reNetProfit", "re_np", "netProfit", "reProfitAfterTax", "profitAfterTax"])),
    eps: toNum(pick(x, ["reEPS", "re_eps", "eps", "reBasicEPS", "basicEPS"])),
    ...(wantDebug ? { _raw: x } : {}),   // raw fields only on ?debug=1, until the mapping above is verified against real data
  }));
}

async function respond(symbol, dataArr, wantDebug, attempts, cache, cacheKey) {
  const normalized = normalize(dataArr, wantDebug);
  const out = { symbol, count: normalized.length, results: normalized };
  if (wantDebug) out._debug = { attempts, sampleRaw: dataArr.slice(0, 3) };
  const res = new Response(JSON.stringify(out), {
    headers: {
      "content-type": "application/json",
      "cache-control": wantDebug ? "no-store" : "public, s-maxage=21600, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
  if (!wantDebug) await cache.put(cacheKey, res.clone());
  return res;
}
