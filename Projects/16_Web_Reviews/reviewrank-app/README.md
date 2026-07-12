# ReviewRank — ranked by real user reviews

Search restaurants, cafés, hotels, or products (smartphones, laptops, headphones…) in any of 15 countries. ReviewRank pulls user ratings and review counts, then ranks results with a **confidence-weighted score** — the same principle IMDb uses — so a 4.6★ place with 2,000 reviews beats a 5.0★ place with 3 reviews.

## Run it

Requires [Node.js 18+](https://nodejs.org).

```
cd reviewrank-app
npm install
npm start
```

Open http://localhost:3000 — starts in **demo mode** (sample data) so you can explore the full experience immediately.

## Enable LIVE reviews (free API keys)

Copy `.env.example` to `.env`, add keys, restart (`npm start`).

### 1. SerpAPI (start here — covers both places and products)
- **Google Maps**: live ratings + review counts for restaurants, cafés, hotels in any city.
- **Google Shopping**: product ratings + review counts for gadgets.
1. Sign up free at https://serpapi.com (~100 searches/month free, no credit card).
2. Put your key in `SERPAPI_KEY=`.

### 2. Yelp Fusion (extra depth for restaurants/businesses)
1. Create a free app at https://docs.developer.yelp.com (Manage App → API Key).
2. Put the key in `YELP_API_KEY=`.

## How the ranking works

```
score = (v/(v+m)) * R + (m/(v+m)) * C
```
R = item's average rating · v = its review count · m = 100 (confidence threshold) · C = mean rating of all results. Items with many reviews keep their own rating; items with few reviews get pulled toward the average. Ties break by review count.

## What it can and can't do

- ✅ Live ratings & review counts from Google Maps, Yelp, Google Shopping.
- ✅ 15 countries, city-level search for places.
- ❌ Full review *text* extraction at scale requires paid API tiers (SerpAPI reviews endpoint, Yelp premium). The free tiers give ratings, counts, and top snippets — enough for fair ranking.
- ❌ Scraping review sites directly (TripAdvisor, Zomato, Amazon pages) violates their terms and gets blocked; not included.

## Deploying online

Works on any Node host (Render.com / Railway.app free tiers). Want it on Cloudflare Pages? Ask Claude to convert the API to Pages Functions — same as was done for BestDeals.
