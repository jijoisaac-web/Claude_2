# India Shares Tracker

Full-stack web app to track NSE/BSE shares and spot trading/investing opportunities.

## Run (Windows)

Double-click **run.bat** — it creates a virtual environment, installs dependencies, starts the server, and opens http://127.0.0.1:8000 in your browser.

Or manually:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --port 8000
```

Requires Python 3.10+ and internet access (data comes from Yahoo Finance, ~15 min delayed).

## Features

**Dashboard** — live cards for NIFTY 50, NIFTY Bank, Sensex, NIFTY IT, plus a personal watchlist (add/remove any NIFTY 50 stock; stored in SQLite so it persists).

**Screener** — scans a chosen universe (NIFTY 50, Midcap 150, Smallcap 250, or all ~450 stocks) and flags opportunities: RSI oversold/overbought, golden/death cross (SMA50 vs SMA200), MACD crossovers, near 52-week high/low, volume spikes (2x+ average), Bollinger band touches. Filter by bullish/bearish. Results cached 10 minutes per universe. Constituent lists come from official NSE archives (July 2026); the Cloudflare version (`site/universe.js`) covers all three indices, while the local Python version scans NIFTY 50.

**Charts** — candlestick charts (1M–5Y) with volume, SMA 20/50/200, Bollinger Bands, and synced RSI + MACD panels. Click any stock row anywhere to jump to its chart.

**Fundamentals** — P/E, P/B, EPS, market cap, ROE, debt/equity, margins, growth, dividend yield, beta, 52-week range, analyst consensus and target price — plus intrinsic value (DCF, Graham, DDM, EPV with margin of safety and reverse DCF), five composite scores (Value, Quality, Multibagger, Value-Trap, Dividend), and peer comparison vs the industry median.

**Backtest** — replays the Ideas engine's buy signals on history, plus an options spread probability panel: historical weekly/monthly move distribution for NIFTY and BANKNIFTY turned into a hit-rate table (and custom-width calculator) for sizing credit spreads and iron condors.

**Ideas** — rule-based trade candidates by horizon (short/medium/long) with entry/stop/target, inline chart previews, and a position-size calculator.

**Conviction Scan** (Cloudflare site only) — one button that cross-references four independent footprints and shows only stocks clearing all of them: technical setup (Screener's bullish signals), money-flow (OBV/Chaikin, from that same scan), delivery-based accumulation (NSE bhavdata), and business quality (Fundamentals Quality Score ≥60, checked only on the shortlist that already cleared the first three gates). Ranked by footprint count; deliberately short, often empty.

**Mutual Funds** (Cloudflare site only) — track your actual mutual fund folio: add holdings via a fund-house → scheme picker or free-text search over the full AMFI-registered scheme list, live NAVs from AMFI (via mfapi.in), holdings table with value/gain-loss/weight/CAGR (from an optional invested date) plus a folio-level XIRR card, asset-allocation (Equity/Debt/Gold/Hybrid) and market-cap tilt (Large/Mid/Small, within equity) each vs a target mix with buy/sell ₹ actions, and rebalancing flags: Regular→Direct plan cost savings, same-category overlap, and biggest asset-class/cap drift. Folio stays in the browser only (`localStorage`).

**UX** — global search (`/`), keyboard shortcuts (`?` for help), mobile-friendly layout. The Cloudflare version (`site/`) is the full-featured one; the local Python app is a simpler subset.

## Structure

```
backend/
  main.py        FastAPI app + API routes
  market.py      Yahoo Finance data layer with caching
  indicators.py  RSI, MACD, SMA/EMA, Bollinger calculations + screener signals
  database.py    SQLite watchlist
  universe.py    NIFTY 50 + index symbols
frontend/
  index.html     Single-page UI (lightweight-charts via CDN)
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/indices` | Index quotes |
| `GET /api/watchlist` | Watchlist quotes |
| `POST /api/watchlist/{symbol}` | Add symbol (e.g. `ITC.NS`) |
| `DELETE /api/watchlist/{symbol}` | Remove symbol |
| `GET /api/history/{symbol}?range=1y` | OHLCV + indicators (1mo/3mo/6mo/1y/2y/5y) |
| `GET /api/fundamentals/{symbol}` | Fundamental ratios |
| `GET /api/screener` | Full NIFTY 50 scan with signals |
| `GET /api/symbols` | Available stock list |

## Extending

To track stocks beyond NIFTY 50, add Yahoo symbols to `backend/universe.py` (NSE stocks use the `.NS` suffix, BSE uses `.BO`).

> Data is for information only — not investment advice.
