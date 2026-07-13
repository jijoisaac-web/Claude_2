/* ReviewRank v2 core — restaurants only, India & Malaysia trial.
 * Shared by server.js (live site) and refresh.js (weekly precompute).
 *
 * Free-tier strategy implemented here:
 *  1. File cache with TTL (default 24h) — one API call serves every visitor.
 *  2. Stale-serve — if quota/API fails, the last good data is shown with its age.
 *  3. Query log — refresh.js re-fetches only what people actually search.
 *  4. Value-add layer (weighted score, hidden gems) — costs zero API calls. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ---------------- geography: states → cities ---------------- */
const GEO = {
  in: {
    name: "India", flag: "🇮🇳", hl: "en",
    states: {
      "Delhi (NCT)": ["New Delhi"],
      "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
      "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru"],
      "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
      "Telangana": ["Hyderabad", "Warangal"],
      "West Bengal": ["Kolkata", "Siliguri"],
      "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
      "Rajasthan": ["Jaipur", "Udaipur", "Jodhpur"],
      "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode"],
      "Uttar Pradesh": ["Lucknow", "Noida", "Varanasi", "Agra"],
      "Punjab": ["Amritsar", "Ludhiana"],
      "Goa": ["Panaji", "Margao"]
    },
    cuisines: ["Biryani", "South Indian", "North Indian", "Chinese", "Street Food", "Vegetarian", "Seafood", "Cafés", "Desserts & Sweets", "Bakery", "Fast Food", "Buffet", "Rooftop", "Fine Dining"]
  },
  my: {
    name: "Malaysia", flag: "🇲🇾", hl: "en",
    states: {
      "Kuala Lumpur (WP)": ["Kuala Lumpur"],
      "Selangor": ["Petaling Jaya", "Shah Alam", "Subang Jaya"],
      "Penang": ["George Town", "Butterworth"],
      "Johor": ["Johor Bahru", "Batu Pahat"],
      "Perak": ["Ipoh", "Taiping"],
      "Sabah": ["Kota Kinabalu", "Sandakan"],
      "Sarawak": ["Kuching", "Miri"],
      "Melaka": ["Malacca City"],
      "Kedah": ["Alor Setar", "Langkawi"],
      "Negeri Sembilan": ["Seremban"],
      "Pahang": ["Kuantan", "Cameron Highlands"]
    },
    cuisines: ["Nasi Lemak", "Mamak", "Malay", "Chinese", "Indian", "Seafood", "Street Food", "Steamboat", "Cafés", "Desserts", "Bakery", "Western", "Buffet", "Fine Dining"]
  }
};

/* ---------------- city-match guard ----------------
 * SerpAPI/Yelp text search has no hard location boundary, so it can drift and
 * return places from a neighbouring town or even a different state — which
 * looks broken once the user opens "Open in Google Maps" and lands somewhere
 * else. We only keep results whose returned address actually names the city
 * that was searched (covering common renamed-city aliases). */
const CITY_ALIASES = {
  "New Delhi": ["new delhi", "delhi"],
  "Bengaluru": ["bengaluru", "bangalore"],
  "Mumbai": ["mumbai", "bombay"],
  "Kolkata": ["kolkata", "calcutta"],
  "Chennai": ["chennai", "madras"],
  "Kochi": ["kochi", "cochin"],
  "Thiruvananthapuram": ["thiruvananthapuram", "trivandrum"],
  "Vadodara": ["vadodara", "baroda"],
  "Mysuru": ["mysuru", "mysore"],
  "Mangaluru": ["mangaluru", "mangalore"],
  "Malacca City": ["malacca", "melaka"]
};

function normalizeText(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function cityMatches(addressLike, city) {
  const addr = normalizeText(addressLike);
  if (!addr) return false;
  const candidates = [city, ...(CITY_ALIASES[city] || [])].map(normalizeText);
  return candidates.some(c => c && addr.includes(c));
}

/* ---------------- cache + query log ---------------- */
const CACHE_DIR = path.join(__dirname, "cache");
const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const TTL_MS = (parseFloat(process.env.CACHE_TTL_HOURS) || 24) * 3600 * 1000;

const cacheKey = o => crypto.createHash("md5").update(JSON.stringify(o)).digest("hex");

function cacheGet(key) {
  try { return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, key + ".json"), "utf8")); }
  catch (e) { return null; }
}
function cachePut(key, data) {
  try { fs.writeFileSync(path.join(CACHE_DIR, key + ".json"), JSON.stringify({ ts: Date.now(), data })); }
  catch (e) { /* cache is best-effort */ }
}

