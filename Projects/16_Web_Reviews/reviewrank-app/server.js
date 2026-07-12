/* ReviewRank server — ranks places & products by real user reviews.
 * Live data via Yelp Fusion (restaurants/places) and SerpAPI (Google Maps + Google Shopping).
 * Runs in DEMO mode when no API keys are set (see README.md).
 *
 * Ranking: Bayesian weighted rating (same idea IMDb uses), so an item with
 * 4.6★ from 2,000 reviews outranks 5.0★ from 3 reviews:
 *   score = (v/(v+m))*R + (m/(v+m))*C
 *   R = item's average rating, v = its review count,
 *   m = confidence threshold (min reviews), C = mean rating across results. */
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3000;

const COUNTRIES = {
  us: { name: "United States", flag: "🇺🇸", gl: "us", hl: "en", city: "New York" },
  uk: { name: "United Kingdom", flag: "🇬🇧", gl: "uk", hl: "en", city: "London" },
  ca: { name: "Canada", flag: "🇨🇦", gl: "ca", hl: "en", city: "Toronto" },
  au: { name: "Australia", flag: "🇦🇺", gl: "au", hl: "en", city: "Sydney" },
  in: { name: "India", flag: "🇮🇳", gl: "in", hl: "en", city: "Mumbai" },
  de: { name: "Germany", flag: "🇩🇪", gl: "de", hl: "de", city: "Berlin" },
  fr: { name: "France", flag: "🇫🇷", gl: "fr", hl: "fr", city: "Paris" },
  it: { name: "Italy", flag: "🇮🇹", gl: "it", hl: "it", city: "Rome" },
  es: { name: "Spain", flag: "🇪🇸", gl: "es", hl: "es", city: "Madrid" },
  jp: { name: "Japan", flag: "🇯🇵", gl: "jp", hl: "ja", city: "Tokyo" },
  kr: { name: "South Korea", flag: "🇰🇷", gl: "kr", hl: "ko", city: "Seoul" },
  cn: { name: "China", flag: "🇨🇳", gl: "cn", hl: "zh-CN", city: "Shanghai" },
  br: { name: "Brazil", flag: "🇧🇷", gl: "br", hl: "pt-BR", city: "São Paulo" },
  mx: { name: "Mexico", flag: "🇲🇽", gl: "mx", hl: "es-419", city: "Mexico City" },
  ae: { name: "UAE", flag: "🇦🇪", gl: "ae", hl: "en", city: "Dubai" }
};

/* ---------------- provider: Yelp Fusion (free key) — local places ---------------- */
async function searchYelp(q, c, city) {
  if (!process.env.YELP_API_KEY) return [];
  const loc = city ? `${city}, ${c.name}` : c.city + ", " + c.name;
  const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}&limit=20&sort_by=review_count`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` } });
  if (!r.ok) throw new Error("Yelp failed: " + r.status);
  const j = await r.json();
  return (j.businesses || []).map(b => ({
    source: "Yelp",
    name: b.name,
    rating: b.rating,
    reviews: b.review_count,
    detail: [b.location?.city, (b.categories || []).map(x => x.title).slice(0, 2).join(", ")].filter(Boolean).join(" · "),
    priceLevel: b.price || "",
    url: b.url,
    image: b.image_url || null
  })).filter(x => x.rating && x.reviews);
}

/* ---------------- provider: SerpAPI Google Maps — local places ---------------- */
async function searchGoogleMaps(q, c, city) {
  if (!process.env.SERPAPI_KEY) return [];
  const query = `${q} in ${city || c.city}, ${c.name}`;
  const url = `https://serpapi.com/search.json?engine=google_maps&type=search&q=${encodeURIComponent(query)}&hl=${c.hl}&api_key=${process.env.SERPAPI_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("SerpAPI Maps failed: " + r.status);
  const j = await r.json();
  return (j.local_results || []).map(p => ({
    source: "Google Maps",
    name: p.title,
    rating: p.rating,
    reviews: p.reviews,
    detail: [p.address, p.type].filter(Boolean).join(" · "),
    priceLevel: p.price || "",
    url: p.place_id ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}` : (p.website || "#"),
    image: p.thumbnail || null
  })).filter(x => x.rating && x.reviews);
}

