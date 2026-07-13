/* ReviewRank v2.0 server — restaurants in India & Malaysia.
 * All heavy lifting lives in search-core.js (cache, providers, ranking). */
require("dotenv").config();
const express = require("express");
const path = require("path");
const { GEO, performSearch, TTL_MS } = require("./search-core");
const { version } = require("./package.json");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3000;

app.get("/api/geo", (_req, res) => res.json({ version, geo: GEO }));

app.get("/api/search", async (req, res) => {
  try {
    const out = await performSearch({
      q: req.query.q,
      country: req.query.country,
      state: req.query.state,
      city: req.query.city
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, () => {
  const hasKeys = !!(process.env.SERPAPI_KEY || process.env.YELP_API_KEY);
  console.log(`\n✅ ReviewRank v${version} running at http://localhost:${PORT}`);
  console.log(`🗃️  Cache TTL: ${TTL_MS / 3600000}h (change with CACHE_TTL_HOURS in .env)`);
  console.log(hasKeys
    ? "🔑 API keys detected — LIVE reviews enabled. Tip: run `node refresh.js` weekly to precompute top cities."
    : "🧪 DEMO mode — no API keys found. See README.md to enable live reviews.\n");
});
