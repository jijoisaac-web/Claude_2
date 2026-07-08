// GET /api/chart/:symbol?range=1y&interval=1d — proxy to Yahoo Finance v8 chart API with edge caching
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const RANGES = new Set(["5d", "1mo", "3mo", "6mo", "1y", "2y", "3y", "5y", "10y"]);
const INTERVALS = new Set(["1d", "1wk"]);

export async function onRequestGet({ request, params }) {
  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "1y";
  const interval = url.searchParams.get("interval") || "1d";
  if (!RANGES.has(range) || !INTERVALS.has(interval)) {
    return new Response(JSON.stringify({ error: "invalid range/interval" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const symbol = encodeURIComponent(decodeURIComponent(params.symbol));
  const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  const y = await fetch(yUrl, { headers: { "user-agent": UA, accept: "application/json" } });
  const body = await y.text();
  const res = new Response(body, {
    status: y.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, s-maxage=300, max-age=120",
      "access-control-allow-origin": "*",
    },
  });
  if (y.ok) await cache.put(cacheKey, res.clone());
  return res;
}