const QLOG = path.join(DATA_DIR, "query-log.json");
function logQuery(entry) {
  try {
    const log = fs.existsSync(QLOG) ? JSON.parse(fs.readFileSync(QLOG, "utf8")) : {};
    const k = `${entry.country}|${entry.city}|${entry.q}`.toLowerCase();
    log[k] = (log[k] || 0) + 1;
    fs.writeFileSync(QLOG, JSON.stringify(log, null, 1));
  } catch (e) { /* best-effort */ }
}
function topQueries(n = 20) {
  try {
    const log = JSON.parse(fs.readFileSync(QLOG, "utf8"));
    return Object.entries(log).sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([k, count]) => { const [country, city, q] = k.split("|"); return { country, city, q, count }; });
  } catch (e) { return []; }
}

/* ---------------- providers ---------------- */
async function searchGoogleMaps(q, geo, city) {
  if (!process.env.SERPAPI_KEY) return [];
  const query = `${q} restaurants in ${city}, ${geo.name}`;
  const url = `https://serpapi.com/search.json?engine=google_maps&type=search&q=${encodeURIComponent(query)}&hl=${geo.hl}&api_key=${process.env.SERPAPI_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("SerpAPI Maps failed: " + r.status);
  const j = await r.json();
  return (j.local_results || [])
    .filter(p => cityMatches(p.address, city))
    .map(p => ({
      source: "Google Maps",
      name: p.title,
      rating: p.rating,
      reviews: p.reviews,
      detail: [p.address, p.type].filter(Boolean).join(" · "),
      priceLevel: p.price || "",
      url: p.place_id ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}` : (p.website || "#"),
      image: p.thumbnail || null,
      /* SerpAPI sometimes includes a featured diner quote per place */
      snippets: p.user_review ? [{ text: p.user_review, pos: true }] : undefined
    }))
    .filter(x => x.rating && x.reviews);
}

async function searchYelp(q, geo, city) {
  if (!process.env.YELP_API_KEY) return [];
  const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(q + " restaurants")}&location=${encodeURIComponent(city + ", " + geo.name)}&limit=20&sort_by=review_count`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` } });
  if (!r.ok) throw new Error("Yelp failed: " + r.status);
  const j = await r.json();
  return (j.businesses || [])
    .filter(b => cityMatches([b.location?.city, ...(b.location?.display_address || [])].filter(Boolean).join(", "), city))
    .map(b => ({
      source: "Yelp",
      name: b.name,
      rating: b.rating,
      reviews: b.review_count,
      detail: [b.location?.city, (b.categories || []).map(x => x.title).slice(0, 2).join(", ")].filter(Boolean).join(" · "),
      priceLevel: b.price || "",
      url: b.url,
      image: b.image_url || null
    }))
    .filter(x => x.rating && x.reviews);
}

/* ---------------- demo data ---------------- */
const DEMO_NAMES = {
  in: ["Spice Route", "Tandoor Tales", "The Curry Leaf", "Dosa Palace", "Biryani House", "Chai & Chaat", "Royal Thali", "Coastal Catch", "Punjab Grill House", "Lotus Garden"],
  my: ["Nasi Lemak Corner", "Satay Station", "Laksa House", "Mamak Delight", "Penang Pearl", "Teh Tarik Café", "Kampung Kitchen", "Hawker's Best", "Straits Spice", "Jalan Makan"]
};
const SNIPS = {
  good: ["Authentic flavours, generous portions", "Friendly staff, quick service", "Best in the neighbourhood", "Fresh ingredients every visit", "Great value for money", "A must-try local favourite", "Perfect for family dinners", "The signature dish never disappoints", "Clean, cosy and welcoming"],
  bad: ["Gets crowded at dinner time", "Parking is difficult", "Slightly pricey for the area", "Weekend queues are long", "Limited seating", "Service slows at peak hours"]
};
const hashCode = s => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); };

