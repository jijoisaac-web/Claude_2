# Changelog

All notable changes to India Shares Tracker.

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
