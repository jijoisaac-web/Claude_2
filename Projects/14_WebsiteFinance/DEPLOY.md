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
- Watchlist is saved in your browser (localStorage) — no database needed
- `backend/` + `frontend/` — the original Python version, still usable locally via `run.bat`; Cloudflare ignores it

## Troubleshooting

- **404 on the site root** → Root directory wasn't set to `site`; fix in Pages → Settings → Builds
- **Charts empty / "no data"** → Yahoo may briefly rate-limit; wait a minute (edge cache absorbs most traffic)
- **Fundamentals show "crumb handshake failed"** → Yahoo session hiccup; retry, it re-establishes automatically
