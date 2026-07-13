/* ReviewRank weekly precompute — run: node refresh.js
 * Refreshes the "restaurants" ranking for every state's main city in India & Malaysia,
 * plus the most-searched user queries. Designed to stay inside free API tiers:
 * ~23 city refreshes + up to 10 popular queries ≈ 33 SerpAPI calls per run.
 * Schedule it weekly (Windows Task Scheduler / cron) and visitors get instant,
 * always-fresh rankings without burning quota per pageview. */
require("dotenv").config();
const { GEO, performSearch, topQueries } = require("./search-core");

(async () => {
  if (!process.env.SERPAPI_KEY && !process.env.YELP_API_KEY) {
    console.log("No API keys in .env — nothing to precompute (site runs in demo mode).");
    return;
  }

  let calls = 0, failed = 0;
  const jobs = [];

  // 1. main city of every state, both countries
  for (const [country, geo] of Object.entries(GEO)) {
    for (const [state, cities] of Object.entries(geo.states)) {
      jobs.push({ q: "restaurants", country, state, city: cities[0] });
    }
  }

  // 2. top user-searched queries (from data/query-log.json)
  for (const t of topQueries(10)) {
    if (!jobs.some(j => j.q === t.q && j.city === t.city)) {
      jobs.push({ q: t.q, country: t.country, city: t.city });
    }
  }

  console.log(`Refreshing ${jobs.length} rankings…\n`);
  for (const job of jobs) {
    try {
      const out = await performSearch({ ...job, force: true, log: false });
      calls++;
      console.log(`  ✔ ${job.city} (${job.country}) "${job.q}" — ${out.results.length} places${out.demo ? " [demo]" : ""}`);
      await new Promise(r => setTimeout(r, 1200)); // be gentle with rate limits
    } catch (e) {
      failed++;
      console.log(`  ✖ ${job.city} "${job.q}" — ${e.message}`);
    }
  }
  console.log(`\nDone. ${calls} refreshed, ${failed} failed. Visitors now get instant cached rankings.`);
})();
