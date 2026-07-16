# Changelog

All notable changes to India Shares Tracker.

## [3.0.0] — 2026-07-16 · Mutual Funds

- New **Mutual Funds** tab (Cloudflare site only): track your actual mutual fund folio alongside the equity tools
- Add holdings via a fund-house → scheme cascading picker (~40 curated AMCs, everything else lands under "Other fund houses") or free-text search across the full AMFI-registered scheme list; folio (units, invested amount, invested date) stays in the browser only, never sent anywhere but the AMFI NAV lookup itself
- Two new edge functions: `/api/mf/schemes` (full scheme list from AMFI's daily file via mfapi.in, tagged with fund house, cached 24h) and `/api/mf/nav/:code` (latest NAV + AMFI scheme category for one scheme, cached ~6h)
- Holdings table: plan, units, invested ₹, live NAV, current value, gain/loss (₹ and %), weight — plus summary cards for total invested/current value/gain-loss
- Asset allocation panel: each holding bucketed into Equity/Debt/Gold/Hybrid/Other from AMFI's own scheme category (falling back to a name-based guess for index/gold/FoF schemes AMFI files under "Other Scheme"); pick a Growth/Balanced/Conservative preset or set a custom target mix; current-vs-target table with buy/sell ₹ actions to close the gap
- Rebalancing recommendations: flags Regular-plan holdings and finds their Direct-plan twin (lower expense ratio, same portfolio) via a normalized-name index; flags multiple funds held in the same category as overlap risk; calls out the single biggest allocation drift versus target
- Bumped major version to 3.0.0 for this first non-equity asset class in the tracker

## [2.29.0] — 2026-07-15 · Global Markets Upgrade

- Seven more global instruments: Dow Jones, DAX, Shanghai Composite, KOSPI, Dollar Index (the FII-flow driver), Silver, Bitcoin (risk-appetite gauge) — 17 cards total
- Timeframe selector for the global section: 1 day / 1 week / 1 month / 3 months change
- Every card now prints its own "as of" quote date, so closed-market staleness is visible instead of ambiguous

## [2.28.2] — 2026-07-15

- FII/DII staleness fixes: the tab now auto-refetches when reopened after 15+ minutes (was once per page-load); added a "↻ Refresh flows & deals" button that busts the edge cache; the server function detects when NSE serves stale payloads to cookie-less clients (>5 days old) and retries with a fresh cookie handshake, keeping whichever response is fresher; edge cache lowered to 15 min. Note kept in UI: NSE publishes provisional figures ~6pm IST

## [2.28.1] — 2026-07-15

- News fix (all RSS feeds were blocked from Cloudflare's IPs): primary source is now Yahoo Finance's news-search API on query1.finance.yahoo.com — the same host that already serves the chart proxy — with GDELT as second source and Bing/Google RSS as last resorts

## [2.28.0] — 2026-07-15 · Delivery % + Money-Flow Signals

- FII/DII tab: new **Delivery %** section from NSE's daily bhavdata — the share of volume actually delivered to demat vs squared off intraday. Reads per stock: GENUINE ACCUMULATION (≥60% delivery + price up), GENUINE SELLING (≥60% + down), HIGH CONVICTION FLAT, SPECULATIVE CHURN (≤30% delivery on a big move). Universe filter, top-20 by delivery, links to chart/fundamentals. New `/api/delivery` function with 7-day walk-back and 6-hour cache
- Scanner: four **money-flow signals** — QUIET ACCUMULATION / QUIET DISTRIBUTION (price flat over a month while on-balance volume climbs/drains — the classic absorption footprint) and MONEY FLOW IN/OUT (Chaikin money flow ±0.15). All feed the screener filter, Setup Score (participation bucket reworked; bearish flow now penalises) and conviction confirmations

## [2.27.2] — 2026-07-15

- Charts, Fundamentals and Backtest now show BOTH a browsable dropdown (all ~750 shares grouped by universe) and the type-to-search box — matching the Smart Money/Options pattern. The search-only inputs weren't discoverable as searchable

## [2.27.1] — 2026-07-14

- Fixed "News unavailable: news feed 503": Google News rejects Cloudflare's datacenter IPs at times. `/api/news` now tries three feeds in order — Yahoo Finance per-symbol RSS, Bing News RSS, then Google News — using the first that returns items, and reports which one served

## [2.27.0] — 2026-07-14 · Fresh Block Scanner

- Smart Money tab: new **fresh block scanner** — sweeps any universe (up to all ~750) for order blocks whose break-of-structure fired within the last 7 days and are still unmitigated. Table sorted nearest-to-zone first with zone range, current price, distance to zone (AT ZONE highlighted), move size and BOS date; row click opens the full Smart Money view, 📈 opens the chart
- Clearer in-app explanation of "mitigated": a block is mitigated once price trades back into its zone — the pending-interest idea has been "used up" and the level loses its edge

## [2.26.0] — 2026-07-14 · Search Everywhere + Cleanup

- Removed the Playbook tab (its market-gate logic lives on in the Brief tab)
- Smart Money and Options tabs: search box next to the dropdown — type any of the ~750 shares by symbol or name
- Backtest: "…or backtest one share" search box — runs the full simulation on a single stock instead of a universe
- Ideas rows gained two more one-click buttons: 🧠 Smart Money (order blocks + volume profile) and 🎯 Options (chain + flow), joining 📐 📊 📈 — every angle on a candidate is now one click from its idea row

## [2.25.0] — 2026-07-14 · AI News Briefs

- Fundamentals tab: new **News & AI brief** section (between the verdict panel and the metric cards) — recent headlines for the stock from Google News, with an AI-generated neutral summary, bull case, bear case, sentiment (−5…+5) and watch-items
- Runs on Cloudflare Workers AI (llama-3.1-8b, free daily quota — no external API key). One-time setup: add a **Workers AI binding named `AI`** to the Pages project (Settings → Bindings); until then, headlines still display with setup instructions shown in place of the AI brief
- New `/api/news` function: Google News RSS parse + AI synthesis, 30-min edge cache; the model is instructed to use headlines only and never invent facts — and the UI says so

## [2.24.0] — 2026-07-14 · Microcap 250 + Searchable Dropdowns

- Added the **Nifty Microcap 250** tier from NSE's official list (ranks ~501–750: Pricol, Relaxo, GNFC, Happiest Minds, Praj, MOIL…) — 250 real entries (NSE's own "Dummy" placeholder excluded). Universe now spans ~750 stocks with a MICRO cap tag, full sector mapping for peer comparison, and its own option in the screener and backtest universe pickers
- Stock dropdowns (watchlist add, Charts, Fundamentals) are now **searchable comboboxes** — type any part of a symbol or company name and pick from suggestions, across all ~750 shares
- Honest caveat: microcaps have patchier Yahoo fundamentals, thinner liquidity (technical signals less reliable), and "ALL" scans now make ~750 requests

## [2.23.0] — 2026-07-14 · Consolidated Verdict

- Fundamentals tab now opens with a **consolidated verdict panel** — one view answering both questions for the selected stock:
  - **Short-term trade (1–4 wks)**: live technical scan of the stock (trend, signals for/against, RSI) with a setup score and label (STRONG SETUP / DECENT / WEAK / NO SETUP / AVOID LONGS if below SMA200)
  - **Investment (1+ yr)**: composite score from Quality (40%), Value-Trap risk (20%) and valuation (40%, margin-of-safety based), with implied-vs-delivered growth and the analyst target gap
  - **Bottom line**: a matrix verdict combining both clocks — from "rare alignment, buy and trade" through "trade only, rent with a stop" and "invest on dips, no entry yet" to "avoid"
- Details for every input remain in the sections below the panel

## [2.22.0] — 2026-07-13 · Smart Money Tab + Modern Background

- New **Smart Money** tab: detects institutional-style order blocks (Smart Money Concepts / ICT method) on NIFTY, BANKNIFTY and liquid F&O stocks — the last opposing candle before a break-of-structure move, marked fresh or mitigated once price retests the zone
- Combines order blocks with a volume profile of the same window (Point of Control, 70% Value Area, volume-at-price ladder) into a **volume confirmation ratio** per block: how much of the window's volume actually traded inside that price zone versus what its width alone would predict — >1.5x means the level is volume-backed, <0.8x means it's a thin "air pocket" the price likely moves through fast. This is the retail edge the tab targets: order-flow footprints large players tend to leave and defend, inferred from public OHLCV since raw institutional order data isn't publicly available
- Chart overlays fresh order block zones as dashed price lines alongside POC/Value Area lines; a summary table lists every detected block with zone, status, confirmation ratio and distance from spot
- Order block detection, volume profile binning, and the confirmation ratio verified against hand-built synthetic price data with unambiguous structure (9 checks passed); render pipeline separately smoke-tested end-to-end against a mocked DOM/chart library to confirm no runtime errors
- Replaced the candlestick-watermark background from 2.21.0 with a modern mesh-gradient (multi-blob radial gradients) plus a subtle grain texture overlay — purely decorative, no functional change

## [2.21.0] — 2026-07-13 · Tab Cleanup + Background Art

- Removed the **Value Screener** and **Portfolio** tabs and all their dedicated code (fundamental filter builder, saved screens, CSV import/export, P&L and allocation analysis) — cleaned up every reference: nav, keyboard-shortcut tab order, the init routine that was populating a portfolio-add dropdown, and the Playbook's weekly "Portfolio health" checklist item (removed, since its underlying tool is gone)
- Existing `localStorage` data from these tabs (`ist_portfolio`, `ist_screens`) is left in place but now unused — harmless, no migration needed
- Added subtle background art: a faint dot-grid texture across the page and a low-opacity candlestick/line-chart watermark fixed to the bottom-right corner (hidden on mobile), layered behind the existing ambient gradient glow — decorative only, doesn't affect any data or interaction

## [2.20.0] — 2026-07-13 · Morning Brief Tab

- New **Brief** tab: one page combining the market gate (breadth + FII/DII combined into a GREEN/AMBER/RED read with sizing guidance), an options-edge summary (top long-flow names, IV-rich and IV-cheap shortlists from the two Options-tab scanners), and today's top technical BUY setups (score ≥60) — the exact checks the Playbook's daily "market gate" step already asked for, now automated instead of manual
- Gate falls back to a breadth-only read when FII/DII hasn't published yet (normal before ~6pm IST) instead of blocking on it
- Reuses scans already run elsewhere in the session (Options momentum scanner, IV vs RV screener, FII/DII) instead of re-fetching; a manual refresh button forces all of them fresh
- Playbook's "Market gate" checklist step now links to the Brief tab instead of Dashboard
- Fixed a display bug where a negative FII/DII net would show with no minus sign in plain (non-color-coded) text

## [2.19.0] — 2026-07-13 · IV vs Realized Volatility Screener

- New **IV vs realized volatility** scanner on the Options tab: scans the same ~30 liquid F&O names as the momentum scanner and ranks them by live ATM implied volatility against their own realized volatility (annualized close-to-close, 20d and 60d)
- IV/RV ≥1.3x flagged as rich (favor selling premium — credit spreads, strangles); ≤0.8x flagged as cheap (favor buying — long straddle/strangle); a relative read, not a directional or timing signal
- Realized-vol math (log-return stdev × √252) verified against a synthetic price series with known volatility — recovered the expected annualized figure within sampling noise

## [2.18.0] — 2026-07-13 · More Strategies + Live 1-Lot Risk Profile

- Strategy recommendations expanded from 3 to 8: short strangle, iron condor (new, defined-risk version of the strangle), bear call spread, bull put spread, bull call spread (new, mirrors bear put via a new rally-probability function), bear put spread, plus explicit short/long ATM straddle callouts
- New **Risk profile — 1 lot, live premiums** panel: fetches the live NSE option chain for the selected symbol at the matching weekly/monthly expiry (auto-picks the true monthly contract from NSE's undifferentiated expiry list) and computes real max profit, max loss and breakeven in ₹ for one lot of each strategy, using each strategy's Balanced/Moderate tier strikes snapped to actual listed strikes
- Added an NSE F&O lot-size table (NIFTY, BANKNIFTY, and the 28 stocks) so the risk profile can convert points into ₹; loads asynchronously after the historical tables so a slow/failed chain fetch never blocks the rest of the panel
- Payoff formulas (credit/debit spread max profit & loss, straddle breakevens, iron condor worst-wing loss) verified against a synthetic option chain with 16 sanity checks

## [2.17.0] — 2026-07-13 · F&O Stocks + Strategy Recommendations

- Options spread probability panel now covers the ~30 most liquid F&O stocks (same list as the Options momentum scanner), not just NIFTY/BANKNIFTY — monthly windows only, since Indian stock options don't have weekly expiries; the symbol picker auto-switches off Weekly when a stock is selected
- New **Strategy recommendations** block under the hit-rate table: at three probability tiers (Conservative ~85%, Balanced ~70%, Aggressive ~55%), shows implied strikes for a short straddle/strangle, bear call spread, and bull put spread; a separate table sizes a bear put spread (Shallow/Moderate/Sharp decline tiers) since directional bets read the odds in the opposite direction from range strategies
- App version display was stuck on 2.15.0 despite two feature releases — now correctly shows the current version

## [2.16.0] — 2026-07-13 · Options Spread Probability

- New **Options spread probability** panel on the Backtest tab: for NIFTY and BANKNIFTY, measures how far the index actually moved between past weekly (~5 trading day) and monthly (~21 trading day) windows using existing price history, and turns that into a historical "closed inside the range" hit rate for a spread width you pick
- Since NSE index options are cash-settled on the closing level, this maps to probability of profit for credit spreads/iron condors (ignoring premium and costs) without needing NSE's paywalled historical option-premium data
- Table of standard widths (±0.5% to ±15% of spot) showing short strikes, "inside both" (condor/strangle), "call side safe" (bear call), "put side safe" (bull put) hit rates, plus a custom-width calculator and avg/median/std-dev/percentile move-size summary cards
- Weekly/monthly are trading-day proxies rather than exact calendar expiry days, since NSE has changed the actual expiry weekday over time (NIFTY weekly moved Thu→Tue Sep 2025; BankNifty weekly discontinued Nov 2024, monthly-only now — shown here in weekly form too for comparison)

## [2.15.0] — 2026-07-10 · Playbook

- New **Playbook** tab: the daily discipline checklist — market gate → shortlist (score ≥60 + decision briefs) → options-flow confirmation → business check for investments → 1%-risk sizing → write the plan. Checkboxes persist per trading day; each step links to its tab; the gate shows a live breadth read from the latest scan
- Weekly maintenance list (portfolio health, backtest revalidation, institutional context) tracked per calendar week
- "Rules that save you" card: the five failure modes and their antidotes

## [2.14.0] — 2026-07-10 · Visual Refresh

- New look: Inter typeface, deep-navy palette with a blue→violet gradient identity (logo, nav pills, section markers), ambient background glow
- Cards get gradients, rounded corners and hover lift; tables get sticky headers, rounded frames and smooth row hovers
- Primary buttons get a green gradient with press feedback; inputs get proper focus rings; custom slim scrollbars
- Tabs fade in; loading states pulse; chart canvases recolored to match the theme
- Pure CSS/theme layer — zero logic changes

## [2.13.0] — 2026-07-10 · Options Momentum Scanner

- New scanner on the Options tab: scores ~30 liquid F&O names 0–100 on bullish options-flow positioning — PCR (20), today's put-vs-call writing skew (20), put-wall proximity below spot (15), headroom to the call wall (15), spot above max pain (10), call unwinding overhead (20)
- ≥65 = LONG FLOW with a ready-made trade structure (entry ~spot, stop below the put wall, target at the call wall); ≤35 = BEARISH FLOW; else MIXED
- Row click opens the full chain for that symbol; results include plain-language reads of the flow

## [2.12.2] — 2026-07-10

- Fixed Options tab ("NSE 404"): NSE retired the old option-chain endpoints; the proxy now uses the v3 API — expiry list via contract-info first, then the chain for the chosen expiry (past expiries filtered out)

## [2.12.1] — 2026-07-10

- Chart API edge cache raised from 5 to 15 minutes (daily candles change once a day) — cuts repeat-scan traffic to Yahoo roughly 3x and lifts the CDN cache-hit rate

## [2.12.0] — 2026-07-10 · Options & F&O Trend Analysis

- New **Options** tab (shortcut `0`): NSE option chain for NIFTY/BANKNIFTY/FINNIFTY/MIDCPNIFTY and any F&O stock, with expiry selector
- Summary cards: spot, put-call ratio with writer read, max pain with spot gap, strongest put wall (support), strongest call wall (resistance), ATM IV (call/put)
- Trend-read engine: PCR interpretation, OI-implied expiry range, max-pain drift, fresh-OI skew (put vs call writing today), and IV fear-skew detection
- Open-interest ladder: put/call OI bars per strike around ATM, with ATM and max-pain markers
- "Biggest OI changes today" table with plain-language reads (put writing = support building, call unwinding = ceiling lifting, etc.)
- New `/api/optionchain` proxy: trims NSE's ~1MB chain response to the chosen expiry (~30KB), 5-min edge cache

## [2.11.0] — 2026-07-09

- FII/DII activity and bulk & block deals moved from the dashboard into a dedicated **FII/DII** tab (shortcut `9`); data loads on first open. Dashboard is leaner
- Mobile fix (found by rendering the live site at 390px): the deals and backtest-results tables caused page-level horizontal scroll — both now scroll within their own containers like every other wide table

## [2.10.1] — 2026-07-09

- Added Cloudflare Web Analytics beacon (privacy-friendly, no cookies)

## [2.10.0] — 2026-07-09 · Bulk & Block Deals

- Dashboard shows NSE's disclosed bulk deals (>0.5% of equity by one client) and block deals (negotiated window trades): institution/client name, BUY/SELL, quantity, weighted average price, deal value in ₹ Cr
- Top 15 by value, optional filter to Nifty-500 universe stocks; universe stocks click through to their chart
- New `/api/largedeals` proxy (same NSE cookie-bootstrap pattern, 30-min edge cache)

## [2.9.0] — 2026-07-09 · FII / DII Activity

- Dashboard now shows NSE's provisional FII/FPI and DII cash-market activity for the latest trading day: net position (₹ Cr, green/red), buy/sell breakdown, and a one-line read of the flow combination (both buying / both selling / FII-selling-DII-absorbing / FII-led)
- New serverless proxy `/api/fiidii` with NSE cookie bootstrap fallback and 30-min edge caching; graceful message when NSE withholds data (published ~6pm IST on trading days)
- v2.8.2: added "Jump to decision briefs" button on the Ideas tab

## [2.8.1] — 2026-07-09

- Decision-brief threshold lowered from score 70+ to 60+ (still top 5 by score)

## [2.8.0] — 2026-07-09 · Decision Briefs

- Ideas tab auto-generates **decision briefs** for short-term BUY ideas scoring 70+ (top 5): a trade view (trigger, levels, sizing rule) cross-checked against an invest view (fair value + margin of safety, reverse-DCF implied growth vs delivered sales/earnings growth, analyst stance and target-vs-price gap, Quality and Value-Trap scores)
- Rule-based verdict per idea: TRADE + INVESTABLE / INVESTMENT DEFENSIBLE / TRADE FIRST / TRADE WITH DISCIPLINE / TRADING ONLY — with automatic caveats (analyst target below price, cyclical earnings distortion, value-trap markers)

## [2.7.0] — 2026-07-09 · Backtest Analytics

- "By signal type" expanded from 6 to 13 columns: trades, win rate, timed-out %, average realised return (closed trades), average outcome across all trades (closed + at-max-hold — closest to true per-trade expectancy), averages at 1W/2W/1M/3M, median 1M (outlier-resistant), best and worst 1M
- Click any signal row to filter the simulated-trades list to that signal (click again or "clear ✕" to reset)
- Removed the paper-trades section; the tab is now simply "Backtest"

## [2.6.0] — 2026-07-09 · More Backtest Signals

- Six more backtestable triggers (13 total): golden cross, fresh 52-week high, Bollinger-squeeze breakout, double bottom (first close above neckline), bullish RSI divergence, hammer reversal candle
- New "Above SMA200 only" toggle (default on) — turn it off to test reversal setups, which naturally occur below the 200-day average and were previously excluded silently
- Two new templates: 52-week-high momentum (new highs + squeeze breaks, volume confirmed) and Reversal hunter (double bottoms + divergences + hammers, SMA200 filter off)
- Hammer reversal added to the live scanner and Ideas engine too (screener signal, buy trigger, setup-score weight)
- Breakout-family stops (breakout/squeeze/new-high) anchor just under the broken level

## [2.5.0] — 2026-07-09 · Configurable Backtesting

- Backtest is now fully configurable: pick any combination of 7 triggers (added volume dry-up), require confirmations (trend alignment, ADX>25 with +DI leading, volume ≥1.5x, beating NIFTY by 8pts/3mo), and tune exits (stop 1–2.5 ATR, target 1.5–3R, max hold 1–3 months)
- Seven strategy templates: Momentum breakout, Gap & go, Quiet dip buyer, Mean reversion (tight stops), Trend rider, Leaders only (relative-strength filter), Everything (baseline)
- Results header echoes the exact configuration tested, so screenshots are self-documenting

## [2.4.0] — 2026-07-09 · Setup Score

- Every idea now carries a **Setup Score (0–100)**: trigger quality (25) + trend context (25) + momentum strength (20) + participation (15) + entry risk (15), minus 8 per bearish co-signal. Color-coded, sorted by score, conviction stars in the tooltip
- Applies across short/medium/long ideas (EXIT/AVOID/CAUTION rows get no score); explicitly framed as setup quality, not win probability
- Paper trades record the score at entry and display it in Track Record — over time you can verify whether high-score setups actually win more

## [2.3.0] — 2026-07-09 · Confirmation Signals + Conviction

- Seven new scan signals: ADX trend strength (+DI/−DI direction), full MA alignment (price > SMA20 > SMA50 > SMA200), fresh 52-week-high close, volume dry-up pullback to SMA50, accumulation (13+ up-days of 20), short-term overextension (>3 ATR above SMA20), and double-bottom detection with neckline-break confirmation
- Ideas now carry a **conviction rating (★1–5)**: the trigger plus independent confirmations (trend alignment, ADX, volume, relative strength, new high, accumulation); overextension subtracts. Short-term list sorts by conviction
- Overextended setups become WAIT instead of BUY ("don't chase"); quiet volume-dry-up pullbacks added as buy triggers; confirmed double bottoms added to medium-term buys
- The "why" text now names its confirmations

## [2.2.1] — 2026-07-09

- Backtest trades are now sorted chronologically (they were grouped by stock); the trades table shows newest first, ties ordered by symbol. Paper-trades table likewise date-ordered

## [2.2.0] — 2026-07-08 · Track Record

- New **Track Record** tab (shortcut `8`) with two halves:
- **Paper trades**: every fresh scan auto-records that day's short-term BUY ideas (one per stock per day, browser-stored). Status tracked against real highs/lows — TARGET or STOP (whichever touches first; same-day tie counts as stop), with P&L and held-returns after 1W/2W/1M/3M
- **Backtest**: replays the exact Ideas-engine buy rules (breakout, MACD cross, gap-up, pullback dip, RSI oversold, BB touch — SMA200-filtered, same stop/target math, 10-session cooldown) over 3/6/12 months of history per universe. Reports win rate, average returns per horizon vs NIFTY on the same dates, per-signal-type performance, and the trade list
- Honest-caveats footer: no slippage/costs, survivorship bias, close-price fills

## [2.1.0] — 2026-07-08

- Added NIFTY Next 50 universe (ranks 51–100: DMart, Pidilite, Siemens, HAL, Divi's, TVS Motor…) from the official NSE list — the app now covers the full Nifty 500
- Next 50 appears in both screeners' universe pickers, search, charts, fundamentals and ideas; tagged LARGE cap; sector groups updated for peer comparison

## [2.0.0] — 2026-07-08 · Portfolio Analyzer + UX

- New **Portfolio** tab: upload a CSV (`symbol, quantity, avg_price` — flexible separators, .NS optional) or add holdings manually; everything stays in the browser
- Live holdings table: LTP, value, P&L (₹ and %), day change, weight; summary cards for invested/current/total P&L/today/estimated annual dividend/portfolio beta
- Sector and cap-tier allocation bars; 1-year risk panel: portfolio return (today's weights) vs NIFTY, annualised volatility, max drawdown, largest-holding concentration
- Observations engine: flags sector >35%, single stock >20%, beta >1.2 or <0.8, small-cap >40%, P/E >50 holdings, under-diversification, and index underperformance
- Global search in the header (press `/`): type symbol or company name, Enter opens the chart, 📊 jumps to fundamentals
- Keyboard shortcuts: `1–7` switch tabs, `/` search, `?` help overlay, `Esc` closes

## [1.9.1] — 2026-07-08

- Mobile layout fixes: swipeable tab bar (no more overflow), all wide tables scroll horizontally inside the page instead of breaking it, tighter cards/inputs/badges, sector bars capped to screen width, smaller chart height on phones

## [1.9.0] — 2026-07-08 · Valuation Engine + Scores

- Intrinsic value on the Fundamentals tab: 10-year two-stage DCF (FCF-based, EPS fallback), Benjamin Graham formula, dividend discount model, earnings power value — with adjustable growth/discount/terminal assumptions
- Summary cards: fair value (median of methods) with range, margin of safety %, upside %, and reverse-DCF market-implied growth vs your assumption
- Five scores (0–100, click for component breakdown): Value Score (spec weighting: valuation/quality/growth/cash flow/balance sheet/management/institutional/moat), Quality Score, Multibagger Probability, Value-Trap Risk (inverted — high is dangerous), Dividend Quality
- Missing data excluded from scores (normalized over known components) rather than guessed; proxies labelled (ROA for management, gross margin for moat)

## [1.8.0] — 2026-07-08 · Value Screener

- New **Value Screener** tab: 24 fundamental filters (market cap, EV, P/E, forward P/E, PEG, P/B, P/S, EV/EBITDA, dividend yield, ROE, ROA, gross/operating/net margins, D/E, current/quick ratio, OCF, FCF, sales/profit growth, beta, % from 52-week high) with unlimited AND combinations, plus sector and universe filters
- Presets: Quality compounders, Deep value, Dividend champs, GARP
- Saved screens (named, stored in browser) and CSV export of results
- Sortable result columns; rows link to Fundamentals (click) and Charts (📈)
- Fundamentals API extended with the new fields; browser cache versioned so old entries refresh
- Ideas rows: added 📈 full-chart button next to the 📊 fundamentals button

## [1.7.0] — 2026-07-08 · Dashboard Pro

- Global markets & macro cards: S&P 500, NASDAQ, Nikkei, Hang Seng, FTSE, Gold, Brent Crude, USD/INR, India VIX, US 10-year yield
- Market pulse (from the latest scan): advance/decline breadth bar with risk-on/risk-off read, % of stocks above SMA200, top gainers/losers, most active by turnover, sector performance bars (average day move per NSE sector)
- Top opportunities today: the Ideas engine's best current BUY setups surfaced on the dashboard with entry/stop/target
- Version badge moved into the header

## [1.6.0] — 2026-07-08

- Ideas: click any idea row to expand an inline 6-month chart with SMA20/50 and the idea's entry/stop/target drawn as dashed price lines — no tab switch needed ("open full chart ↗" link included)
- Market-cap tier badges (LARGE / MID / SMALL, from index membership) on every idea row and the Fundamentals header

## [1.5.1] — 2026-07-08

- Fixed: charts tab failed with "LightweightCharts is not defined" — the CDN script URL pointed to a non-existent `.min.js` file. Now loads the canonical `lightweight-charts.standalone.production.js` from jsDelivr, with automatic fallback to unpkg if the primary CDN is unreachable

## [1.5.0] — 2026-07-08

- Ideas tab: every idea row now has a 📊 link straight to that stock's Fundamentals
- Peer comparison on the Fundamentals tab: the stock's P/E, P/B, ROE, profit margin, revenue growth, dividend yield and debt/equity vs the median of its industry group (20 sectors mapped from NSE classification, up to 15 peers), with better/in-line/worse badges per metric and an overall STRONGER / IN LINE / WEAKER verdict
- Fundamentals responses cached in the browser for 1 hour, so peer scans are fast on repeat visits

## [1.4.0] — 2026-07-08

- Seven new scan signals: 20-day range breakout/breakdown (with volume confirmation), Bollinger band squeeze (6-month tights), bullish/bearish RSI divergence, gap up/down ≥3%, three-day pullback dip in uptrend, 3-month relative strength vs NIFTY
- Screener: filter by specific signal type; sort by signals, % change, RSI, distance to 52-week high, or 3-month momentum
- Ideas engine upgraded: breakout buys with structure-based stops, gap plays, divergence caution/speculative flags, EXIT/AVOID on breakdowns, squeeze WATCH setups with trigger-entry above the range, relative-strength leaders in the long-term bucket

## [1.3.0] — 2026-07-08

- New **Ideas** tab: rule-based trade candidates from the latest scan, split by horizon:
  - Short term (1–4 weeks): MACD bullish crossovers or oversold dips, filtered to stocks above SMA200; "book profits" flags for stretched names (RSI > 75 at upper Bollinger band)
  - Medium term (1–6 months): fresh golden crosses and pullbacks to SMA50 in uptrends; "avoid" flags on death crosses
  - Long term (6+ months): stage-2 uptrends (rising SMA200, near 52-week highs) for accumulation
- Each idea shows the reasoning, ATR-based entry/stop-loss/target and risk:reward ratio
- Position size & margin calculator: capital + risk % + leverage → quantity, exposure, margin needed, max loss

## [1.2.0] — 2026-07-08

- Added favicon (candlestick icon, SVG + ICO) to both versions
- Version number now shown in the page footer (and on hover over the title)
- Added this changelog

## [1.1.0] — 2026-07-08

- Expanded universe from NIFTY 50 to 450 stocks: NIFTY 50 + Midcap 150 + Smallcap 250 (`site/universe.js`, from official NSE constituent lists)
- Screener universe picker: scan one index or all 450; results cached 10 minutes per universe
- Stock dropdowns grouped by index and alphabetized
- Refreshed NIFTY 50 constituents (TMPV replaces TATAMOTORS; INDIGO, MAXHEALTH in; HEROMOTOCO, INDUSINDBK moved to midcap)
- Index cards: added NIFTY Midcap 50 and Smallcap 100
- Cloudflare Pages version: serverless Yahoo Finance proxies (`site/functions/`), indicators and screener computed in browser, watchlist in localStorage

## [1.0.0] — 2026-07-08

- Initial release: FastAPI + yfinance local app
- Dashboard (indices + SQLite watchlist), NIFTY 50 screener (RSI, golden/death cross, MACD, 52-week levels, volume spikes, Bollinger), candlestick charts with SMA/BB/RSI/MACD panels, fundamentals view

---

**Versioning how-to:** when you make changes, bump `APP_VERSION` in `site/universe.js`, add a section here, then commit in GitHub Desktop with the version in the message (e.g. `v1.3.0: added price alerts`). Optionally tag releases: Repository menu → "Create tag" (or `git tag v1.3.0` + push tags) so each version is findable on GitHub.