function demoResults(q, country, city, state) {
  const geo = GEO[country];
  const h = hashCode((q + city).toLowerCase());
  return DEMO_NAMES[country].map((base, i) => {
    const seed = (h >> (i % 20)) + i * 7919;
    const rating = Math.min(Math.round((3.5 + (seed % 15) / 10) * 10) / 10, 4.9);
    const reviews = 40 + (seed % 5200);
    return {
      source: ["Google Maps", "Zomato-style", "TripAdvisor-style"][i % 3],
      name: base,
      rating, reviews,
      detail: `${city} · ${q === "restaurants" ? "Restaurant" : q}`,
      priceLevel: "$".repeat(1 + (seed % 3)),
      /* These are fictional sample names with fabricated ratings, not real venues.
       * Never deep-link to the specific name — Google Maps would resolve it to
       * a real business with its own real (and likely very different) rating,
       * which reads as the app lying about that place. Point "Open" at a generic
       * area/cuisine search instead, so nothing fake gets attached to a real listing. */
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q === "restaurants" ? "restaurants" : q + " restaurants"} in ${city}, ${state}, ${geo.name}`)}`,
      image: null,
      demoSample: true,
      /* top 3 diner feedbacks: 2 positive + 1 critical */
      snippets: [
        { text: SNIPS.good[seed % SNIPS.good.length], pos: true },
        { text: SNIPS.good[(seed + 3) % SNIPS.good.length], pos: true },
        { text: SNIPS.bad[seed % SNIPS.bad.length], pos: false }
      ]
    };
  });
}

/* ---------------- ranking + value-add layer (zero API cost) ---------------- */
function rank(results) {
  const m = 100;
  const C = results.reduce((s, r) => s + r.rating, 0) / results.length;
  results.forEach(r => {
    r.score = Math.round(((r.reviews / (r.reviews + m)) * r.rating + (m / (r.reviews + m)) * C) * 100) / 100;
  });
  results.sort((a, b) => b.score - a.score || b.reviews - a.reviews);
  results.forEach((r, i) => { r.rank = i + 1; });
  // hidden gems: strong rating but modest fame (fewer reviews than the median)
  const sortedRev = [...results].map(r => r.reviews).sort((a, b) => a - b);
  const median = sortedRev[Math.floor(sortedRev.length / 2)] || 0;
  results.forEach(r => { r.gem = r.rating >= 4.4 && r.reviews < median && r.reviews >= 25; });
  return results;
}

/* ---------------- main entry ---------------- */
async function performSearch({ q = "restaurants", country = "in", state, city, force = false, log = true }) {
  const geo = GEO[country] ? GEO[country] : GEO.in;
  country = GEO[country] ? country : "in";
  const states = Object.keys(geo.states);
  state = geo.states[state] ? state : states[0];
  const cities = geo.states[state];
  city = cities.includes(city) ? city : cities[0];
  q = (q || "restaurants").trim().toLowerCase() || "restaurants";

  if (log) logQuery({ country, city, q });

  const key = cacheKey({ v: 2, q, country, city });
  const cached = cacheGet(key);
  const fresh = cached && (Date.now() - cached.ts) < TTL_MS;
  if (fresh && !force) {
    return { ...cached.data, cached: true, stale: false, updatedAt: cached.ts };
  }

  const hasKeys = !!(process.env.SERPAPI_KEY || process.env.YELP_API_KEY);
  let results = [], errors = [];

  if (hasKeys) {
    const settled = await Promise.allSettled([searchGoogleMaps(q, geo, city), searchYelp(q, geo, city)]);
    settled.forEach(s => s.status === "fulfilled" ? results.push(...s.value) : errors.push(String(s.reason?.message || s.reason)));
    const seen = new Map();
    for (const r of results) {
      const k = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(k) || seen.get(k).reviews < r.reviews) seen.set(k, r);
    }
    results = [...seen.values()];
  }

  if (results.length > 0) {
    rank(results);
    const data = { query: q, country, state, city, demo: false, errors, results: results.slice(0, 20) };
    cachePut(key, data);
    return { ...data, cached: false, stale: false, updatedAt: Date.now() };
  }

  // live fetch failed or no keys: serve stale cache if we have it, else demo
  if (cached) {
    return { ...cached.data, cached: true, stale: true, errors, updatedAt: cached.ts };
  }
  const demo = rank(demoResults(q, country, city, state));
  return { query: q, country, state, city, demo: true, errors, results: demo, cached: false, stale: false, updatedAt: Date.now() };
}

module.exports = { GEO, performSearch, topQueries, TTL_MS };
