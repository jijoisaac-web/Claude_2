# BestDeals — live price comparison

Search a product, and BestDeals queries marketplace APIs side by side, then highlights the lowest price.

## Run it (2 minutes)

Requires [Node.js 18+](https://nodejs.org).

```
cd bestdeals-app
npm install
npm start
```

Open http://localhost:3000 — it starts in **demo mode** (sample prices) so you can see the full experience immediately.

## Enable LIVE prices (free API keys)

Copy `.env.example` to `.env`, then add any or all of these keys. Restart with `npm start` after saving.

### 1. SerpAPI — Google Shopping (best coverage, start here)
One call returns real prices from hundreds of stores (Walmart, Target, Amazon sellers…). Works for all 15 countries.
1. Sign up free at https://serpapi.com (no credit card, ~100 searches/month free).
2. Copy your key from the dashboard into `SERPAPI_KEY=`.

### 2. eBay Browse API (live eBay prices, 9 countries)
1. Create a free account at https://developer.ebay.com.
2. Go to **Application Keys** → create a **Production** keyset.
3. Copy **App ID (Client ID)** into `EBAY_CLIENT_ID=` and **Cert ID (Client Secret)** into `EBAY_CLIENT_SECRET=`.

### 3. Best Buy API (live electronics prices, US)
1. Register at https://developer.bestbuy.com (free).
2. Copy your API key into `BESTBUY_API_KEY=`.

## What it can and can't do

- ✅ Live prices from eBay, Best Buy, and (via Google Shopping) most major retailers.
- ✅ 15-country support with local currency.
- ❌ Facebook Marketplace & Instagram have no public API; scraping them violates their terms. Not included.
- Amazon direct prices require an Amazon Associates (affiliate) account + PA-API; Google Shopping usually covers Amazon listings anyway.

## Hosting it online

Any Node host works: Render.com or Railway.app (free tiers) — push this folder, set the env vars in their dashboard, done.
