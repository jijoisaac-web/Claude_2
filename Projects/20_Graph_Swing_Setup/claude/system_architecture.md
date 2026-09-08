# Nifty 750 Graph Swing System — Architecture Log

Last updated: 2026-08-28

## Core principle
Neo4j Aura Free holds the **static structure graph only** (Sector, Industry, Stock,
Supply Chain, Parent-Subsidiary, MacroFactor). Never store daily price/volume as
graph nodes — 750 tickers × ~252 sessions/year blows the 200k node / 400k relationship
free-tier ceiling within a year. All time series lives in CSV/pandas, joined to the
graph via `ticker`. This also governs the newer Swing Score engine below: signals are
Python-computed columns/properties, not one graph node per stock per day (see "Swing
Score engine" -> architecture note for why a pasted external recommendation's
per-day Signal-node schema was deliberately not adopted).

## Data contracts (CSV column specs)

**daily_eod.csv** — the FULL accumulating long-format history (not a single day's
snapshot — rs_ranking.py needs 252+ trailing sessions per ticker in this one file),
includes a `NIFTY500` benchmark ticker row set:
`Ticker,Date,Open,High,Low,Close,Volume,Delivery_Pct,MA20,MA50,MA200,ATR14`
Minimum lookback: 252 trading days for RS ranking, 200 for MA200 breadth, 60 for
technical_signals.py (see "Swing Score engine" below).

**bulk_deals.csv**: `Date,Ticker,Client_Name,Deal_Type,Quantity,Price,Exchange,Deal_Source`
(Deal_Type in {BUY, SELL}; Deal_Source in {BULK, BLOCK}) — accumulating history,
~40 days retained.

**fii_dii_flow.csv**: `Date,FII_Net_Cr,DII_Net_Cr` (INR Crores, provisional daily)
— accumulating history, ~30 days retained (needs a 5-day rolling window).

**derivatives_data.csv**: `Ticker,Date,Close,Prev_Close,Fut_OI,Prev_Fut_OI,Put_OI,Call_OI,Days_To_Expiry,Rollover_Pct`
(covers only the ~180-200 F&O-eligible Nifty 750 constituents) — single-day
snapshot only (Prev_Close/Prev_Fut_OI come from the same day's F&O bhavcopy row,
no separate history file needed for this one).

**sector_rotation_history.csv** (added 2026-08-28, accumulating like daily_eod.csv):
`Date,Sector,Avg_RS_Rating,Median_RS_Rating,Member_Count` — one row per sector per
trading day, ~90 days retained. See "Graph insights" section below.

## Modules delivered (2026-08-28)

1. **rs_ranking.py** — IBD-style RS Rating (1-99 percentile, quarterly-weighted vs
   NIFTY500 benchmark) + market breadth regime gate (RISK_ON / NEUTRAL / RISK_OFF)
   based on % of universe above 50DMA/200DMA and advance/decline ratio.
2. **graph_centrality.py** — Pulls the Neo4j structure graph into networkx (Aura Free
   has NO GDS plugin, so all graph algorithms run client-side in Python). Computes a
   composite Hub_Score (reversed-graph PageRank 50% + betweenness 30% + out-degree
   centrality 20%) and Louvain community IDs, writes both back as Stock node
   properties. `find_contagion_candidates()` is the laggard screener: given confirmed
   breakout tickers, ranks their direct graph neighbors by structural coupling --
   NOW OPERATIONALIZED, see "Swing Score engine" below (previously dead code).
   IMPORTANT DIRECTIONALITY FIX: plain PageRank rewards nodes that receive edges;
   since our edges encode outward influence (Supplier->Consumer, Parent->Subsidiary),
   PageRank is computed on the REVERSED graph so the true influence source scores
   highest. Caught via smoke test before delivery.
   SECOND BUG FIXED 2026-08-28 (same day, later pass): `compute_communities()`
   returned a zero-column DataFrame (`pd.DataFrame([])`) when no Louvain community
   contained any Stock-typed member -- harmless in the shape of graph that's existed
   so far, but broke `merged = centrality.merge(communities, on="Ticker")` with a
   `KeyError('Ticker')` the moment it happened. Fixed by passing explicit
   `columns=["Ticker","Community_ID","Community_Size"]` to the DataFrame
   constructor. Caught by a smoke test built for this exact edge case, not in
   production.
3. **institutional_footprint.py** — Bulk/block deal net-buy-pressure signal
   (INSTITUTIONAL_ACCUMULATION / DISTRIBUTION / NEUTRAL) as a per-stock conviction
   booster, and a 5-day rolling FII+DII combined net flow macro gate
   (RISK_ON/NEUTRAL/RISK_OFF thresholds currently ±5000 Cr — tune periodically).
   BUG FIXED 2026-08-28: one-sided deal flow (100% BUY / 0% SELL or vice versa)
   produced a NaN ratio that failed both signal thresholds and silently
   misclassified the strongest possible accumulation/distribution rows as NEUTRAL.
   Now capped at a 999.0/0.0 sentinel instead of NaN.
4. **derivatives_analysis.py** — Four-way OI/price buildup classification
   (LONG_BUILDUP / SHORT_BUILDUP / SHORT_COVERING / LONG_UNWINDING), PCR contrarian
   bands (bullish >=1.3, bearish <=0.7), low-rollover-near-expiry caution flag.
   `screen_high_conviction_longs()` requires LONG_BUILDUP + BULLISH_CONTRARIAN PCR +
   NORMAL rollover as a confirmation filter (never a standalone entry trigger).
5. **schema_extensions.cypher** — Adds MacroFactor nodes (CRUDE_OIL, USD_INR, STEEL,
   COPPER, 10Y_GSEC) with TAILWIND_FOR/HEADWIND_FOR/INPUT_COST_FOR edges to Sector
   nodes -- currently only 4 hand-written demo edges (Oil&Gas Marketing, IT Services,
   Pharmaceuticals, Banking), NOT wired into any dashboard signal yet. Documents the
   Stock property slots written by graph_centrality.py (pagerank, betweenness,
   hub_score, community_id). Includes a capacity-census query to run after every
   ingestion batch.
6. **correlation_edges.py** (added 2026-08-28) — see "Graph insights" section below.
7. **sector_rotation.py** (added 2026-08-28) — see "Graph insights" section below.
8. **technical_signals.py** (added 2026-08-28) — see "Swing Score engine" below.
9. **swing_score.py** (added 2026-08-28) — see "Swing Score engine" below.

All modules were functionally smoke-tested against synthetic data (not just
syntax-checked) before delivery.

## Hosting architecture (2026-08-28) — LIVE

Repo `nifty-graph-swing/` deployed as a subfolder (`Projects/20_Graph_Swing_Setup/`)
of the user's existing `jijoisaac-web/Claude_2` GitHub repo, managed day-to-day via
GitHub Desktop on the user's machine:
- `pipeline/` — the modules above, plus `run_pipeline.py` orchestrator (breadth ->
  RS -> technical signals -> institutional -> derivatives -> conditional graph
  centrality/correlation edges/sector rotation/swing score/leader-laggard),
  `load_stock_universe.py` (one-time/occasional NSE universe loader), and the
  live-fetch layer (see below).
