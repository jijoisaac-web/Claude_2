// Thin wrapper around the Amadeus Self-Service REST API.
// Falls back to null (caller supplies demo data) whenever credentials
// are missing, the token call fails, or Amadeus returns an error --
// so the site always works, live data just turns on automatically
// the moment AMADEUS_API_KEY / AMADEUS_API_SECRET are set in .env.

const BASE_URL = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';

let cachedToken = null;
let tokenExpiresAt = 0;

function hasCredentials() {
  return Boolean(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
}

async function getToken() {
  if (!hasCredentials()) return null;
  if (cachedToken && Date.now() < tokenExpiresAt - 5000) return cachedToken;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AMADEUS_API_KEY,
    client_secret: process.env.AMADEUS_API_SECRET,
  });

  try {
    const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return null;
    const json = await res.json();
    cachedToken = json.access_token;
    tokenExpiresAt = Date.now() + (json.expires_in || 1800) * 1000;
    return cachedToken;
  } catch (err) {
    console.error('Amadeus token error:', err.message);
    return null;
  }
}

async function amadeusGet(path, params) {
  const token = await getToken();
  if (!token) return null;
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Amadeus API error', res.status, text.slice(0, 300));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('Amadeus request failed:', err.message);
    return null;
  }
}

// Flight Offers Search: cheapest offers for one origin/destination/date.
async function searchFlightOffers({ origin, destination, date, adults = 1, currency = 'INR', max = 10 }) {
  const json = await amadeusGet('/v2/shopping/flight-offers', {
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate: date,
    adults,
    currencyCode: currency,
    max,
  });
  return json && json.data ? json.data : null;
}

// On-Demand Flight Status (for the compensation tool, to look up an actual
// flight's scheduled vs actual times where Amadeus has the data).
async function getFlightStatus({ carrierCode, flightNumber, date }) {
  const json = await amadeusGet('/v2/schedule/flights', {
    carrierCode,
    flightNumber,
    scheduledDepartureDate: date,
  });
  return json && json.data ? json.data : null;
}

module.exports = { hasCredentials, searchFlightOffers, getFlightStatus, getToken };
