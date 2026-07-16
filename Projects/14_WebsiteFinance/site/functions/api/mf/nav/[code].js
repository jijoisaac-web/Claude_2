// GET /api/mf/nav/:code — latest NAV, category and fund house for one AMFI scheme code
// (via mfapi.in, which serves AMFI's own daily NAV file as JSON). NAVs update once per day,
// after markets close, so this is cached at the edge for several hours.
export async function onRequestGet({ request, params }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const code = encodeURIComponent(params.code);
  try {
    const r = await fetch(`https://api.mfapi.in/mf/${code}`);
    if (!r.ok) throw new Error(`mfapi ${r.status}`);
    const j = await r.json();
    const meta = j.meta || {};
    const latest = Array.isArray(j.data) ? j.data[0] : null;
    if (!latest) throw new Error("no NAV data for this scheme");
    const out = {
      code: meta.scheme_code ?? Number(params.code),
      name: meta.scheme_name || null,
      house: meta.fund_house || null,
      category: meta.scheme_category || null,
      type: meta.scheme_type || null,
      nav: latest.nav != null ? parseFloat(latest.nav) : null,
      date: latest.date || null,
    };
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=21600, max-age=3600",
        "access-control-allow-origin": "*",
      },
    });
    await cache.put(cacheKey, res.clone());
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}
