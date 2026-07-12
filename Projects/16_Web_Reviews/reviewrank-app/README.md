# ReviewRank v2.0 — best restaurants, ranked by real diners

**Trial edition: India 🇮🇳 & Malaysia 🇲🇾, restaurants only.** Pick a state and city, optionally a cuisine (biryani, nasi lemak, seafood…), and get restaurants ranked by a confidence-weighted review score. Other categories (gadgets, hotels…) will be added one by one later.

## Run it

Requires [Node.js 18+](https://nodejs.org).

```
cd reviewrank-app
npm install
npm start
```

Open http://localhost:3000 — starts in **demo mode** (sample data) with the full experience.

## Enable LIVE reviews

Copy `.env.example` to `.env`, add a key, restart.

- **SerpAPI** (start here): free ~100 searches/month at https://serpapi.com → `SERPAPI_KEY=`. Powers Google Maps ratings + review counts for any Indian/Malaysian city.
- **Yelp Fusion** (optional): free key at https://docs.developer.yelp.com → `YELP_API_KEY=`. Extra coverage (note: Yelp's India/Malaysia coverage is thin; SerpAPI is the primary source here).

## Built for the free tier

v2.0 implements the full free-tier strategy, so ~100 API calls/month can serve thousands of visitors:

1. **File cache with TTL** (`cache/` folder, default 24h — change via `CACHE_TTL_HOURS`). Repeat searches cost zero API calls; the UI shows "⚡ Instant · updated Xh ago".
2. **Stale-serve** — if quota runs out or the API fails, the last good ranking is shown, clearly marked with its age. Never a broken page.
3. **Weekly precompute** — `npm run refresh` refreshes every state's main city in both countries plus the 10 most-searched user queries (~33 API calls per run). Schedule it weekly with Windows Task Scheduler and visitors always get instant, fresh rankings.
4. **Query log** (`data/query-log.json`) — records what people search so the refresh spends quota only on queries that matter.
5. **Zero-cost value layer** — confidence-weighted ranking (IMDb principle) and 💎 Hidden Gem detection (high rating, fewer reviews than the local median) are computed locally.

## Scheduling the weekly refresh (Windows)

Task Scheduler → Create Basic Task → Weekly → Action: Start a program →
Program: `node` · Arguments: `refresh.js` · Start in: this folder's full path.

## Ranking formula

```
score = (v/(v+m)) * R + (m/(v+m)) * C
```
R = restaurant's rating · v = review count · m = 100 · C = mean rating of results. Many reviews → own rating counts; few reviews → pulled toward average. Ties break by review count.

## Version history

- **v2.2.0** — 14 food categories per country; single-page flow (description section hides when results show); modernized results view: banner cards with gradient/photo headers, medal badges, floating score rings, stacked feedback chips.
- **v2.1.0** — "What ReviewRank really offers" section on the home page; full-page background imagery; top 3 diner feedbacks (👍👍👎) on every restaurant card (live mode shows featured Google quotes when the API provides them).
- **v2.0.0** — restaurants-only focus; India & Malaysia trial; state/city picker; file cache + TTL; stale-serve; query log; `refresh.js` precompute; hidden gems; freshness chip.
- **v1.0.0** — multi-category prototype (restaurants + products), 15 countries, live Yelp/SerpAPI with demo fallback.
