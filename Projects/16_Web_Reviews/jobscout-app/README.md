# JobScout — real job opportunities, ranked fairly

**Trial edition: Germany, Austria & Switzerland + remote-Europe roles**, sourced live from [Arbeitnow](https://www.arbeitnow.com/blog/job-board-api)'s public job board API — a free feed pulled directly from employer ATS systems, no signup required at all. Optionally widen coverage to more countries by adding a free [Adzuna](https://developer.adzuna.com/signup) key (email signup only, no phone or card).

Unlike LinkedIn or Indeed, no listing can pay for placement. Every posting is ranked by the same transparent formula:

```
opportunityScore = 0.55 * freshness + 0.45 * relevance

freshness  = 100 at day 0, decaying linearly to 0 by day 21
relevance  = 100 if your search matches the title, 70 if it matches a tag,
             40 if it matches the description, 0 otherwise (100/neutral if
             you didn't search a keyword at all)
```

We deliberately do **not** claim a "low competition" or "hidden gem" score — no free data source gives us real applicant counts, so inventing one would be exactly the kind of fabricated-number problem this project has run into before (and fixed) with restaurant ratings. The only claim we make about competition is the "New" badge, which is simply: posted within the last 48 hours — something we can verify directly from the source data.

## Run it

Requires [Node.js 18+](https://nodejs.org).

```
cd jobscout-app
npm install
npm start
```

Open http://localhost:3001 — runs fully live out of the box, zero configuration, zero API keys. Arbeitnow needs no signup at all.

## Widen coverage (optional)

Copy `.env.example` to `.env`, add Adzuna credentials, restart.

- **Adzuna** — free, email signup only (no phone or credit card) at https://developer.adzuna.com/signup → `ADZUNA_APP_ID=` / `ADZUNA_APP_KEY=`. Adds many more countries beyond Arbeitnow's DACH/remote-Europe focus, and includes salary data when the source listing provides it.

## How it's cached

Arbeitnow's API has no server-side search — it's a full feed — so JobScout fetches a pool of recent postings once per `CACHE_TTL_HOURS` (default 6h) and filters/scores that pool per search in memory. Fast repeat searches, no unnecessary refetching.

## Why this isn't "just a smaller Indeed"

Big boards are ad-revenue businesses first: Indeed is paid per click on sponsored listings, LinkedIn's feed is tuned for engagement and premium upsells. Neither has a structural incentive to show you the *best* fit — they show you what's paid for placement. JobScout has no sponsored listings, no premium tier that changes ranking, and pulls from ATS systems and smaller job sources that LinkedIn/Indeed under-represent because they don't get paid to host them.

## Version history

- **v1.0.0** — first build: Arbeitnow live integration (zero-key), optional Adzuna widening, transparent freshness+relevance scoring, Remote-only filter, dark professional theme.
