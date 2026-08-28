# Nifty 750 Graph Swing Desk

Quantitative swing-trading infrastructure for the Nifty 750 universe: price
action + sectoral volume rotation + graph-theoretic structure (Neo4j Aura),
extended with RS ranking/breadth, institutional footprint, and derivatives
confluence. See `pipeline/` for the analysis modules and `dashboard/` for the
static results view.

## Architecture

- **Neo4j Aura Free** holds the structure graph only (Sector/Industry/Stock/
  Supply-Chain/Parent-Subsidiary/MacroFactor). No time series lives in the
  graph -- Aura Free has no GDS plugin and a 200k node / 400k relationship
  ceiling, so all price/volume/OI data stays in CSV, joined on `ticker`.
- **GitHub Actions** (`.github/workflows/daily_pipeline.yml`) runs the full
  pipeline on a schedule, refreshes graph centrality scores in Neo4j, and
  writes `dashboard/dashboard_data.json`.
- **Cloudflare Pages** serves `dashboard/index.html`, which fetches that JSON
  client-side. No build step -- it's a static page.

## Repo layout

```
pipeline/
  rs_ranking.py              RS Rating (1-99) vs NIFTY500 + market breadth regime
  graph_centrality.py        Neo4j -> networkx: PageRank/betweenness/Louvain, writes back
  institutional_footprint.py Bulk/block deal signals + FII/DII flow regime
  derivatives_analysis.py    OI buildup classification + PCR contrarian bands
  run_pipeline.py            Orchestrator -- runs the above, emits dashboard_data.json
  schema_extensions.cypher   Neo4j macro-factor nodes + capacity census query
  requirements.txt
dashboard/
  index.html                 Static dashboard (Cloudflare Pages serves this directory)
data/                        Daily input CSVs go here (gitignored -- not committed)
.github/workflows/
  daily_pipeline.yml         Scheduled pipeline + Cloudflare Pages deploy
```

## One-time setup

1. **Push this repo to GitHub.**
   ```
   cd nifty-graph-swing
   git init -b main
   git add .
   git commit -m "Initial commit: graph swing pipeline + dashboard"
   git remote add origin https://github.com/<your-username>/nifty-graph-swing.git
   git push -u origin main
   ```

2. **Create a Cloudflare Pages project** named exactly `nifty-graph-swing`
   (or change `projectName` in the workflow to match). In the Cloudflare
   dashboard: Workers & Pages -> Create -> Pages -> "Direct Upload" (do NOT
   connect it to the GitHub repo via Cloudflare's own git integration --
   the Actions workflow deploys via API instead, so a git-connected Pages
   project would double-deploy).

3. **Generate a Cloudflare API token** with the "Cloudflare Pages — Edit"
   permission (My Profile -> API Tokens -> Create Token), and note your
   Account ID (right sidebar of any Cloudflare dashboard page).

4. **Add repo secrets** (GitHub repo -> Settings -> Secrets and variables ->
   Actions -> New repository secret):
   - `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` — your Aura instance
   - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

5. **Test it**: Actions tab -> "Daily Swing Pipeline" -> "Run workflow"
   (the `workflow_dispatch` trigger runs it on demand, no need to wait for
   the cron schedule).

## Known gaps — read before enabling the schedule

- **No live data-fetch step yet.** The workflow has a placeholder where your
  EOD / bulk-deal / FII-DII / derivatives data source should go (broker API,
  NSE bhavcopy download, etc.). Until that's wired in, scheduled runs will
  execute but the dashboard will show each section as empty with a warning,
  not silently fabricate data.
- **FII/DII flow thresholds (±5,000 Cr)** in `institutional_footprint.py` are
  placeholders — calibrate against your own historical flow distribution.
- **Position sizing / stop-loss module (2% capital risk rule)** is not yet
  built — the pipeline currently stops at signal generation.

## Local development

```
pip install -r pipeline/requirements.txt
cp .env.example .env   # fill in NEO4J_* for a local graph_centrality.py run
python pipeline/run_pipeline.py
python -m http.server --directory dashboard 8000   # preview the dashboard locally
```