/* ---------------- provider: SerpAPI Google Shopping — products ---------------- */
async function searchProducts(q, c) {
  if (!process.env.SERPAPI_KEY) return [];
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q)}&gl=${c.gl}&api_key=${process.env.SERPAPI_KEY}&num=20`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("SerpAPI Shopping failed: " + r.status);
  const j = await r.json();
  return (j.shopping_results || []).map(p => ({
    source: p.source || "Google Shopping",
    name: p.title,
    rating: p.rating,
    reviews: p.reviews,
    detail: p.price ? `Price: ${p.price}` : "",
    priceLevel: "",
    url: p.product_link || p.link,
    image: p.thumbnail || null
  })).filter(x => x.rating && x.reviews);
}

/* ---------------- demo data ---------------- */
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); }

const DEMO_SNIPPETS = {
  good: ["Absolutely loved it", "Great value for money", "Staff were amazing", "Exceeded expectations", "Would recommend to anyone", "Consistent quality every time"],
  bad: ["A bit pricey", "Can get crowded on weekends", "Delivery was slow", "Battery life could be better", "Service was slow at peak hours"]
};

function demoResults(q, c, kind, city) {
  const h = hashCode((q + kind + c.name).toLowerCase());
  const place = city || c.city;
  const names = kind === "product"
    ? ["Pro Max Edition", "Ultra 2026", "Classic Series", "Air Lite", "Prime Plus", "Neo X", "Essential", "Studio Edition", "Max Performance", "Smart Choice"]
        .map((suffix, i) => `${q.replace(/\b\w/g, m => m.toUpperCase())} ${suffix}`)
    : ["The Golden Fork", "Casa Bella", "Spice Route", "Urban Bites", "The Local Table", "Riverside Kitchen", "Old Town Corner", "Green Leaf", "Fire & Stone", "Blue Door"]
        .map(n => `${n}${i18nCity(place)}`);
  function i18nCity(p) { return ""; }

  const avg = 4.1;
  return names.map((name, i) => {
    const seed = (h >> (i % 20)) + i * 7919;
    const rating = Math.round((3.4 + (seed % 16) / 10) * 10) / 10;      // 3.4–4.9
    const reviews = 25 + (seed % 4200);
    const good = DEMO_SNIPPETS.good[seed % DEMO_SNIPPETS.good.length];
    const bad = DEMO_SNIPPETS.bad[seed % DEMO_SNIPPETS.bad.length];
    const enc = encodeURIComponent(kind === "product" ? name : `${name} ${place}`);
    return {
      source: kind === "product" ? ["Amazon", "Best Buy", "Flipkart-style store"][i % 3] : ["Google Maps", "Yelp", "TripAdvisor"][i % 3],
      name,
      rating: Math.min(rating, 4.9),
      reviews,
      detail: kind === "product" ? "Demo product listing" : `${place}, ${c.name}`,
      priceLevel: kind === "product" ? "" : "$$".slice(0, 1 + (seed % 3)),
      url: kind === "product" ? `https://www.google.com/search?tbm=shop&q=${enc}` : `https://www.google.com/maps/search/${enc}`,
      image: null,
      snippets: { good, bad }
    };
  });
}

/* ---------------- Bayesian weighted ranking ---------------- */
function rank(results) {
  const m = 100; // confidence threshold: reviews needed to pull toward own rating
  const C = results.reduce((s, r) => s + r.rating, 0) / results.length;
  results.forEach(r => {
    r.score = Math.round(((r.reviews / (r.reviews + m)) * r.rating + (m / (r.reviews + m)) * C) * 100) / 100;
  });
  results.sort((a, b) => b.score - a.score || b.reviews - a.reviews);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

/* ---------------- API routes ---------------- */
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  const kind = req.query.kind === "product" ? "product" : "local";
  const city = (req.query.city || "").trim();
  const country = COUNTRIES[req.query.country] ? req.query.country : "us";
  const c = COUNTRIES[country];
  if (!q) return res.status(400).json({ error: "Missing query ?q=" });

  const hasKeys = !!(process.env.SERPAPI_KEY || process.env.YELP_API_KEY);
  let results = [], errors = [];

  if (hasKeys) {
    const jobs = kind === "product"
      ? [searchProducts(q, c)]
      : [searchGoogleMaps(q, c, city), searchYelp(q, c, city)];
    const settled = await Promise.allSettled(jobs);
    settled.forEach(s => s.status === "fulfilled" ? results.push(...s.value) : errors.push(String(s.reason?.message || s.reason)));
    // de-duplicate by name (keep entry with more reviews)
    const seen = new Map();
    for (const r of results) {
      const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(key) || seen.get(key).reviews < r.reviews) seen.set(key, r);
    }
    results = [...seen.values()];
  }

  const demo = results.length === 0;
  if (demo) results = demoResults(q, c, kind, city);

  rank(results);
  res.json({ query: q, kind, country, city: city || c.city, demo, errors, results: results.slice(0, 20) });
});

app.get("/api/countries", (_req, res) => res.json(COUNTRIES));

app.listen(PORT, () => {
  const hasKeys = !!(process.env.SERPAPI_KEY || process.env.YELP_API_KEY);
  console.log(`\n✅ ReviewRank running at http://localhost:${PORT}`);
  console.log(hasKeys ? "🔑 API keys detected — LIVE reviews enabled." : "🧪 DEMO mode — no API keys found. See README.md to enable live reviews.\n");
});