- `dashboard/index.html` — static, single-file, no-build-step dashboard, deployed to
  `nifty-graph-swing.pages.dev` (Cloudflare Pages, Direct Upload project type —
  deliberately NOT "Connect to Git," to avoid double-deploying alongside the
  GitHub Actions `cloudflare/pages-action@v1` step). Went through three visual
  generations same-project: an initial dataviz-skill-palette redesign (still fetching
  `dashboard_data.json` client-side, extended same-day with Sector Rotation, then
  Swing Score + Leader->Laggard sections — see "Dashboard redesign" and "Swing Score
  engine" below), then a full ground-up rebuild as **"GraphAlpha"** on 2026-08-28 —
  a premium dark-mode fintech UI running entirely on self-contained mock data with
  NO fetch of `dashboard_data.json` — see "GraphAlpha visual redesign" below, which
  is the file **currently live**.
- `.github/workflows/daily_pipeline.yml` (repo root — GitHub Actions only discovers
  workflows there, never in a nested subfolder) — fetches live market data, runs
  the pipeline, refreshes Neo4j centrality scores, deploys `dashboard/` to
  Cloudflare Pages, commits the resulting JSON + updated data/*.csv back. Continues
  to run and update `dashboard_data.json` on schedule even though the currently-live
  `dashboard/index.html` (GraphAlpha) does not consume that file — see "GraphAlpha
  visual redesign" for the implication.
  VERIFIED WORKING END-TO-END WITH THE LIVE-FETCH LAYER AND THE GRAPH-INSIGHTS
  BUILD (correlation edges + sector rotation): re-run successfully after the user
  committed+pushed, generated_at_utc `2026-08-28T10:44:48Z` -- see "Graph insights"
  -> "Verification status" for the confirmed results. The Swing Score engine below
  (technical_signals.py, swing_score.py, operationalized leader-laggard, dashboard
  additions) is staged on the device as of this same day but NOT YET run against
  real Neo4j/NSE data -- see "Swing Score engine" -> "Verification status".
- `.github/workflows/load_universe.yml` (repo root, `workflow_dispatch`-only, NOT
  scheduled) — runs `load_stock_universe.py`. Verified working (Load Stock Universe
  #1, Success, 36s).
- `.github/workflows/backfill_history.yml` (repo root, `workflow_dispatch`-only, NOT
  scheduled, added 2026-08-28) — runs `backfill_eod_history.py`. VERIFIED: Backfill
  EOD History #1, Success, 9m 15s (2026-08-28) — confirmed by directly checking the
  GitHub Actions run status (green success) and the resulting `data/daily_eod.csv`
  on `main` (large multi-hundred-day, ~750-ticker file — far too big to be a
  single-day snapshot).
- GitHub repo secrets confirmed present: `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_API_TOKEN`, `NEO4J_PASSWORD`, `NEO4J_URI`, `NEO4J_USER`.

CRITICAL DIRECTIONALITY NOTE ON CLOUDFLARE: Cloudflare Workers (JS/Pyodide edge
runtime) cannot run this stack — pandas/networkx/neo4j-driver aren't viable there.
Cloudflare's role is Pages (static dashboard hosting) only; GitHub Actions is the
actual compute layer.

## Neo4j Aura data population (2026-08-28)

`load_stock_universe.py` fetches NSE's official "Nifty Total Market Index" CSV
(750 stocks = Nifty 500 + Nifty Microcap 250, the user's "Nifty 750") live at
runtime from `nsearchives.nseindia.com` and MERGEs it into Aura. Two confirmed runs:
- Run 1: 774 total nodes (Stock+Sector), 752 BELONGS_TO relationships.
- Run 2 (idempotency check, re-run of the same workflow): 752 Stock, 22 Sector,
  752 BELONGS_TO — identical shape, confirming the MERGE-based upsert doesn't
  duplicate on re-run. Safe to re-run after each NSE semi-annual reconstitution.

Aura instance "Swing trade" (ID `86ebd6d2`), AuraDB Free, well under the 200k
node / 400k relationship ceiling — full headroom for supply-chain/ownership edges.

### BUG FOUND AND FIXED: Hub_Score / Community_ID were meaningless on first real run

First "Daily Swing Pipeline" run against the newly-populated graph (#3, Success)
produced a dashboard with **Hub_Score = exactly 0.5 for every single stock** and
**Community_ID sequential per stock (0, 1, 2, ...)** — i.e. every stock in its own
singleton community. Root cause: `graph_centrality.fetch_graph()` only queried
`MATCH (a:Stock)-[r:...]->(b:Stock)`, i.e. Stock-to-Stock edges only. The only edge
type actually populated right now is `(:Stock)-[:BELONGS_TO]->(:Sector)`, whose
target is a `:Sector` node — never matched by that query. Every Stock node was
therefore pulled into networkx fully isolated (0 edges), which mechanically
produces: uniform PageRank across all nodes (nothing to differentiate on) -> Hub_Score
component 1 identical for everyone; betweenness and out-degree both 0 for everyone,
hitting the `or 1e-9` divide-by-zero guard and contributing exactly 0 either way;
Louvain community detection on an edgeless graph puts every node in its own
singleton community.

Fix applied same day: `fetch_graph()` now also queries `(:Stock)-[:BELONGS_TO]->(:Sector)`
and adds Sector nodes into the networkx graph (namespaced `SECTOR::<name>` to avoid
any collision with a ticker string) purely as structure. `compute_centrality()` and
`compute_communities()` still run their algorithms over the full Stock+Sector graph
(so PageRank/Louvain have something real to work with) but filter Sector nodes back
out before returning — scores are only ever reported/written for Stock nodes.
`find_contagion_candidates()` also filters Sector nodes out of its neighbor set, since
a stock's own sector isn't a laggard candidate.

Verified with a synthetic 752-stock/22-sector graph, then confirmed on the live
dashboard against real data (run #3): Hub_Score varied (0.489–0.7 range) and Louvain
produced real sector-aligned communities.

RE-CONFIRMED on the first live-fetch-layer run (#5, 2026-08-28, full detail below):
community sizes now vary naturally (1, 3, 4, 8, 12 seen in the top-20 hub leaders)
and group sensibly by sector — e.g. Community 21 = {TIPSMUSIC, NAZARA, NETWORK18,
SUNTV, SAREGAMA, PVRINOX, PFOCUS, ZEEL} (all Media/Entertainment), Community 16 =
{ARVIND, PAGEIND, RAYMONDLSL, ALOKINDS} (all Textiles). JKPAPER topped the list at
Hub_Score 0.7 with Community_Size 1 — a legitimate small/niche sector (Paper), not a
recurrence of the bug, since every other community in the same top-20 list shows
correct multi-member grouping.

Every member within one sector scored identically through run #5 — expected, since
all stocks in a sector were structurally identical (one BELONGS_TO edge each) until
real structural edges existed. **UPDATE (same day, later run):** the correlation-edges
build below is confirmed live as of generated_at_utc `2026-08-28T10:44:48Z` — see
"Graph insights" -> "Verification status" for the real post-CORRELATED_WITH numbers,
which now show meaningful within-sector differentiation for the first time (e.g.
Community_ID 0/2/5/9/10 all drawing from mixed tickers with community sizes 6-100,
not one uniform per-sector bucket).

## Live market-data fetch layer (2026-08-28) — BUILT AND VERIFIED LIVE

User chose to build this ("Option B") after confirming the Neo4j-first phase.
Two design questions were asked and answered before building: (1) backfill ~400
days of history now vs. start fresh and wait months — user chose backfill now;
(2) build all 4 feeds together vs. reliable-first-then-fragile-later — user chose
build all 4 now, accepting that the two session-protected feeds may need more
day-one debugging.

**New files** (`pipeline/`): `nse_fetch_utils.py` (shared session/CSV-parsing
plumbing + the reliability writeup below), `fetch_eod_data.py` (daily increment),
`backfill_eod_history.py` (one-time ~400-day seed), `fetch_bulk_deals.py`,
`fetch_fii_dii.py`, `fetch_derivatives.py`, `fetch_all_market_data.py`
(orchestrates the 4 daily fetchers, isolates failures per-feed).

**Source reliability, most to least confident** (full detail + exact URLs in each
file's docstring):
1. EOD price/delivery (`sec_bhavdata_full_{date}.csv`) and NIFTY500 benchmark
   (`ind_close_all_{date}.csv`) — static files on `archives.nseindia.com`, same
   host family `load_stock_universe.py` already proved works from GitHub Actions.
2. Bulk/block deals (`content/equities/bulk.csv` / `block.csv`) — same static-file
   host family.
3. FII/DII flow (`www.nseindia.com/api/fiidiiTradeReact`) — no static-file
   alternative exists; requires a cookie-handshake session (`warm_session()`) and
   sits behind NSE's bot protection, which targets this host more aggressively.
   Built to degrade gracefully (warn + leave existing CSV untouched) rather than
   break the pipeline.
4. F&O open interest (UDiFF bhavcopy, URL inferred from the equity segment's
   confirmed July-2024 naming convention, NOT directly confirmed for the FO
   segment) — was expected to be the most likely feed to fail on the first real
   run. It didn't — see verification below.

**Critical fix alongside this build**: `.gitignore` previously had `data/*.csv`
gitignored (written under the old assumption that market data would be "fetched
fresh, not committed" — true for a single-day snapshot design, but daily_eod.csv/
bulk_deals.csv/fii_dii_flow.csv are now accumulating histories that MUST persist
across runs, since each GitHub Actions run starts from a fresh checkout with no
memory of prior runs otherwise). Fixed: `.gitignore` now only ignores `data/*.zip`
scratch; `daily_pipeline.yml`'s commit-back step now also `git add`s
`data/*.csv` alongside `dashboard_data.json`. Without this fix, the whole
accumulating-history design would have silently reset to a single day every run
— caught before the user ran anything, not after.

### First live run results — VERIFIED 2026-08-28

Sequence executed: Backfill EOD History (#1, Success, 9m 15s) then Daily Swing
Pipeline (#5, Success, 1m 16s). Verified directly against the live GitHub repo
(run status + committed data files + dashboard_data.json), not just user-reported
"it finished":

- **EOD + NIFTY500 benchmark**: WORKING. `daily_eod.csv` is a large, populated
  multi-hundred-day file; `breadth` in dashboard_data.json shows real varying
  numbers (864 advancers / 1716 decliners, 49.1% above 50DMA, 56.6% above 200DMA,
  Regime NEUTRAL) — not placeholder/empty values.
- **RS Ranking**: WORKING — the 253-trading-day minimum lookback is now satisfied
  by the backfill. Real differentiated scores, e.g. MTARTECH RS score 2.96 / Rating
  99 at the top of `rs_ranking_top20`.
- **Bulk/block deals**: WORKING. `bulk_deals.csv` has 248 records across 48 tickers
  for 2026-08-27, both BUY/SELL and BULK/BLOCK populated correctly.
- **Derivatives/F&O (lowest-confidence feed)**: WORKING — better than expected.
  `derivatives_data.csv` has 520 securities with real Fut_OI/Put_OI/Call_OI/
  Rollover_Pct values for 2026-08-27. The inferred UDiFF URL guess was correct on
  the first try; no fix needed.
- **FII/DII flow (medium-confidence feed)**: FAILED, exactly as documented/expected
  — `fii_dii_flow.csv` does not exist in the repo (never written, since this was
  the first-ever run with no pre-existing file to leave untouched). Confirmed by
  the single clean warning in dashboard_data.json's `warnings` array:
  `"fii_dii_flow.csv missing -- flow regime not computed."` — graceful degradation
  worked exactly as designed: no crash, rest of the pipeline completed normally.
  Root cause is presumed to be NSE's bot protection on `www.nseindia.com/api/`
  blocking the GitHub Actions runner IP, per the risk called out in
  `nse_fetch_utils.py`'s docstring. STILL not fixed as of the 2026-08-28T10:44:48Z
  run — same warning still present. Open item, see below.
- **Graph centrality/communities**: WORKING correctly on real accumulated data —
  see the "RE-CONFIRMED" note in the Neo4j section above.

**Open item**: FII/DII flow fetch has not yet succeeded even once. Options not yet
decided with the user: (a) leave as-is and accept the flow regime gate stays
unavailable most days (institutional_footprint.py already handles this
gracefully — RISK_ON/OFF gate just won't apply), (b) try an alternate source/method
for the cookie handshake, (c) find a static-archive fallback if NSE publishes one
for FII/DII (not yet researched).

## Dashboard redesign (2026-08-28)

`dashboard/index.html` rebuilt for a modern look at the user's request, referencing
design-checklist principles surfaced from the public `ui-ux-pro-max-skill` repo
(no build step added — still one static self-contained file, same
`dashboard_data.json` client-side fetch contract). Still built on the same
validated dataviz reference palette tokens as before (`--surface-1`,
`--status-good` etc. all unchanged hex values).

Changes: sticky header with a scroll-spy section nav; a light/dark toggle
(persisted via `localStorage`, defaults to `prefers-color-scheme`) layered on top
of the existing CSS custom-property theme tokens; KPI tiles with icons for the
regime section; every status badge now pairs an icon with its label rather than
color alone (accessibility requirement); RS Rating and Hub Score now render as
inline magnitude bars (sequential single-hue blue ramp) instead of bare numbers;
all tables are click-to-sort (real `<button>` per header, `aria-sort` on the
`<th>`); a freshness pill shows relative time since `generated_at_utc`;
table-scroll containers get a right-edge fade + JS-driven `has-overflow` class;
skip-link, `:focus-visible` rings, `prefers-reduced-motion` handling.

Verified via Playwright screenshots at 1440px light/dark, 768px dark, and
390px/375px light before shipping — caught and fixed a header-crush bug this way
pre-delivery. CONFIRMED LIVE 2026-08-28: the redesigned dashboard is now serving
real production data including the Sector Rotation section.

**SUPERSEDED 2026-08-28 (later same day):** this data-driven design was fully
replaced on the live site by the "GraphAlpha" ground-up visual rebuild — see
"GraphAlpha visual redesign" below. This section is kept as history; the
sector-rotation/click-to-sort/etc. code described here is no longer what is
deployed, though `dashboard_data.json` itself is unaffected and the pipeline
keeps producing it every run.

## Graph insights (2026-08-28) — correlation edges + sector rotation

User asked how to get more insight out of the graph. Investigation before building
anything found the graph was thinner than the dashboard implied: `EDGE_WEIGHTS` in
graph_centrality.py defines `SUPPLIES_TO`/`PARENT_OF`/`SUBSIDIARY_OF` at weight 3.0,
but **zero edges of those types exist** — no curated source yet. `BELONGS_TO`
(sector membership, weight 0.5) was the only real structure, which is why
Hub_Score/community detection had only ever reflected sector size. Also found
`find_contagion_candidates()` fully built but never called, and
`schema_extensions.cypher`'s MacroFactor edges (4 hand-written demo edges) wired
into nothing downstream.

1. **correlation_edges.py** — derives `CORRELATED_WITH` edges directly from
   `daily_eod.csv` price history: pairwise return correlation over a trailing
   120-trading-day window, kept sparse to each ticker's top-8 positively-correlated
   peers above a 0.6 floor. Skips itself (with a warning) below 60 days of
   accumulated history. Weighted 1.5 in `EDGE_WEIGHTS`. Does a FULL refresh every
   run (delete all `CORRELATED_WITH` edges, rewrite the fresh top-K set, both
   directions). This is the first edge type besides BELONGS_TO to actually
   populate the graph — CONFIRMED live 2026-08-28.

2. **sector_rotation.py** — aggregates the RS Ranking output up to the sector
   level via Neo4j's BELONGS_TO membership (`fetch_sector_map()`) — the literal
   "sectoral rotation" pillar from the original project brief. Grouped by Sector
   NAME rather than Louvain Community_ID (Louvain's integer IDs aren't stable run
   to run). Writes an accumulating `data/sector_rotation_history.csv` (90-day
   retention) and returns each sector's `Change_1D` vs. its most recent PRIOR
   entry. Sectors with fewer than 3 RS-eligible members are dropped.

**Wiring**: both hooked into `run_pipeline.py`'s `NEO4J_URI`-gated block.
Correlation-edge refresh runs BEFORE `fetch_graph()`/centrality. New
`dashboard_data.json` key: `sector_rotation`. `dashboard/index.html` gained a
"Sector Rotation" card, placed second in the nav right after Regime. (Note: this
card lived in the data-driven dashboard generation — see "SUPERSEDED" note under
"Dashboard redesign" above. `sector_rotation` still ships in `dashboard_data.json`
every run; it's just not rendered by the currently-live GraphAlpha file.)

**Drift caught while doing this work**: the live `run_pipeline.py` on the user's
device had been patched at some point ("Patched 2026-08-28 04:48:58") to wrap the
whole Neo4j block in try/except and check for `graph.number_of_nodes() == 0`.
Neither this project doc nor the cloud workspace's local copy reflected that
patch. Caught by comparing device file size/mtime against local before editing —
now an established habit on this project (this is the second time it's caught
real drift, after `.gitignore` earlier). The final merged version keeps both the
resilience patch AND the new wiring.

**Verification status — CONFIRMED LIVE 2026-08-28.** User committed + pushed via
GitHub Desktop and re-ran the Daily Swing Pipeline workflow. Checked directly
against the live repo (`dashboard_data.json` fetched fresh, cache-busted):

- `generated_at_utc` = `2026-08-28T10:44:48.389539Z` (confirmed newer than the
  pre-change 07:30Z snapshot).
- `sector_rotation` present with 21 real sectors from the live Neo4j Sector nodes,
  Member_Count ranging 3-116, Avg_RS_Rating spread 29.3-65.2. All `Change_1D`
  correctly null on this first-ever row per sector.
- `graph_hub_leaders_top20` shows genuine within-sector differentiation for the
  first time: community sizes 6/12/16/25/35/40/41/100, Hub_Score range 0.36-0.91
  (RTNPOWER top at 0.906) — confirms `correlation_edges.py`'s Cypher executes
  cleanly against Aura at real scale and materially reshapes centrality output.
- No "Graph centrality step failed" or "no Stock nodes found" warning present.

## Swing Score engine (2026-08-28) — technical signals + composite ranking + leader-laggard operationalized

Later the same day, the user pasted a detailed external recommendation (graph
schema with Signal/Event/News/Institution nodes, a 7-factor weighted
SWING_SCORE formula, a "leader breaks out -> laggard hasn't moved yet" Cypher
pattern, a tiered opportunity engine). Rather than build that literally, the
existing pipeline was audited against it first: RS/sector momentum/graph
strength/market regime already existed; `find_contagion_candidates()` (the exact
leader-laggard pattern requested) already existed but was dead code; only a
technical/breakout signal layer and a composite score combining everything were
genuinely missing. User chose (via an explicit build-order question) to build
technical signals + Swing Score + wire up leader-laggard first, and separately
chose NSE corporate announcements (free, official filings) as the future source
for the Catalyst/news pillar -- that piece is queued, NOT built yet (see "Still
not built" below).

**Architecture decision -- deliberate deviation from the pasted plan**: the
recommendation proposed a dedicated `(:Signal)` graph node per stock per
signal per day. Not adopted: per the "Core principle" at the top of this doc,
Neo4j Aura Free's 200k node / 400k relationship ceiling can't absorb daily
signal nodes across 750 tickers, and every other computed value in this
pipeline (RS Rating, Hub_Score, sector rotation) already lives as a
Python-computed column/property rather than a graph node. Signals stay in
pandas; only durable structure (Stock, Sector, correlation edges) lives in
Neo4j.

1. **technical_signals.py** (new) — breakout/pullback/momentum/volume detection
   from `daily_eod.csv`, the piece nothing in the pipeline computed before now.
   Per ticker (latest session, >=60 days history required): `Breakout_20D` /
   `Breakout_50D` (close clears the trailing rolling high on >=1.5x average
   volume), `EMA_Pullback` (a 20D breakout within the last 10 sessions has eased
   back to within 3% of the 20 EMA on contracting volume), `Higher_High` (a
   simple two-window swing-structure proxy), `RSI_14` + `RSI_Bullish` (55-70
   band, standard Wilder RSI computed in-module -- no RSI column existed
   before), `Volume_Ratio` + `Volume_Spike` (>=2x 20-day average). Rolls up into
   two independent 0-100 scores: `Technical_Score` (pure price-pattern signals,
   weighted 35/20/25/10/10 across the five flags) and `Volume_Score` (kept
   separate so volume isn't double-counted against Swing Score's own Volume
   pillar). Smoke-tested against engineered series with known breakout/pullback/
   RSI-edge-case (straight-up and straight-down moves) behavior, plus the
   insufficient-history skip.

2. **swing_score.py** (new) — the composite 0-100 "opportunity engine" blending
   every pillar the pipeline already computes: Technical 30%, RS 15%, Volume
   15%, Sector 15%, Catalyst 10% (not wired -- see below), GraphStrength 10%,
   Regime 5%, per the user's own weighting. Since Catalyst has no data source
   yet, the other six weights are rescaled to sum to 100 (a flat 0/10 for every
   stock would just shrink every score and distort the tier bands) --
   `CATALYST_WEIGHT` is kept as a named constant so wiring real news data later
   is a one-line change that collapses the rescaling back to the original 10%.
   Tiers: 80-100 A+ setup, 70-79 A setup, 60-69 Watchlist, 50-59 Early setup,
   <50 Ignore. Missing pillar inputs (e.g. a ticker's sector dropped from
   rotation, or graph centrality didn't run) default that pillar to 0 rather
   than dropping the ticker or crashing -- smoke-tested for exactly these cases,
   plus regime sensitivity (RISK_OFF measurably lowers every score vs RISK_ON
   for identical inputs) and fully-empty centrality/sector-rotation inputs.

3. **Leader-laggard operationalized** — `find_contagion_candidates()` in
   graph_centrality.py (built earlier, never called -- `example_breakouts = []`
   was hardcoded) is now fed today's real `Breakout_20D`/`Breakout_50D` tickers
   from technical_signals.py. This is the pasted plan's "leader breaks out ->
   correlated/connected peers that haven't moved yet" query, running for real
   for the first time.

**Bug found and fixed while wiring this in**: `graph_centrality.compute_communities()`
returned a zero-column DataFrame when no Louvain community contained any
Stock-typed node, which broke the downstream `.merge(on="Ticker")` with a
`KeyError`. Fixed by passing explicit `columns=` to the empty-case DataFrame
constructor -- see item 2 under "Modules delivered" above. Caught by a smoke
test built specifically to simulate a stock-less Neo4j response consistently
across every query fetch_graph() issues (an earlier, less careful version of
that same test mock had silently hidden the bug by leaving one query
inconsistently un-mocked).

**Wiring**: `technical_signals.py` runs right after RS ranking, independent of
whether Neo4j is reachable (own try/except, since it's new code touching real
750-ticker data for the first time -- unlike breadth/RS, which are already
proven live and run unguarded). `swing_score.py` and the leader-laggard call
both run inside the existing `NEO4J_URI`-gated block, after sector rotation,
using `centrality_df` (defaulted to an empty-but-correctly-shaped DataFrame
when the graph is empty) and `rotation_latest`. New `dashboard_data.json` keys:
`technical_signals_computed_for` (count), `swing_score_top20`, and
`leader_laggard_top20` (present only when today produced at least one
breakout with a structurally connected peer). The data-driven dashboard
generation gained two cards for these (see "SUPERSEDED" note under "Dashboard
redesign" above) -- not present in the currently-live GraphAlpha file, which
does not consume `dashboard_data.json` at all.

**Testing**: unit smoke tests for both new modules (engineered breakout/
pullback/RSI series; synthetic pillar inputs covering missing-data defaults,
tier boundaries, and regime sensitivity), a full `run_pipeline.py` integration
test with a fake Neo4j driver across three scenarios (normal path with two
forced synthetic breakouts to actually exercise the leader-laggard path end to
end, empty-graph path, exception-mid-block path -- all three re-verified after
the compute_communities() fix), and Playwright screenshots of both new
dashboard sections (1440px light/dark, 390px mobile) using a realistic sample
payload -- against the pre-GraphAlpha data-driven dashboard generation.

**Verification status — NOT YET LIVE.** All five changed/new files
(technical_signals.py, swing_score.py, graph_centrality.py, run_pipeline.py,
the pre-GraphAlpha dashboard/index.html) are pushed to the device and
md5-verified byte-identical, syntax-checked on the device shell, and synced to
this project's docs. NONE of this has run against the real Neo4j Aura instance
or real NSE data yet -- same next step as every prior build on this project:
user commits + pushes via GitHub Desktop, then runs the Daily Swing Pipeline
workflow. Specifically still unverified live: (a) whether
`technical_signals.py`'s breakout/RSI detection produces sane, non-degenerate
results across the real ~750-ticker universe (synthetic tests used small,
cleanly-separated series); (b) whether any real tickers actually trigger
`Breakout_20D`/`Breakout_50D` on a given real trading day, which is what
determines whether `leader_laggard_top20` appears at all; (c) whether
`swing_score_top20`'s real top ranks look sane against real sector/RS/graph
data together, not just the individually-verified pillars. Separately from
live-data verification, note that even once this pipeline output is confirmed
live in `dashboard_data.json`, it will NOT be visible on the deployed dashboard
until the GraphAlpha UI (see below) is re-wired to consume real data -- see
"GraphAlpha visual redesign" -> "Follow-up (not yet requested)".

**Still not built**: the Catalyst/news pillar -- user chose NSE corporate
announcements (free, official filings: orders, results, board decisions) as the
source when asked, but this has not been built yet; Swing_Score currently
rescales around it at 0% weight. Also still open from the original menu:
promoter/corporate-group `PARENT_OF`/`SUBSIDIARY_OF` curation; expanding and
actually consuming the `MacroFactor` sensitivity edges; `SUPPLIES_TO`
supply-chain curation (lowest priority -- correlation edges already provide a
data-driven proxy for much of the same signal for free).

## GraphAlpha visual redesign (2026-08-28) — CURRENTLY LIVE, 100% MOCK DATA

Same day, after the Swing Score engine build above, the user asked to change the
website's look and pasted an extremely detailed design brief for a premium
dark-mode financial platform named "GraphAlpha," styled after "a blend of
Bloomberg, TradingView, Linear, Vercel, and Stripe" — explicitly not a generic
admin dashboard and not crypto-styled. Two scoping questions were asked and
answered before building: (1) build as a reviewable mockup first vs. replace the
live dashboard immediately — user chose **replace the live dashboard now**,
explicitly accepting that the production site would show mock data instead of
real Neo4j/NSE-derived signals until re-wired later; (2) which screens to cover —
user chose **Dashboard + Stock Detail + Mobile view** (the fullest option offered).

**This is a ground-up rebuild, not a re-skin.** `dashboard/index.html` was
entirely rewritten as a single self-contained HTML/CSS/JS file (same
no-build-step constraint as always) that generates 100% deterministic mock
data client-side via a seeded `mulberry32` PRNG (a fixed 6-stock defence/capital-
goods universe: HAL, BEL, BDL, MTARTECH, COCHINSHIP, AZAD) and **does not fetch
`dashboard_data.json` at all**. A "Demo data" badge is shown in the UI per the
brief's explicit requirement to clearly mark placeholder data as such. The
previous data-driven file was backed up locally before being overwritten (not
pushed anywhere, cloud-workspace-only safety copy).

**What was built**, matching the brief's scope:
- Fixed left sidebar (Workspace / Research / Manage sections, Neo4j connection
  status + last-updated in the footer), collapsing to an icon rail at ~1024px and
  hidden entirely below 768px in favor of a bottom nav bar (Overview / Ideas /
  Graph / Stocks / Watch) — mobile is a distinct layout, not a shrunk desktop one.
- Minimal top header: breadcrumb, search (hidden <768px), a market status pill
  ("MARKET OPEN · NIFTY 50 +0.62%", compacted to just a status dot + label on
  mobile — see mobile fix below), notifications, avatar.
- Overview: hero greeting, 4 metric cards with SVG sparklines (NIFTY 50, BANK
  NIFTY, Market Breadth, Market Regime), a 12-column grid with an 8-col SVG area
  "Market Momentum" chart (1D/5D/1M/3M/6M/1Y segmented range control, hover
  crosshair + tooltip) and a 4-col "Top Opportunities" ranked list with circular
  SVG Swing Score rings, a "Graph Intelligence" network visualization (hand-
  positioned SVG nodes, distinct marker shapes for leader/candidate stocks ●,
  themes ◆, events ⬡, hover shows a floating info card, click highlights the
  connected path and fades the rest), a "Potential Propagation" (leader→laggard)
  horizontal flow card, and a sortable full Opportunity Table with status badges
  (HIGH CONVICTION / STRONG / WATCHLIST / EARLY).
- Stock Detail (reached by clicking any opportunity row or stock nav item): price
  header with Swing Score card, an SVG candlestick chart with EMA20/EMA50 overlay
  and a volume subplot (range control + hover tooltip), three "Why is this stock
  interesting?" insight cards, a "Graph Paths" chained visualization, and an "AI
  Market Intelligence" panel grouping FACTS / GRAPH INSIGHTS / RISKS.
- Full responsive behavior verified at desktop (1440px), tablet/icon-rail
  (~980px), and mobile (390px) breakpoints.

**Palette**: re-invoked the `dataviz` skill and iteratively validated candidate
dark-mode tokens with `scripts/validate_palette.js` rather than eyeballing
colors, per the skill's non-negotiable rule. Final validated set: accent
`#6366F1`, good `#1FAE6B`, warning `#B8790E`, critical `#DC4A6A` against surface
`#14171C` — ALL CHECKS PASS (Lightness band, chroma floor, contrast). The
warning↔critical pair sits in the "6-8 ΔE, legal only with secondary encoding"
band under deuteranopia (7.7 ΔE), so every status/tier badge in this build always
pairs color with an icon and a text label, never color alone.

**Verification performed before shipping**:
- HTML tag balance (`<div>`/`<section>`/`<script>`/`<svg>` open/close counts all
  matched) and `node --check` on the extracted `<script>` block — clean.
- Fixed one code-quality issue caught during this check: a leftover garbled
  fragment in `sparklineSVG` (`Math.max.apList ? 0 : Math.max.apply(...)`) that
  happened to always evaluate correctly (dead branch) but was sloppy — cleaned to
  a plain `Math.max.apply(null, series)`.
- Playwright screenshots (`/opt/pw-browsers/chromium`) at desktop (1440px),
  tablet/icon-rail (980px), and mobile (390px), covering both the Overview and
  Stock Detail views, plus a Graph Intelligence node hover interaction and a
  stock-chart range-control click. All rendered correctly with real interaction
  behavior (hover card, path highlighting, view switching via the sidebar/bottom
  nav's actual click handlers rather than calling internal JS functions directly,
  since the whole script is a single IIFE with no functions exposed on
  `window` — matches the file's own module boundary).
- **Real mobile bug found and fixed by this screenshot pass**: at 390px width the
  breadcrumb ("GraphAlpha / Overview") and the full market-status pill
  ("● MARKET OPEN | NIFTY 50 +0.62%") didn't fit the topbar together — the
  breadcrumb was crushed to ~19px and rendered as "Grap", overlapping the pill.
  Root cause: `.topbar-right{flex:none}` never shrinks, so the flex-shrinkable
  crumb absorbed all of the overflow. Fixed with two rules at the existing
  768px breakpoint: hide `.crumb-root`/`.crumb-sep` (mobile shows just the
  current page name, e.g. "Overview" or "HAL · Research") and hide the pill's
  index/change/divider (`.mp-idx`,`.mp-chg`,`.mp-div`), leaving just the status
  dot + "MARKET OPEN" label. Re-verified with a targeted 390×200 viewport
  screenshot plus computed `getBoundingClientRect()` checks on the crumb/pill/
  topbar-right widths before and after.
- Confirmed the fixed bottom-nav bar's mid-page appearance in a *full-page*
  screenshot is a known Chromium/Playwright full-page-screenshot stitching
  artifact for `position:fixed` elements (it composites the fixed element at
  whatever scroll offset it was captured at), not a real layout bug — verified
  by taking a plain (non-full-page) 390×844 viewport screenshot at scroll
  position 0, which shows the nav correctly pinned to the true bottom of the
  viewport.
- Console-checked for JS errors: only network failures for the Google Fonts
  request and a stray 404 (both artifacts of this sandbox's restricted egress,
  not app bugs — Cloudflare Pages serves to the real internet, where the
  `fonts.googleapis.com`/`fonts.gstatic.com` requests in the `<head>` will
  succeed normally).
- Pushed to the device (`dashboard/index.html`, no drift found beforehand — the
  device copy was still the pre-GraphAlpha 45,913-byte file) and md5-verified
  byte-identical (`acba8bda5e47090b2949e1d08bbfe2db`) via the device shell.
  Synced to this project's docs.

**Critical caveat — READ BEFORE DEPLOYING**: this file has NOT been committed or
pushed to GitHub yet, and once it is, **the live GraphAlpha dashboard will show
only mock/demo data** — 6 hardcoded defence-sector stocks, deterministic fake
prices/scores/graph relationships — with **zero connection** to the real
pipeline's `dashboard_data.json` output (real breadth, RS ranking, sector
rotation, swing scores, leader-laggard, institutional/derivatives signals). The
daily GitHub Actions pipeline will keep running and keep producing a fresh,
correct `dashboard_data.json` every day exactly as before; the deployed UI will
simply not read it until re-wired. This was an explicit, informed tradeoff the
user chose (picking "replace the live dashboard now" over "mockup to review
first") in order to get the visual redesign shipped fast, per the brief's own
closing instruction to "focus on making the interface visually impressive before
adding backend functionality."

**Follow-up — DONE, see "GraphAlpha real-data wiring" below.** The re-wiring
described in this paragraph (originally flagged as "not yet requested") was
explicitly requested by the user the same project session and has now been
built — see the new section below for the full design and verification status.

## GraphAlpha real-data wiring (2026-08-28) — BUILT, VERIFIED VISUALLY, NOT YET LIVE

User explicitly chose "Wire GraphAlpha to real data" when asked which direction
to take next after confirming the GraphAlpha visual redesign was live. Two
scoping questions were asked and answered before building: (1) how to source the
NIFTY 50 / BANK NIFTY hero-card index levels — user chose **add a live index
fetch**; (2) how much OHLC history to export for the Stock Detail candlestick
chart — user chose **top ~20-40 ranked stocks** (implemented as exactly the
top-20 `swing_score_top20` tickers).

**The problem**: `dashboard_data.json` had no price/OHLC/index-level data at all
before this — `run_pipeline.py`'s `swing_score_top20` export only carried pillar
*scores*, never a raw price. Wiring GraphAlpha to real data required real
pipeline extension work, not just a frontend rewrite.

**New pipeline file — `fetch_index_levels.py`**: reuses the SAME archive file
`fetch_eod_data.py` already fetches for the NIFTY500 benchmark row
(`ind_close_all_{DDMMYYYY}.csv` on `archives.nseindia.com` — confirmed by reading
`fetch_eod_data.py`'s own source that this file lists every NSE index for the
day, not just NIFTY 500) to extract NIFTY 50 / NIFTY BANK OHLC as a second,
independent fetch (so it can fail/be re-run without touching daily_eod.csv/RS
ranking). Appends to a new accumulating `data/index_levels.csv`
(`Date,Index,Open,High,Low,Close,Chg_Pct`, 400-day retention matching
daily_eod.csv), same "try today, walk back 5 days" pattern and
`fetch_archive_csv`/`normalize_columns` plumbing as every other fetcher here.
Wired into `fetch_all_market_data.py` as the 2nd step, right after EOD.

**`run_pipeline.py` additions**:
- `_build_market_indices()` reads `index_levels.csv` and exports
  `market_indices.{NIFTY50,BANKNIFTY}` (latest Close, Chg_1D_Pct, full Series
  for the momentum chart/sparklines) — `None` gracefully (warning, not a crash)
  until `fetch_index_levels.py` has run at least once.
- `swing_score_top20` now gets `Price`/`Chg_1D_Pct`/`Chg_5D_Pct` merged in via a
  new `_price_snapshot()` helper (previously pillar scores only, no raw price),
  plus `Volume_Ratio`.
- New `stock_ohlc` (~150 trading days OHLC+Volume) and `stock_technicals` (raw
  RSI/breakout/pullback flags) exports, scoped to exactly the top-20 swing-score
  tickers — deliberately not the full ~750-ticker universe, since the UI can
  never link to a stock outside that top 20.
- `_price_snapshot()` returns a correctly-columned empty DataFrame for an empty
  ticker list — same discipline as the `compute_communities()` zero-column bug
  fixed earlier this project, applied proactively here rather than discovered
  the hard way again.

**Dashboard adapter pattern (`dashboard/index.html`)**: rather than rewrite every
`render*()` function, the original mock top-level `var`s were renamed
`MOCK_*`-prefixed, and a new set of "active module state" `var`s
(`STOCK_UNIVERSE`, `STOCK_DATA`, `NIFTY_SERIES_FULL`, `GRAPH_NODES`,
`GRAPH_EDGES`, etc.) point at the mock data by default and get reassigned in
place after a successful `dashboard_data.json` fetch — every existing render
function keeps working unmodified. `init()` renders synchronously with mock data
first (so the page is never blank while the fetch is in flight), then re-renders
once with real data if the fetch succeeds and `swing_score_top20` is non-empty
and contains at least one non-"Ignore"-tier stock.

**Design principle — no mixed real+mock data under a "Live" badge**: once live
mode is active, every sub-section either renders fully real or shows an honest
empty-state message; it never silently falls back to fabricated mock numbers
while claiming to be live. Applied independently to three sections, each with
its own availability flag: the momentum chart (`MOMENTUM_LIVE_AVAILABLE`,
depends on `market_indices.NIFTY50.Series`), the Graph Intelligence panel
(`GRAPH_LIVE_AVAILABLE`), and the Leader→Laggard flow card (`FLOW_DATA_LIVE`
null check).

**Graph Intelligence generic layout** (real tickers vary, unlike the fixed
6-node mock): Tier A — `leader_laggard_top20` present: center node = the
highest-`Contagion_Score` row's `Breakout_Ticker`, one theme node for its
Sector, laggards radiated in a circle (up to 6), strength normalized against the
top laggard's `Contagion_Score`. Tier B — only `graph_hub_leaders_top20`
present (no breakout today): falls back to the largest Louvain community among
top hub leaders, centered on its highest-`Hub_Score` member. Tier C — neither
present: empty-state message ("No structural graph data this run").

**Leader→Laggard flow card**: `Edge_Weight` mapped back to a human label via
`edgeWeightLabel()` (≤0.75 "Sector peer"/BELONGS_TO, ≤2.0 "Correlation
edge"/CORRELATED_WITH, else "Structural link", thresholds reverse-engineered
from graph_centrality.py's `EDGE_WEIGHTS`). Candidate's "Graph Convergence" ring
uses `Hub_Score * 100` (already 0-1 scaled) rather than raw `Contagion_Score`
(not 0-100 scaled, would render the ring nearly empty).

**AI Market Intelligence panel**: FACTS from client-side EMA20/EMA50 (computed
from `s.ohlc` in `openStock()`), `Volume_Ratio`, `Sector_Score`, `RSI_14`;
GRAPH INSIGHTS from real `leader_laggard_top20` link count + Hub Score/community
size; RISKS conditionally include RSI-overbought and no-fresh-trigger flags,
always ending with a "confirm with your own risk plan" disclaimer. The Catalyst
insight card now honestly states the pillar isn't wired yet (queued: NSE
corporate announcements) instead of the old "demo placeholder" copy.

**Real-date handling**: since real trading dates aren't consecutive calendar
days (unlike the old `dateLabel(i,total)` synthetic "today minus N days"
formula), added `formatDateStr(iso)` (manual YYYY-MM-DD parse, avoids timezone
shift bugs) and threaded real `Date` strings through `NIFTY_DATES_FULL` and each
OHLC candle's `d` field — built consistently for both mock (`buildMockDates()`)
and live data.

**Known tradeoffs, deliberate**: live-mode stock cards show the raw Ticker as
`name` (e.g. "TICK000") since the pipeline has no company-full-name mapping for
arbitrary Nifty 750 tickers — correctness over cosmetic polish.
`buildLiveUniverse()` filters out `Tier === "Ignore"` rows so the Opportunities
list stays meaningful; if all 20 rows are "Ignore" tier (unlikely with real
750-stock data), the function returns `null` and the whole page gracefully
falls back to full mock/demo mode.

**Testing**:
- `smoke_test_graphalpha_exports.py` — unit tests for `_price_snapshot`,
  `_export_stock_ohlc`, `_export_stock_technicals`, `_build_market_indices`, and
  `fetch_indices_for_day` (network mocked) — correct 1D/5D math, insufficient-
  history degradation, empty-ticker-list shape, schema-drift and
  404/non-trading-day graceful `None`s. All passed.
- `smoke_test_run_pipeline_v3.py` — extended the existing 3-scenario
  Neo4j-mocked integration test (normal / empty-graph / exception-mid-block)
  with synthetic `index_levels.csv` and new assertions for
  `market_indices`/`stock_ohlc`/`stock_technicals`/merged
  `Price`/`Chg_1D_Pct`/`Volume_Ratio`. All 3 scenarios still pass — no
  regression to previously-shipped Swing Score / leader-laggard / sector-
  rotation functionality.
- Playwright, 4 scenarios generated directly from the v3 smoke test's own tmpdir
  output plus a synthetic 404 case, each screenshotted at 1440px (Overview +
  Stock Detail):
  - **full_live** — everything present. Confirmed correct end-to-end: real
    NIFTY 50/BANK NIFTY hero cards, real momentum chart, real Graph
    Intelligence (Tier A layout), real Potential Propagation flow card, real
    Opportunity Table, and a fully real Stock Detail page (candlestick+EMA
    chart, data-driven insight cards, real AI Market Intelligence FACTS/GRAPH
    INSIGHTS/RISKS).
  - **partial_live** — `swing_score_top20` present but no
    `graph_hub_leaders_top20`/`leader_laggard_top20`. Confirmed the empty-state
    paths render correctly and honestly: "No structural graph data this run" /
    "No active propagation signal today" messages, Neo4j sidebar status
    correctly shows "Degraded", "Live" badge still shown (since swing scores
    themselves ARE live) — this was the most novel, previously-unverified code
    path and it worked on first render.
  - **exception_fallback** (no `swing_score_top20` at all) and
    **nodata_fallback** (404, no `dashboard_data.json`) — both correctly fall
    all the way back to the full mock/demo dashboard with the "Demo data"
    badge, confirming graceful degradation at every tier.
  - 0 non-network console/page errors across all 4 scenarios.

**Verification status (original build) — NOT YET LIVE.** All four changed/new
files (`fetch_index_levels.py`, `fetch_all_market_data.py`, `run_pipeline.py`,
`dashboard/index.html`) are pushed to the device and md5-verified
byte-identical, and synced to this project's docs. Visual/functional
verification above covers 4 realistic *synthetic* data scenarios generated from
the smoke test's own output — NONE of this has run against the real Neo4j Aura
instance or real NSE data yet. Specifically still unverified live: (a) whether
`market_indices` actually populates correctly from a real
`ind_close_all_{date}.csv` file structure (schema was inferred from
`fetch_eod_data.py`'s benchmark-row parsing, not directly observed for the
NIFTY 50/BANK NIFTY rows); (b) whether real Stock Detail OHLC candlesticks and
EMA overlays render sensibly at real price scales/volatility; (c) whether the
Graph Intelligence Tier A/B layout algorithm produces a sensible-looking node
graph for real tickers/sectors rather than the synthetic TICK000-style test
data.

### BUG FOUND AND FIXED (same day, after going live): single-day index history produced a silently blank Market Momentum chart

User confirmed the live site (screenshot of `nifty-graph-swing.pages.dev`):
"Live" badge, Neo4j Connected, real top-opportunity tickers (ATHERENERG, IFCI,
NAZARA — confirming `swing_score_top20`/`buildLiveUniverse()` is genuinely
live), NIFTY 50/BANK NIFTY hero numbers correct. But the Market Momentum chart
panel was **completely blank** — no line, no empty-state message, just empty
space, which is exactly the "silent failure" state the whole real-data wiring
was designed to avoid (see "Design principle — no mixed real+mock data" above).

Root cause, confirmed by fetching the live `dashboard_data.json` directly: this
was the very first day `fetch_index_levels.py` had ever run, so
`market_indices.NIFTY50.Series` had exactly **one** point
(`[{"Date":"2026-08-28","Close":24175.65}]`). Two functions divide by
`(series.length - 1)` to lay out points along the x-axis —
`renderMomentumChart()`'s `X(i)` and `sparklineSVG()`'s per-point `x` — and at
length 1 that's `0/0 = NaN`. The resulting `<polyline>`/`<circle>` SVG
attributes contained literal `"NaN"`, which the browser silently drops (no
visible mark, but a real console error each time). `applyLiveData()`'s gate
only checked "does `Series` exist and have length" (truthy at length 1), so it
never routed into the empty-state path that was already built and correctly
designed for the "no history at all" case — it just fell through to a render
function that couldn't cope with exactly one point.

**Fix**: `applyLiveData()` now requires `Series.length >= 2` before setting
`MOMENTUM_LIVE_AVAILABLE = true`; a single-point day now correctly shows the
existing honest empty-state message ("Index-level history not available yet ...
Real Swing Score / Opportunity data above is unaffected") instead of a blank
panel. `renderMomentumChart()` also gained its own defense-in-depth guard
(`series.length < 2` after the range slice) so a future range bucket smaller
than available history can't reach the same NaN math even if the upstream flag
logic changes later. Separately, `sparklineSVG()` (used by the NIFTY 50/BANK
NIFTY hero-card mini-charts, which get the raw un-length-checked `Series`
array) was fixed to center a lone point at the sparkline's midpoint instead of
computing a NaN x-coordinate — renders as a single dot rather than nothing.

**Verified**: reproduced exactly by fetching the live `dashboard_data.json`
(confirmed `Series.length === 1` for both indices) and re-running the earlier
"full_live" Playwright fixture with its `market_indices` series trimmed to the
final point only. Before the fix: 4 console errors (`<polyline>`/`<circle>`
"Expected number/length, NaN") and a blank momentum panel. After the fix: 0
console errors, hero-card sparklines render a centered dot, momentum panel
shows the correct empty-state text, "Live" badge and all other live sections
unaffected. Pushed to device, md5-verified byte-identical
(`2c5049ad0dc98327d0e9149e2877fb4d`, 115,222 bytes), synced to project docs.
**This fix still needs to be committed + pushed via GitHub Desktop and
deployed** (same as every change on this project) before it's live — until
then the production site still has the blank-chart bug. Once
`fetch_index_levels.py` accumulates a second day of history, the real
line-chart path (already working, verified in the original 280-point synthetic
fixture) takes over automatically — no further change needed for that
transition.

Same next step as every prior build on this project: user commits + pushes via
GitHub Desktop, then runs the Daily Swing Pipeline workflow.

## Graph-insights Batch 1 (2026-08-28) — structural edges + bridge stocks + 2-hop leader-laggard + community drift — BUILT, VERIFIED, NOT YET LIVE

After GraphAlpha's real-data wiring shipped (see above), the user asked how to
get more value out of the graph and was given 7 prioritized recommendations
(curated structural edges, MacroFactor wiring, bridge-stock detection, multi-hop
leader-laggard, institution nodes from bulk deals, community drift tracking,
watchlist concentration). Two scoping questions were asked and answered before
building: (1) how to sequence the 7 items — user chose **priority batches,
verify each**, explicitly scoping Batch 1 to the four graph-only items needing
no new external data source (structural edges, bridge stocks, 2-hop
leader-laggard, community drift), deferring institution nodes and watchlist
concentration to a follow-up pass; (2) MacroFactor wiring — user chose
**defer for now**, since it needs a live external feed (oil/USD-INR/steel/
copper/10Y G-Sec) that doesn't exist in this pipeline yet.

### 1. Curated structural edges — `corporate_group_edges.py` (new)

Closes the gap flagged in "Graph insights" above: `EDGE_WEIGHTS` has defined
`SUPPLIES_TO`/`PARENT_OF`/`SUBSIDIARY_OF` at weight 3.0 since the very first
build, but zero edges of those types ever existed — `CORRELATED_WITH` was
carrying all of the non-`BELONGS_TO` structure.

**Design decision — a 4th edge type was needed.** Most "group companies" people
think of as one entity (Tata Motors, Tata Steel, Titan, TCS...) are NOT
parent/subsidiary of each other — they're independently listed siblings under a
common, often-unlisted holding company (Tata Sons). Modeling them as
`PARENT_OF`/`SUBSIDIARY_OF` would have been factually wrong, in the same
"confidently wrong" spirit as the PageRank-directionality and zero-column-
DataFrame bugs caught earlier in this project. Introduced `GROUP_AFFILIATE_OF`
(weight 2.2, between `CORRELATED_WITH`'s 1.5 and confirmed-ownership's 3.0),
modeled **hub-and-spoke per group** (one flagship company as hub — e.g. TCS for
Tata, ADANIENT for Adani, GRASIM for Aditya Birla, M&M for Mahindra,
BAJAJHLDNG for Bajaj, RELIANCE for Reliance/Jio) rather than a full pairwise
clique, so a 14-15-member group like Tata stays at O(n) edges instead of O(n²)
while every member is still reachable within 2 hops. True `PARENT_OF`/
`SUBSIDIARY_OF` reserved only for genuine, well-documented majority-ownership
pairs between two *listed* entities (AMBUJACEM→ACC, GRASIM→ULTRACEMCO/
ABCAPITAL, M&M→M&MFIN/TECHM/MHRIL, BAJAJHLDNG→BAJAJ-AUTO/BAJAJFINSV,
BAJAJFINSV→BAJFINANCE). `SUPPLIES_TO` reserved for genuine business input/
output relationships (TATASTEEL→TATAMOTORS/TMCV/TMPV — the last two being
candidate ticker spellings for the 2025 Tata Motors demerger, included since
which one NSE actually lists wasn't confidently resolvable from training
knowledge alone).

`build_edge_list()` flattens all tiers into 85 directed edges (unit-tested: no
self-loops, `GROUP_AFFILIATE_OF` symmetric both directions, `PARENT_OF`/
`SUBSIDIARY_OF` correctly mirrored). `refresh_structural_edges(driver)` deletes
all edges tagged `source: 'curated_static'` and re-MERGEs the curated set
(grouped by relationship type, since Cypher can't parameterize a relationship
TYPE), self-reporting `{"requested": N, "written": M}` — a MATCH against a
ticker that doesn't exist in the live universe just returns 0 rows silently, so
this counter is how ticker-matching drift against the real Nifty 750 universe
becomes visible in pipeline logs rather than swallowed.

### 2. Bridge-stock detection — `identify_bridge_stocks()` in `graph_centrality.py`

Surfaces the "sits structurally between two clusters" signal as its own
dashboard card rather than leaving it implicit in Hub_Score. For each ticker,
collects the Louvain communities of its graph neighbors (excluding its own
community and excluding Sector-node neighbors, which populate a separate
`Sector` field instead), ranks by `Betweenness_Score` (the metric that actually
measures "sits between things") with `Communities_Bridged` as a secondary sort
key.

**Bug found and fixed by the smoke test**: the original gate required a node to
touch **>=2** other communities to be flagged. A synthetic two-cluster+bridge
test graph showed Louvain always resolves a node straddling exactly two
clusters INTO one of them (every node must be assigned somewhere) — so a
genuine two-cluster bridge shows exactly ONE "other" community touched, never
two, and the `>=2` threshold was unsatisfiable for the single most common real
bridge case. Fixed to `>=1`; re-verified the synthetic BRIDGE node is now
correctly flagged (`Communities_Bridged=1, Betweenness_Score=57.14`) and the
synthetic NORMAL (single-cluster) node is correctly excluded.

### 3. 2-hop leader-laggard — `find_contagion_candidates()` extended

Was hard-capped at direct (1-hop) graph neighbors of a breakout stock. Rewritten
as a BFS with `max_hops` (now called with `max_hops=2`) and `hop_decay=0.5`:
`visited` set keeps a node reachable at multiple hop-distances only at its
shortest distance; `Contagion_Score` is multiplied by `hop_decay ** (hop-1)`, so
hop-1 output is mathematically identical to the pre-existing single-hop formula
(backward compatible — unit-tested byte-for-byte against the old output) and
hop-2 candidates are half-weighted by default. Sector/non-Stock nodes extend the
BFS frontier (a stock two sectors apart via a shared theme is still reachable)
but are never themselves reported as a candidate. New `Hops` column threaded
through `run_pipeline.py`'s `leader_laggard_top20` export.

### 4. Community drift tracking — `community_drift.py` (new)

Flags when a stock's structural peer group has meaningfully changed since the
prior run — a graph-native "something is rotating" signal that isn't RS-based.

**Design problem**: `sector_rotation.py` already documented that "Louvain's
integer `Community_ID`s aren't stable run to run" (same real community can get
a different arbitrary label next time). Comparing raw IDs day-over-day would
produce false-positive drift constantly. Solved by comparing **peer SETS**
(Jaccard overlap of each ticker's community co-members) instead of ID values —
proved correct with a dedicated invariance test: identical membership under
completely different, shuffled Community_ID numbers between "yesterday" and
"today" produces **zero** false drift.

`compute_peer_sets()` excludes communities smaller than 3 members (too noisy to
be a meaningful "peer group"). `load_prev_snapshot()`/`save_snapshot()`
persist to `data/community_snapshot.csv` as a single **overwritten** file
(Ticker,Peers, pipe-joined) — deliberately not an accumulating history like
`daily_eod.csv`, since drift detection only ever needs yesterday's snapshot;
documented explicitly in the module docstring as an intentional deviation from
this project's usual accumulating-CSV pattern. Only tickers present in BOTH
snapshots are compared (new/dropped tickers skipped, not flagged); rows below
50% overlap are returned, sorted by biggest drift first.

**Tri-state signal, not binary**: `run_pipeline.py` always emits BOTH
`community_drift_baseline_available` (bool) and `community_drift_alerts`
(always a list, possibly empty) rather than only emitting the alerts key when
non-empty (the convention used for `leader_laggard_top20`/`sector_rotation`
elsewhere in this codebase). Collapsing "no baseline yet" (first run) and
"baseline exists, zero alerts" (stable — a good outcome) into one "key absent"
state would have hidden a genuinely different, dashboard-relevant distinction.
Snapshot is saved every run regardless of whether a prior one existed, so the
second run always has a baseline to compare against.

### Dashboard integration

Two new cards added to `dashboard/index.html`, between the "Potential
Propagation" and Opportunity Table sections, in a new `.grid-12`/`.col-6`
two-column row (`.col-6` is a new small CSS utility, collapses to full-width at
the existing 1180px breakpoint):

- **Bridge Stocks** (`#bridge-list`) — reuses the existing `.opp-row`/
  `score-ring` pattern. Since bridge/drift tickers aren't guaranteed to be in
  the top-20 swing-score universe the row-click-to-open logic depends on (they
  come from the broader structure graph, not the ranked shortlist), a new
  `stockLinkParts()` helper returns a `no-link` class + no `data-open-stock`
  attribute for non-openable tickers, with matching CSS
  (`.opp-row.no-link{cursor:default}`, no hover highlight) so those rows don't
  look falsely clickable.
- **Community Shift** (`#drift-list`) — same pattern, shows overlap % and a
  sample of prior/current peers per flagged ticker.

Both gate on real availability flags following the established "no mixed
real+mock data under Live" principle: Bridge Stocks shares `GRAPH_LIVE_AVAILABLE`
with the existing Graph Intelligence panel (same underlying graph), with an
honest "no bridges found this run" empty state (a valid, non-broken outcome,
distinct from "no structural graph data at all"). Community Shift gates on its
own new `DRIFT_BASELINE_AVAILABLE` flag with three distinguishable states: no
baseline yet ("Building baseline" message, first run after this feature
ships), baseline exists with zero alerts (rendered the same as "no bridges" —
stable is a good outcome), baseline exists with real alerts.

`edgeWeightLabel()` extended with a "Group affiliate" tier (weight <=2.6, below
`GROUP_AFFILIATE_OF`'s 2.2) and a "2-hop " prefix when `Hops === 2`; the graph
SVG's edge-drawing loop now renders hop-2 edges with `stroke-dasharray="4,3"`
(dashed) to visually distinguish them from direct 1-hop links.

### Testing

- `smoke_test_batch1.py` — `corporate_group_edges.build_edge_list()` (85 edges,
  no self-loops, symmetry checks), `identify_bridge_stocks()` (synthetic
  2-cluster+bridge+normal graph — found and fixed the `>=1` threshold bug
  above), `find_contagion_candidates()` multi-hop (hop-1 byte-identical to the
  old formula, hop-2 correctly decayed, shortest-path dedup verified),
  `community_drift.py`'s peer-set invariance property (the key correctness
  test described above). All passed after the bridge-stock fix.
- `smoke_test_run_pipeline_v4.py` — extended the existing fake-Neo4j
  integration test with a `.single()` method on the fake result (needed for
  `refresh_structural_edges()`'s `result.single()["n"]` self-reporting count)
  and query-pattern handling for the curated-edge DELETE/MERGE queries.
  Confirmed: structural-edge refresh runs unconditionally and logs
  "0/85 matched real Stock nodes" against the synthetic ticker universe
  (expected — curated tickers are real company names, synthetic test tickers
  are `TICK000..TICK039`, itself a valid graceful-degradation scenario);
  `leader_laggard_top20` rows carry both `Hops=1` and `Hops=2`, confirming the
  BFS actually reaches 2 hops in this test's synthetic graph;
  `community_drift_baseline_available` is `False`/`alerts=[]` on a first run
  and correctly flips to `True` on a second "day 2" run against the same
  `data_dir`; empty-graph and exception-mid-block scenarios both confirm
  structural-edge refresh is unaffected (runs before the point of failure) but
  bridge-stock/drift detection correctly never runs (positioned after in code
  order).
- Playwright, 3 fixtures screenshotted at 1440px: **full** (populated Bridge
  Stocks — one clickable + one non-clickable row — and Community Shift cards,
  a real hop-2 dashed edge visible in the Graph Intelligence panel, "2-hop "
  label text confirmed present); **empty** (genuine first-run "Building
  baseline" and "No bridge stocks detected this run" honest empty states,
  reusing real day-1 pipeline output rather than fabricated data); **mock**
  (pure demo-mode fallback with `MOCK_BRIDGE_STOCKS`/`MOCK_COMMUNITY_DRIFT`
  under the "Demo data" badge). 0 page errors across all 3; console errors seen
  are the same pre-existing Google Fonts/favicon network calls blocked in this
  sandbox, unrelated to this change.

**Verification status — NOT YET LIVE.** All 5 changed/new files
(`corporate_group_edges.py`, `community_drift.py`, `graph_centrality.py`,
`run_pipeline.py`, `dashboard/index.html`) are pushed to the device and
md5-verified byte-identical, and synced to this project's docs. `.gitignore`
was checked and already matches (no change needed this round). NONE of this
has run against the real Neo4j Aura instance or real NSE data yet — same next
step as every prior build on this project: user commits + pushes via GitHub
Desktop, then runs the Daily Swing Pipeline workflow. Specifically still
unverified live: (a) how many of the 85 curated structural edges actually match
real tickers in the live Nifty 750 universe (the `requested`/`written` log line
will show this on the first real run); (b) whether real bridge stocks and
2-hop candidates look sane/useful against the real correlation+structural graph
rather than small synthetic test graphs; (c) whether real community drift
alerts are a useful signal or too noisy — no real day-over-day snapshot
comparison has happened yet since this is the feature's first run.

**Deferred, not started**: institution nodes from bulk-deal data ("smart money
clustering") and portfolio/watchlist concentration checks — the two remaining
items from the original 7-item recommendation list, explicitly scoped as a
Batch 2 follow-up. MacroFactor wiring remains deferred per the user's explicit
choice, pending either a live external data source or a future request to
research one.

## Pipeline sequencing (recommended order per trading day)
1. Ingest daily_eod.csv -> compute_market_breadth() -> gate: proceed only if not RISK_OFF
2. compute_rs_ranking() -> filter universe to RS_Rating >= ~70 before pattern screening
3. compute_technical_signals() -> breakout/pullback/RSI/volume signals per ticker
   (runs every day, independent of Neo4j reachability)
4. run_pipeline.py's Neo4j block (runs every day the pipeline runs): refresh
   CORRELATED_WITH edges -> refresh hub_score/community_id -> aggregate sector
   rotation -> compute_swing_score() (the composite rank) -> find_contagion_candidates()
   fed today's real breakout list (leader-laggard)
5. Swing_Score top tiers (A+/A) are the primary daily shortlist; Watchlist/Early
   setup for monitoring
6. Cross-check candidates against bulk_deal_signals.csv (INSTITUTIONAL_ACCUMULATION)
   and oi_signals.csv (screen_high_conviction_longs) for confirmation
7. Only then: position sizing / stop-loss / target math under the 2% capital risk rule

## Open decisions / not yet built
- Exact position-sizing and stop-loss formula module (2% capital risk rule) — pending
- Earnings calendar / corporate action gating — discussed, not yet coded
- FII/DII flow thresholds (±5000 Cr) are placeholders — need calibration against
  actual historical flow magnitude distribution, AND the fetch itself is not yet
  working (see "Live market-data fetch layer" -> "Open item" above) — no real flow
  data has accumulated yet.
- Catalyst/news pillar (NSE corporate announcements, source chosen but not built)
  — Swing_Score currently runs on six of seven pillars, rescaled — see "Swing
  Score engine" -> "Still not built" above.
- Supply-chain / parent-subsidiary relationship curation (SUPPLIES_TO, PARENT_OF,
  SUBSIDIARY_OF) — no free NSE bulk source; needs manual curation for a starter set
  of major conglomerates, OR deprioritize now that correlation_edges.py provides a
  data-driven proxy for much of the same signal for free.
- Promoter/corporate-group edges and expanded MacroFactor edges — see "Swing Score
  engine" -> "Still not built" above.
- Live market-data fetch layer is verified live end-to-end for 3 of 4 feeds (EOD,
  bulk deals, derivatives); FII/DII is the one remaining gap.
- Dashboard redesign + graph insights (correlation edges, sector rotation) are
  CONFIRMED LIVE end-to-end in `dashboard_data.json`'s content, but as of the
  GraphAlpha rebuild the deployed UI no longer reads that file at all — see
  "GraphAlpha visual redesign" above. The Swing Score engine (technical signals,
  composite ranking, leader-laggard) is built, tested, and pushed to the device,
  but NOT yet committed/pushed to GitHub or run against the real Neo4j/NSE stack
  — see "Swing Score engine" -> "Verification status" above.
- GraphAlpha is visually complete and pushed to the device, and has now been
  wired to real data (see "GraphAlpha real-data wiring" above) — also pushed to
  the device and md5-verified, but NOT yet committed/pushed to GitHub or run
  against the real Neo4j/NSE stack. Until the user commits+pushes and re-runs
  the Daily Swing Pipeline workflow, the live site keeps showing 100% mock data
  under the "Demo data" badge exactly as before.
- Graph-insights Batch 1 (curated structural edges, bridge-stock detection,
  2-hop leader-laggard, community drift) is built, unit/integration-tested, and
  Playwright-verified across 3 UI scenarios — see "Graph-insights Batch 1"
  above — pushed to the device and md5-verified, synced to project docs, but
  same as everything else on this list: NOT yet committed/pushed to GitHub or
  run against the real Neo4j/NSE stack. Batch 2 (institution nodes from bulk
  deals, watchlist concentration check) is explicitly deferred as a follow-up
  pass per the user's chosen build strategy; MacroFactor wiring remains
  deferred pending a live external data source.
