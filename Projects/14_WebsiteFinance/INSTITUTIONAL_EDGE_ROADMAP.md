# Institutional Edge — Gap Analysis & Roadmap

Where FIIs, DIIs, promoters and insiders still see something a retail user of India Shares Tracker doesn't, and how to close each gap. Written against the app as of v3.2.1.

**Status (v3.3.0):** Phase 1 (deals wired into Conviction Scan + Smart Money), Phase 2 (shareholding pattern trend), and Phase 5 (concall/investor-meet links) are shipped — see CHANGELOG. Phase 4 (insider trading) is blocked on confirming NSE's exact endpoint/field names; needs a one-time manual check (open the Network tab on `nseindia.com/companies-listing/corporate-filings-insider-trading` for any symbol, copy the XHR URL) before it can be built without guessing. Phase 3 (AMFI fund-flow aggregation) is still just scoped below — it's the heaviest item and deserves its own pass.

## What the app already replicates

The "Smart Money" theme is already the spine of this product, not an add-on:

- **Daily institutional cash flow** — `/api/fiidii` (NSE `fiidiiTradeReact`) shows FII/DII buy/sell/net for the latest session.
- **Named institutional trades** — `/api/largedeals` pulls NSE bulk & block deals: which client bought/sold how much of which stock, at what price. This is the most direct signal in the app (an actual disclosed trade, not a proxy) but it currently only surfaces as a table in the FII/DII tab — it isn't cross-referenced into Conviction Scan or Smart Money.
- **Delivery-based accumulation** — `/api/delivery` (NSE bhavdata) flags genuine buying/selling vs speculative churn, feeding both the Screener and Conviction Scan.
- **Order-flow proxy** — Smart Money tab's order blocks + volume profile, an explicit structural approximation since no exchange publishes real order-flow (the tab says so directly).
- **Conviction Scan** — cross-references technical + money-flow + delivery + fundamentals gates into one shortlist, the app's flagship "see what smart money is doing" feature.
- **Options positioning** — `/api/optionchain` (OI, IV, volume by strike) for NIFTY/BANKNIFTY/stocks.
- **Consensus research access** — Fundamentals tab already pulls analyst recommendation + target price.

## Remaining gaps — ranked by how much real edge they close

**1. Quarterly shareholding pattern (FII/DII/Promoter % + promoter pledge).** The single biggest institutional edge not yet covered. Bulk deals and delivery% are daily/short-term; shareholding pattern is the audited quarterly filing every listed company must make (NSE `corporate-filings-shareholding-pattern`) — the actual % held by FIIs, DIIs, promoters, and public, quarter over quarter, plus promoter pledge % (a genuine red flag institutions price in immediately and most retail investors never check). A rising FII/DII % over 2-3 quarters on a stock is a far stronger conviction signal than a single bulk deal.

**2. Monthly mutual-fund portfolio disclosures, aggregated across schemes.** SEBI mandates every AMC publish full scheme holdings monthly; AMFI republishes it. The app already has deep AMFI integration (`/api/mf/schemes`, `/api/mf/nav/:code`) but only for the user's *own* folio — it doesn't use AMFI's richest dataset: what stocks the *industry* is adding or trimming. This is the closest a retail tool can get to "what are institutional fund managers buying this month," at the individual-stock level, for free. Ranks with #1 as the highest-value addition.

**3. Insider trading disclosures (SEBI PIT Reg 7 / Reg 29-30).** Promoters and designated insiders must disclose their own buys/sells within 2 trading days. This is a distinct signal from bulk deals (it's specifically insiders, who have information the market doesn't) and distinct from shareholding pattern (it's transaction-level and near-real-time, not quarterly). Public via NSE corporate-filings insider-trading feed.

**4. Bulk/block deals wired into Conviction Scan / Smart Money — quick win, no new data source.** `/api/largedeals` already exists; it just isn't a gate or confirmation signal anywhere else. A stock with a block deal in the last 5 sessions is stronger evidence than an order-block proxy inferred from candles. Cheapest item on this list — pure wiring, ship first.

**5. Corporate-access proxy: concall/analyst-meet disclosures.** Institutions get invited to management calls and analyst meets; retail gets the transcript (if they go looking). NSE corporate-announcements already lists concall/investor-meet filings with links. Surfacing these (and optionally an AI summary of the transcript PDF) on the Fundamentals tab closes an information-access gap, not a data gap.

**Lower priority / lower feasibility:**
- Sector-wise FII/DII flow — no free official breakdown by sector, only market-wide cash totals; would require inferring from bulk deals + shareholding pattern deltas rather than a clean feed.
- IPO anchor-investor allocations — real edge but only relevant to primary-market timing, off to the side of this app's listed-equity focus.
- Level 2/3 order book depth — not published free by NSE at any granularity beyond top-5, and even paid feeds don't disclose participant identity; not implementable without breaking the "free data only" constraint the whole app is built on.

## Implementation plan

Everything below follows the existing pattern: a new Cloudflare Pages Function in `site/functions/api/`, NSE's cookie-handshake-on-stale-data trick (already in `fiidii.js`/`largedeals.js`), edge caching via `caches.default`, and a new tab or panel in `index.html`. No backend/Python changes needed — the Cloudflare site is the maintained version per the README.

**Phase 1 (ship first — cheapest, reuses existing data):**
Wire `largedeals` into Conviction Scan as a fifth confirmation signal (block/bulk deal in the stock within N sessions) and into the Smart Money view as an overlay marker on the chart at the deal date/price. No new endpoint.

**Phase 2 (highest value, new data source):**
`/api/shareholding/:symbol` — fetch NSE's shareholding-pattern filing per symbol, return last 4 quarters of FII%/DII%/Promoter%/Public% + pledge%, with quarter-over-quarter delta. New Fundamentals tab panel: trend line + "FII stake rising 3 straight quarters" style callouts. Feed the delta into Conviction Scan as an optional fifth gate (rising institutional stake) once proven reliable.

**Phase 3 (highest value, most build effort):**
`/api/mf/flows` (or similar) — this is heavier than the other endpoints: it needs to diff two months of AMFI's full portfolio-disclosure files across ~40+ AMCs to compute stock-level net buying/selling in ₹ crore, then rank. Likely needs a scheduled Cloudflare Cron job to pre-compute and cache the diff (rather than doing it live per request) given the file sizes involved. New "Fund Flows" panel: top 20 stocks by net institutional buying/selling this month, filterable by category (Large/Mid/Small cap funds). This is the one item worth scoping carefully before starting, since it's a genuinely different shape of work than the existing endpoints.

**Phase 4:**
`/api/insider/:symbol` — NSE insider-trading disclosure feed per symbol, last 90 days, direction + qty + value. Surface on Fundamentals tab near the shareholding panel; feed "insider net buying" into Conviction Scan alongside the shareholding gate.

**Phase 5:**
Concall/investor-meet links surfaced on Fundamentals tab from NSE corporate-announcements, filtered by announcement subject. AI summary of the transcript PDF is a stretch goal, not a blocker for shipping the links themselves.

## Suggested sequencing

Ship Phase 1 immediately (it's a wiring change, testable same day). Scope and build Phase 2 next — same architectural pattern as everything already in the codebase, so it's low-risk. Phase 3 is the one to plan out separately (cron job, storage for the diff, first-run backfill) before committing to a timeline. Phases 4-5 slot in after, in either order, once the shareholding panel proves the UI pattern for "institutional trend" callouts works.
