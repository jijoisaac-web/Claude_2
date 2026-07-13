/* JobScout server — real job listings, ranked by freshness + fit, no ads. */
require("dotenv").config();
const express = require("express");
const path = require("path");
const { performSearch, TTL_MS } = require("./job-core");
const { version } = require("./package.json");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3001;

app.get("/api/meta", (_req, res) => res.json({
  version,
  adzunaEnabled: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)
}));

app.get("/api/search", async (req, res) => {
  try {
    const out = await performSearch({
      q: req.query.q,
      location: req.query.location,
      remoteOnly: req.query.remote === "1",
      country: req.query.country
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, () => {
  const adzuna = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  console.log(`\n✅ JobScout v${version} running at http://localhost:${PORT}`);
  console.log(`🗃️  Job pool cache TTL: ${TTL_MS / 3600000}h (change with CACHE_TTL_HOURS in .env)`);
  console.log("🌍 Live on Arbeitnow (zero-key, DACH + remote-Europe) out of the box.");
  console.log(adzuna
    ? "🔑 Adzuna keys detected — coverage widened to more countries."
    : "➕ Add ADZUNA_APP_ID / ADZUNA_APP_KEY in .env for broader country coverage (optional, free, email-only signup).\n");
});
