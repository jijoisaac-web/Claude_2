# Deploy to Cloudflare Pages

## 1. Publish with GitHub Desktop

1. Open **GitHub Desktop** → **File → Add local repository**
2. Choose `C:\Users\Ansa\Claude\Projects\14_WebsiteFinance`
3. It will say "this directory is not a git repository" → click **create a repository here**
   (leave defaults; the `.gitignore` in the folder already excludes `.venv`, `data/`, caches)
4. Write a commit summary like `India Shares Tracker` → **Commit to main**
5. Click **Publish repository** — pick a name (e.g. `india-shares-tracker`), public or private both work

## 2. Connect Cloudflare Pages

1. Go to https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**
2. Authorize GitHub if asked, select the `india-shares-tracker` repo
3. Build settings — this part matters:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** *(leave as default)*
   - **Root directory (advanced):** `site`
4. Click **Save and Deploy**

Your site goes live at `https://india-shares-tracker.pages.dev` (name depends on what you pick). Every future commit you push via GitHub Desktop auto-redeploys in ~30 seconds.

## What runs where

- `site/index.html` — the whole UI; indicators and screener run in your browser
- `site/functions/api/chart/[symbol].js` — serverless proxy to Yahoo Finance charts (edge-cached 5 min)
- `site/functions/api/fundamentals/[symbol].js` — serverless proxy for fundamentals (edge-cached 1 hour)
- `site/functions/api/dividends/[symbol].js` — serverless proxy for dividend history, via Yahoo Finance (not NSE — see the Dividend Analysis tab's own footnote for why), edge-cached 6 hours
- Watchlist is saved in your browser (localStorage) — no database needed
- `backend/` + `frontend/` — the original Python version, still usable locally via `run.bat`; Cloudflare ignores it

## Troubleshooting

- **404 on the site root** → Root directory wasn't set to `site`; fix in Pages → Settings → Builds
- **Charts empty / "no data"** → Yahoo may briefly rate-limit; wait a minute (edge cache absorbs most traffic)
- **Fundamentals show "crumb handshake failed"** → Yahoo session hiccup; retry, it re-establishes automatically

## 3. Bulk & block deals multi-day history (git baseline + browser storage, no Cloudflare setup)

The FII/DII tab's 3D/7D/14D/30D/60D/90D/6M/1Y range buttons filter over a deal history built from three layers — no Cloudflare KV, no scheduler, no dashboard setup:

1. **Git-committed static baseline** — `site/data/deals-archive.json`, served as a plain static asset by Cloudflare Pages. Every visitor's browser fetches this once (tracked via an IndexedDB flag so it only happens on first load) and merges it into their local history. This is what makes history show up immediately for a brand-new visitor, not just after they've personally imported a CSV.
2. **Per-browser IndexedDB growth** — every time you open the FII/DII tab, today's disclosed deals get merged into your browser's local history, growing by one real day per visit. The **"Import history"** box also lets you backfill instantly: download **Bulk Deals** / **Block Deals** CSVs from NSE's own [Bulk/Block Deals Archives page](https://www.nseindia.com/report-detail/display-bulk-and-block-deals) (works from a normal browser — NSE's block is only against datacenter IPs like Cloudflare's, not regular visitors), then drop each file into the upload control and click Import.
3. **Today's live snapshot** — always fetched and merged in on every visit, so today's data is never stale.

NSE blocks its own multi-day archive endpoint from being fetched server-side (confirmed via `/api/largedeals?debug=1` — it returns NSE's bot-block page, not data), so there's no way to auto-refresh the shared baseline from this app's server. To refresh it periodically as your own browser accumulates more real days beyond what's baked into the baseline:

1. Open the FII/DII tab, click **"⬇ Export to site/data/deals-archive.json"** — downloads your browser's full accumulated history as JSON
2. Overwrite `site/data/deals-archive.json` in the project folder with the downloaded file
3. Commit + push via GitHub Desktop as usual — every future visitor now bootstraps from the refreshed baseline

Your own browser's local layer is capped at roughly the last 400 days (pruned automatically); clearing site data wipes only that layer — the git baseline still bootstraps back in on the next load.
