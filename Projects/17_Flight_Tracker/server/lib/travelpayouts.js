// Wrapper around the Travelpayouts Data API (free, no card required --
// sign up as an affiliate at https://www.travelpayouts.com and grab a
// token from the "API" section of your dashboard).
//
// This is a *cached* data feed built from real Aviasales/Jetradar user
// searches (typically within the last 48h for exact-date queries), not a
// live GDS search -- so it's genuinely real market pricing, just not
// second-by-second live. Falls back to null whenever no token is
// configured or a request fails, so callers can drop back to demo data.
//
// All prices returned here are in USD (Travelpayouts' most reliably
// supported currency for this endpoint) -- everything downstream works in
// USD internally, and only converts to the visitor's chosen display
// currency at render time (see lib/currency.js).

const BASE_URL = 'https://api.travelpayouts.com';

function hasCredentials() {
  return Boolean(process.env.TRAVELPAYOUTS_TOKEN);
}

async function tpGet(path, params) {
  if (!hasCredentials()) return null;
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  try {
    console.log('Travelpayouts request:', url.toString());
    const res = await fetch(url, {
      headers: { 'x-access-token': process.env.TRAVELPAYOUTS_TOKEN },
    });
    if (!res.ok) {
      console.error('Travelpayouts API error', res.status, await res.text().catch(() => ''));
      return null;
    }
    const json = await res.json();
    if (!json.success) {
      console.error('Travelpayouts responded but success=false:', JSON.stringify(json).slice(0, 300));
      return null;
    }
    return json;
  } catch (err) {
    console.error('Travelpayouts request failed:', err.message);
    return null;
  }
}

// Cheapest ticket(s) for a specific date -- returns up to a few entries
// (best non-stop, best 1-stop, best 2-stop) per Travelpayouts' docs, each
// with a real airline + price anchor. Exact-day cache coverage is sparse
// (it depends on someone having actually searched that specific date
// recently), so if the day-level query comes back empty we fall back to a
// month-level query on the same route/month -- still a real cached price,
// just anchored to "cheapest this month" rather than "cheapest this exact
// day." The result is tagged `monthApprox` so callers can label it
// honestly in the UI.
async function getCheapest({ origin, destination, date }) {
  const exact = await tpGet('/v1/prices/cheap', {
    origin,
    destination,
    depart_date: date,
    currency: 'USD',
  });
  if (exact && exact.data && exact.data[destination] && Object.keys(exact.data[destination]).length) {
    const entries = Object.values(exact.data[destination]);
    return entries.map((e) => ({
      priceUSD: e.price,
      airline: e.airline,
      flightNumber: e.flight_number,
      departureAt: e.departure_at,
      monthApprox: false,
    }));
  }

  console.log(`Travelpayouts: no exact-day cache for ${origin}->${destination} on ${date}, trying month-level fallback.`);
  const monthKey = date.slice(0, 7); // "YYYY-MM"
  const monthly = await tpGet('/v1/prices/cheap', {
    origin,
    destination,
    depart_date: monthKey,
    currency: 'USD',
  });
  if (!monthly || !monthly.data || !monthly.data[destination] || !Object.keys(monthly.data[destination]).length) {
    console.log(`Travelpayouts: no month-level cache either for ${origin}->${destination} ${monthKey}.`);
    return null;
  }
  const entries = Object.values(monthly.data[destination]);
  return entries.map((e) => ({
    priceUSD: e.price,
    airline: e.airline,
    flightNumber: e.flight_number,
    departureAt: e.departure_at,
    monthApprox: true,
  }));
}

// Cheapest fare per available month for a route -- one call covers
// however many months Travelpayouts has cached data for (usually the next
// several), perfect for the Price Calendar tool.
async function getMonthly({ origin, destination }) {
  const json = await tpGet('/v1/prices/monthly', {
    origin,
    destination,
    currency: 'USD',
  });
  if (!json || !json.data) return null;
  return Object.entries(json.data).map(([monthKey, e]) => ({
    monthKey, // "YYYY-MM"
    priceUSD: e.price,
    airline: e.airline,
    departureAt: e.departure_at,
  }));
}

module.exports = { hasCredentials, getCheapest, getMonthly };
