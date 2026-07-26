// GET /api/dividends/:symbol — historical dividend events + monthly price series, from Yahoo
// Finance's chart API (query1.finance.yahoo.com), NOT NSE. That's a deliberate choice: NSE's
// corporate-actions endpoint (which labels each dividend as Interim/Final/Special and states the
// face-value %) lives behind the same kind of IP-reputation block that already defeated NSE's
// historical bulk/block-deals endpoints from Cloudflare (see largedeals.js). Yahoo's chart proxy is
// already used elsewhere in this app (chart/[symbol].js) and has never hit that block, so dividend
// history rides on that same reliable path instead. The tradeoff: Yahoo doesn't label dividend
// TYPE (interim/final/special) or give face value, so "%" here means dividend YIELD (amount ÷
// price), and any interim/final/special labeling happens client-side as a heuristic, not NSE's
// authoritative classification — the UI says so explicitly.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function onRequestGet({ params }) {
  const symbol = encodeURIComponent(decodeURIComponent(params.symbol));
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/api/dividends/${symbol}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  try {
    // 10y of monthly bars is plenty for a dividend-cadence read and keeps the payload small enough
    // to fetch per-symbol across a large universe scan.
    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=10y&interval=1mo&events=div`;
    const y = await fetch(yUrl, { headers: { "user-agent": UA, accept: "application/json" } });
    if (!y.ok) throw new Error(`yahoo ${y.status}`);
    const j = await y.json();
    const res0 = j.chart && j.chart.result && j.chart.result[0];
    if (!res0) throw new Error((j.chart && j.chart.error && j.chart.error.description) || "no data");

    const divsObj = (res0.events && res0.events.dividends) || {};
    const dividends = Object.values(divsObj)
      .map(d => ({ date: new Date(d.date * 1000).toISOString().slice(0, 10), amount: d.amount }))
      .filter(d => d.amount != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const ts = res0.timestamp || [];
    const closes = (res0.indicators && res0.indicators.quote && res0.indicators.quote[0] && res0.indicators.quote[0].close) || [];
    const prices = ts.map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: closes[i] }))
      .filter(p => p.close != null);
    const currentPrice = prices.length ? prices[prices.length - 1].close : null;

    const out = { symbol: decodeURIComponent(params.symbol), currentPrice, dividends, prices };
    const resp = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        // dividend history barely changes day to day — cache generously
        "cache-control": "public, s-maxage=21600, max-age=3600",
        "access-control-allow-origin": "*",
      },
    });
    await cache.put(cacheKey, resp.clone());
    return resp;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}
