# Changelog

All notable changes to India Shares Tracker.

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
