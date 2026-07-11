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

## Deploy to Cloudflare Pages (free)

The `functions/` folder contains the API rewritten as Cloudflare Pages Functions, so the whole app runs serverless on Cloudflare — no Node server needed in production.

### Step 1 — push to GitHub

1. Create a free account at https://github.com and click **New repository** (name it `bestdeals`, keep it public or private, don't add any files).
2. Install git from https://git-scm.com if you don't have it.
3. In Command Prompt:

```
cd C:\Users\Ansa\Claude\Projects\16_Web_Deals\bestdeals-app
git init
git add .
git commit -m "BestDeals v2.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bestdeals.git
git push -u origin main
```

### Step 2 — connect Cloudflare Pages

1. Sign up free at https://dash.cloudflare.com.
2. Go to **Workers & Pages → Create → Pages → Connect to Git** and pick your `bestdeals` repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **public**
4. Click **Save and Deploy**. Your site goes live at `https://bestdeals-xxx.pages.dev`.

### Step 3 — add API keys (for live prices)

In your Pages project: **Settings → Environment variables → Add** — add `SERPAPI_KEY`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `BESTBUY_API_KEY` (whichever you have), then **Deployments → Retry deployment**. Without keys it serves demo prices.

Every future `git push` auto-redeploys the site.

## Alternative hosting

The Express version (`server.js`) still works for local dev (`npm start`) or any Node host (Render.com, Railway.app) — set the same env vars in their dashboard.
