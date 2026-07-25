# Changelog

All notable changes to India Shares Tracker.

## [3.13.0] — 2026-07-25 · 4th cross-reference check + definitions on Investor Presentations

- **New cross-reference: "Institutional buy"** — checks the already-loaded local deals archive (no extra API calls, so this doesn't slow down scanning a large universe) for a disclosed NSE bulk/block BUY by a known large FII or domestic institution within 14 days either side of the filing date. Surfaces the buying client's name and deal value on hover
- Both the per-stock view and "Scan a universe" now check **4 signals instead of 3** (Technical setup, Near 52W high/low, Delivery accumulation, Institutional buy); sorting and the "X of 4 signals agree" summary updated accordingly
- **Definitions added**: a permanent legend block under the Investor Presentations heading spells out exactly what each of the 4 checks means (the ≥50 technical score threshold, the 3% 52-week band, the 60%+ delivery threshold, the 14-day institutional-deal window). Every badge also now has a hover tooltip with its definition (or, for Institutional buy, the specific matched deal) so the meaning is available inline without leaving the table

## [3.12.1] — 2026-07-25 · Security fix: escape deal client/name fields before rendering

- **Fixed a stored XSS vector**: the FII/DII deals table, Smart Money's per-stock deals panel, and the backtest results table all inserted the deal's `client` (and, in one table, `name`) field into `innerHTML` unescaped. That field is free text — sourced from a user-imported CSV or the git-committed baseline file — so a crafted value (e.g. containing an `<img onerror=...>` tag) would have executed as HTML/JS in the browser rendering it
- Added a shared `escHtml()` helper and applied it at all three render sites; deal `symbol` values used inside `onclick="openChart('...')"` handlers were checked separately and confirmed safe, since those only fire for symbols that exact-match the app's own trusted stock universe (crafted values wouldn't match and the onclick is simply omitted)
- Audited the rest of the repo for other security-relevant issues per a user request (context: site access is gated by Cloudflare Access, restricted to defined users) — no secrets/API keys/credentials are committed anywhere in the repo; the `/api/*` proxy endpoints all set `Access-Control-Allow-Origin: *`, which is low-risk since they only proxy public market data and hold no secrets or user data, but worth knowing if you ever want to lock that down; `/api/largedeals?debug=1` exposes upstream call diagnostics (status codes, snippets of NSE's raw failed responses) — no secrets or PII, informational only

## [3.12.0] — 2026-07-25 · Growth status filter on backtest table

- Added quick-filter pills above the backtest results table — **All / ✓ Called it / ✗ Missed / → Flat** — each labeled with a live count, so you can jump straight to winners or missed calls without scanning the whole page-by-page table
- Filtering re-paginates against just the matching rows (still 20/page); the summary line above (hit rate, avg move) always reflects the full unfiltered backtest, not just the selected slice
- Filter resets to "All" automatically each time you re-run the backtest

## [3.11.0] — 2026-07-25 · Backtest lookback window: 90 days / 6 months / 1 year

- Added a lookback selector to the FII/institutional bulk-deal backtest (Backtest tab) — 90 days, 6 months, or 1 year (default), replacing the hardcoded 90-day-only window
- Widened the price-history fetch range to match: 1y chart data for the 90-day/6-month windows, 2y for the 1-year window, so deals near the edge of the lookback still have enough price history to anchor an entry close and a current close
- New warning when stored deal history covers less than half the selected lookback window, pointing at "Import history" on the FII/DII tab — this backtest is only as good as the archive built up in 3.9.0–3.10.0

## [3.10.0] — 2026-07-25 · Git-committed baseline for deal history + export button

- **New: `site/data/deals-archive.json`**, a static file committed to the repo and served by Cloudflare Pages like any other asset. Generated from the user's own two uploaded CSVs (Bulk + Block, 25-Jul-2025 to 24-Jul-2026) — 26,962 rows across 246 distinct days. Every visitor's browser now bootstraps from this file once (tracked via an IndexedDB flag) and merges it into their local archive, so history is available immediately for new visitors instead of only accumulating one day at a time
- **New: "⬇ Export to site/data/deals-archive.json" button** on the FII/DII tab — downloads the browser's full accumulated local archive as JSON, so it can be dropped back into `site/data/deals-archive.json` and committed/pushed to refresh the shared baseline as real days pile up beyond what's currently baked in
- **Fixed `.gitignore` bug**: the rule `data/` (unanchored) matched `site/data/` too, at any depth, which would have silently kept the new baseline file out of every commit. Anchored to `/data/` so only the root-level Python backend's `data/` folder is still excluded
- Updated the FII/DII tab footnote and `DEPLOY.md` to describe the three-layer model: git baseline (shared) → per-browser IndexedDB (grows daily / via CSV import) → today's live snapshot (always freshest)
- **Still required from you**: commit + push `site/data/deals-archive.json` and the corrected `.gitignore` via GitHub Desktop — this file was generated and written to disk locally but nothing is live until that push happens

## [3.9.0] — 2026-07-25 · Deal history moved fully client-side (no Cloudflare setup)

- **Reverted the Cloudflare KV + GitHub Actions approach from 3.7.0/3.8.0** — per the user's preference not to make any Cloudflare dashboard changes. Removed `/api/deals-snapshot-save`, the server-side `/api/deals-import`, and `.github/workflows/daily-deals-snapshot.yml`
- **New: fully client-side deal history**, no backend setup required —
  - The FII/DII tab now saves each day's disclosed deals into an IndexedDB archive in the browser, growing by one real day every time the tab is opened (IndexedDB rather than localStorage since a year of deals is a few MB, past localStorage's ~5MB ceiling on some browsers)
  - New **"Import history"** control on the FII/DII tab: upload a Bulk Deals or Block Deals CSV downloaded directly from NSE's own Bulk/Block Deals Archives page (works from a normal browser, unlike the same request from this app's server) for instant backfill — the user's own year-long CSV export (~27,000 rows) was used to validate the parser
  - Added a "Clear local history" button
  - `/api/largedeals` simplified back down to just today's live snapshot (plus an opportunistic, normally-blocked historical attempt) — its only job now is supplying one fresh day per visit for the browser to accumulate
  - Same caveat as the existing Mutual Funds folio feature: this history lives in one browser only and is lost if site data is cleared — re-import the CSV to restore it
- 6M/1Y range buttons and the ~400-day retention window from 3.8.0 are kept, now backed by the local archive instead of KV

## [3.8.0] — 2026-07-25 · Manual CSV backfill + 6M/1Y range buttons

- New `/api/deals-import` endpoint: parses NSE's own downloadable Bulk/Block Deals CSV export (from `nseindia.com/report-detail/display-bulk-and-block-deals`, which works from a normal browser even though the same data is blocked server-side) and merges it into the KV archive, replacing rows per (type, date) so re-imports are safe. The user downloaded a full year of both files (~27,000 rows total) and this is how it gets loaded in
- Deals archive retention and serving window extended from ~97 days to ~400 days to actually use that year of backfilled history
- Added **6M** and **1Y** buttons to the Bulk & Block Deals range picker; "All" no longer claims a fixed day count since the real window now depends on how much has been imported/accumulated
- Footnote updated to describe the self-managed-archive model plainly instead of implying a fixed NSE-provided window

## [3.7.0] — 2026-07-25 · Self-managed deals archive (works around NSE's IP block)

- **Root cause confirmed via `?debug=1`, pasted by the user**: NSE's `/api/historical/bulk-deals` and `/api/historical/block-deals` return an "NSE India" bot-block HTML page with HTTP 200 when called from Cloudflare's IPs — an IP-reputation block, not a fixable header/cookie/referer issue. No amount of request tweaking gets past this from a Cloudflare Function
- New workaround, chosen by the user from three options: build a self-managed rolling archive instead of fighting NSE's blocked endpoint
  - New `/api/deals-snapshot-save` Function: fetches the live single-day snapshot (which NSE does allow) and saves it into Cloudflare KV (`DEALS_KV` binding, key `deals:archive`), de-duplicating by date and pruning entries past ~100 days
  - New `.github/workflows/daily-deals-snapshot.yml`: calls that endpoint once a day (19:00 IST, Mon–Fri) via a `workflow_dispatch`-enabled GitHub Actions schedule, authenticated with a shared secret
  - `/api/largedeals` now reads the KV archive first (real multi-day history, growing by one real day at a time from whichever day this is set up), always merges in today's live snapshot on top for freshness, and keeps the historical-endpoint attempt as a cheap opportunistic fallback in case NSE ever lifts the block
  - Requires one-time manual setup (Cloudflare KV namespace + binding + secret, matching GitHub Actions secret) — documented step by step in `DEPLOY.md` under "Bulk & block deals multi-day history"
  - Cannot backfill days before this is set up (that data is genuinely inaccessible), but the table is never worse off than before, and gets real from day one forward

## [3.6.1] — 2026-07-25 · Debug mode now captures the actual blocked response

- User-confirmed via `?debug=1`: NSE's historical bulk/block-deals calls are returning HTTP 200 with a body that isn't valid JSON ("parse-error") — almost certainly a bot-block/challenge page, not real data
- `/api/largedeals?debug=1` now captures and returns the first ~400 characters of that raw response body per endpoint, instead of discarding it on parse failure — this is the detail needed to tell a WAF/challenge page apart from a malformed-but-real response, which so far couldn't be seen at all

## [3.6.0] — 2026-07-25 · Collapsible Backtest sections + FII deal backtest

- Backtest tab's three sections (Ideas replay, Options spread probability, and the new FII deal backtest below) are now **collapsible** — click a section header to expand/collapse it
- New **FII/institutional bulk-deal backtest** section: takes the last 90 days of disclosed bulk/block deals (filtered to Known FII / Known domestic institutions / All, same-day round trips excluded), fetches each stock's price history, and shows a table of deal date, entry price (close on/after the deal), current price, % change, days held, and a **Growth status** badge — "Called it" (BUY+price up >1% or SELL+price down >1%), "Missed" (opposite), or "Flat" (±1%, noise). Summary line shows overall hit rate and average move. Paginated 20 rows/page
- Reused the deals table's round-trip detection logic (`flagRoundTrips`) instead of duplicating it

## [3.5.4] — 2026-07-25 · Harden multi-day deal fetch, add fallback warning

- User-reported: even after the 3.5.2/3.5.3 fixes, the deals table was still only showing 1 day of data in production — NSE's historical bulk/block-deals endpoints were silently failing and falling back to the single-day snapshot every time
- `/api/largedeals` now always establishes an NSE session (cookie handshake) before calling the historical endpoints instead of trying cookie-less first, uses the correct referer for that specific report page, and adds the `x-requested-with`/`sec-fetch-*` headers NSE's own frontend sends — historical bulk and block calls also now fail independently rather than one dragging the other into the snapshot fallback
- Added `/api/largedeals?debug=1` — bypasses cache and returns each upstream call's HTTP status and row count, for diagnosing without browser DevTools
- The deals table now shows an on-page warning banner when it's serving the single-day fallback instead of the real multi-day window, so this failure mode is visible without checking the console

## [3.5.3] — 2026-07-25 · 30D/60D/90D range buttons on Bulk & block deals

- Added **30D, 60D, 90D** buttons to the Bulk & block deals range picker (was 1D/3D/7D/14D/All)
- `/api/largedeals` now fetches roughly the last **95 calendar days** from NSE's historical bulk/block-deals endpoints (was ~34 days), so the new 90D button has real data behind it. "All" relabeled to "All (~95D)"

## [3.5.2] — 2026-07-25 · Deals day-range filter now actually filters

- **Fixed:** the 3D/7D/14D range buttons on Bulk & block deals were effectively no-ops — `/api/largedeals` only ever fetched NSE's single latest-published-day snapshot, so there was never more than one day of data behind the filter regardless of which button was selected
- `/api/largedeals` now pulls from NSE's historical bulk-deals and block-deals endpoints (date-range capable) covering roughly the last 30 calendar days, so selecting 3D/7D/14D genuinely slices into that real multi-day window. Falls back to the old single-day snapshot if the historical endpoints are unreachable, so the table never goes blank
- "All in NSE's window" renamed to "All (~30D)" to reflect the new fixed fetch window; footnote updated accordingly

## [3.5.1] — 2026-07-25 · Domestic institutions filter + deals pagination

- New "**Known domestic institutions/groups only**" filter on Bulk & block deals, alongside the existing Known FII filter: matches the client name against a curated list of large Indian promoter groups (Tata Sons, Birla Group, Reliance Group, SBI/ICICI/HDFC/Kotak/Axis/Canara/Sundaram Group, President of India, and similar) and domestic financial institutions (LIC, GIC, IDBI Bank, PNB, JM Financial, Abakkus, Plutus Wealth, UTI, EPFO, NPS Trust, and similar). Same name-matching-heuristic caveats as the FII filter apply, and are noted in the UI
- **Known large FIIs/funds only is now the default client filter** on the deals table (was "All clients")
- **Bulk & block deals table is now paginated** — 20 results per page with Previous/Next controls and a page counter, instead of a flat top-50 cut. Changing any filter, sort, or date range resets back to page 1

## [3.5.0] — 2026-07-17 · Conviction Scan Complete

- Conviction Scan gains a sixth footprint: **fresh unmitigated bullish order block** (break of structure within 7 days) detected during the same technical pass — the Smart Money read now participates in the automated hunt alongside technicals, money flow, delivery, fundamentals, and disclosed deals
- Mobile: Investor Presentations, Smart Money scanner, Options momentum, and Delivery tables added to the horizontal-scroll containers (page never side-scrolls on phones)

## [3.4.1] — 2026-07-25 · Known-FII filter on Bulk & block deals

- New "**Known large FIIs/funds only**" filter on the Bulk & block deals table: matches the disclosed client name against a curated list of ~50 large sovereign wealth funds, global asset managers and known FIIs active in Indian markets (Government of Singapore, GPFG, Vanguard, GQG Partners, Morgan Stanley, Abu Dhabi Investment Authority, and similar, plus a handful of other well-known global institutions added beyond the original list). Combines with the existing Buy/Sell filter and the same-day-round-trip hiding already in place, so "known FII, buy only, excluding intraday round-trips" is one set of dropdowns away
- This is name-matching against NSE's free-text client field, not an official FII/FPI classification NSE provides — it'll miss smaller or newly active funds not on the list, and is flagged as such in the UI

## [3.4.0] — 2026-07-25 · Charts tab removed, Investor Presentations tab added

- **Removed the standalone Charts tab.** Every "open chart" link across the app (Screener, Ideas, Deals, Delivery, Fundamentals, Insider filings, Investor Presentations — dozens of call sites) now opens **Smart Money's** chart instead (candlestick + order blocks + volume profile), via `openChart()` becoming a thin alias for `openSmartMoney()`. Standalone SMA/Bollinger toggle and separate RSI/MACD panels that only lived on the old Charts tab are gone — Smart Money's chart is the one chart destination now. Shared chart-library helpers (`mkChart`, `ensureChartsLib`) were kept since Smart Money depends on them
- **New Investor Presentations tab**, in the same nav slot Charts occupied: 
  - **One stock** — search a symbol, see its investor/earnings/results presentation filings (NSE corporate-announcements, filtered to presentation subjects) for the last 180 days, with dates and PDF links
  - **Scan a universe** — sweep NIFTY 50 up to All ~750 for stocks with a presentation filed in the last 14 days
  - Both views cross-reference each fresh filing (≤14 days old) against three signals already elsewhere in the app: technical setup score ≥50 + above SMA200, proximity to the 52-week high/low (within 3%), and delivery-based accumulation (≥60% delivery + price up ≥0.5%) — a filing count of how many agree, not a read of the deck's actual content (no PDF/PPT parsing happens; NSE doesn't publish presentations as structured data)
  - Explicitly scoped: this cannot and does not summarize what's inside a presentation — only when it was filed, cross-referenced against market-data timing

## [3.3.4] — 2026-07-25 · Round-trip filtering + delivery signal filters

- Bulk & block deals now **hides same-day round trips by default**: when the same client shows up as both BUY and SELL for the same stock on the same date, that's same-day trading activity, not a held institutional position — NSE's disclosure has no intraday flag, but this pattern is the closest visible proxy, so these rows are filtered out unless you tick "Show same-day round trips." When shown, they're marked with a ROUND TRIP badge. Meta line now also states how many were hidden
- Delivery % gets **one-click signal filters** — All / Genuine accumulation / Genuine selling / High conviction flat / Speculative churn — instead of always showing a mixed top-20. Filtering now happens before the top-20 cut, so picking "Genuine accumulation" won't miss rows that would've been pushed out by other signal types in a mixed list

## [3.3.3] — 2026-07-25 · Bulk & block deals: range/sort/side controls

- Replaced the old binary "latest session / all days" checkbox with **date-range presets** (1D/3D/7D/14D/all available) on the Bulk & block deals table, matching the range-button pattern already used on Charts
- Added **Buy only / Sell only / Buy + Sell** filter and a **sort toggle** (biggest value first vs most recent first) — sorting by value is what actually surfaces "top deals" in a window, which date-first sorting didn't
- Row cap raised from a hardcoded top 15 to top 50
- Meta line now states NSE's actual data window explicitly (oldest → newest date, day count) since NSE's snapshot only covers a limited trailing period regardless of which preset is picked — a 14D selection will silently show fewer days if that's all NSE currently publishes, and the header now says so instead of leaving it ambiguous
- Note added: bulk/block deals aren't tagged FII vs DII by NSE — that split only exists in the aggregate FII/DII cash-flow cards above this table, not in the named-client deal rows. "Top FII/DII deals" here means judging by the client name column, not a filterable category

## [3.3.2] — 2026-07-25 · AI news brief fix

- Fixed the Fundamentals tab's "News & AI brief" panel, which was failing with error 5028 ("This model was deprecated") and silently falling back to generic, non-symbol-specific headlines. Cloudflare deprecated `@cf/meta/llama-3.1-8b-instruct` on 2026-05-30 (confirmed via their Workers AI changelog) — swapped to `@cf/meta/llama-3.1-8b-instruct-fast`, the variant Cloudflare confirmed stays active, same model family and request shape so no prompt changes needed

## [3.3.1] — 2026-07-25 · Insider trading disclosures

- New **insider trading disclosures** panel on the Fundamentals tab (SEBI PIT Regulation 7(2)): last 20 filings for the stock, most recent first, with a 90-day count callout and a "View" link straight to NSE's disclosure document. New `/api/insider/:symbol` function against `nseindia.com/api/corporates-pit-gg` — an endpoint that isn't documented in any public NSE wrapper library, found by inspecting DevTools Network tab directly (thanks to live testing this pass, since this environment can't reach nseindia.com to discover it independently)
- Like shareholding pattern, this is the filing-list level: who filed and when, not the parsed transaction (person, buy/sell, qty, value) — that detail lives in each filing's linked iXBRL document, which isn't parsed here. The "View" link goes straight to it
- AMFI fund-flow aggregation (Phase 3) is still open — confirmed real data exists (amfiindia.com/online-center/portfolio-disclosure, Excel per AMC/scheme with ISIN/qty/value/%NAV) but the download URL pattern needs to be grabbed live before building against it, same as this pass

## [3.3.0] — 2026-07-25 · Institutional-edge gap closing (phase 1)

First pass on the [institutional-edge roadmap](INSTITUTIONAL_EDGE_ROADMAP.md): closing gaps between what FIIs/DIIs/promoters see and what this tracker surfaces.

- **Bulk/block deals wired into Conviction Scan and Smart Money** (previously only shown as a table in the FII/DII tab). Conviction Scan now gives a bonus footprint to any stock with a disclosed bulk/block deal in the last ~3 sessions, shown as an INSTITUTIONAL DEAL badge — additive, not a new hard gate, since deals are too sparse day-to-day to require. Smart Money's chart now plots ▲/▼ markers at the actual deal date/price for the selected stock, plus a new "Institutional deals" table on that tab — the one signal there that's a real disclosure rather than a price/volume proxy
- New **shareholding pattern** panel on the Fundamentals tab: last 8 quarters of Promoter/Public/Employee-Trust % from NSE's quarterly filing, with quarter-over-quarter promoter delta and a callout when promoter stake has moved the same direction for 2+ straight quarters. New `/api/shareholding/:symbol` function. Note: this is the Table I summary only — NSE's FII/DII/MF sub-category breakdown lives in each quarter's XBRL attachment, not parsed here (would need XML parsing; scoped as a follow-up, not blocking since the promoter trend alone is a real signal)
- New **concalls & investor meets** panel on the Fundamentals tab: NSE corporate-announcements filtered to concall/investor-meet/earnings-call subjects, last 180 days, with PDF links where NSE attaches one — retail's after-the-fact version of the corporate access institutions get live. New `/api/announcements/:symbol` function
- **Not shipped this pass:** insider trading disclosures (SEBI PIT) — couldn't confirm NSE's exact JSON endpoint/field names from this environment (no working NSE reachability to verify against), so nothing is guessed into production. Needs a quick manual check (open the Network tab on NSE's insider-trading page for a symbol, copy the XHR request URL) before it can be built. AMFI monthly fund-flow aggregation (which stocks the mutual fund industry is net buying/selling) is scoped in the roadmap doc but not started — it's a heavier job (diffing full portfolio disclosures across ~40+ AMCs, likely needs a scheduled job rather than a live per-request fetch) that deserves its own pass

## [3.2.1] — 2026-07-19

- Holdings can now be **edited** in place — a ✎ button per row loads units/invested amount/invested date back into the add-holding form (scheme itself is locked; remove and re-add to change which fund it is), with Save/Cancel
- Added **Export**/**Import** for the folio (JSON download/upload, includes target allocation settings) — the folio lives in `localStorage` only and does not sync across devices or browsers automatically; this is the manual workaround for moving it or keeping a backup. Import offers Replace or Merge when you already have holdings saved
- Disclaimer card now states the no-sync behavior explicitly (clearing browser data or using private/incognito mode loses the folio) rather than leaving it implicit

## [3.2.0] — 2026-07-19 · Mutual Funds: CAGR + market-cap tilt

- Holdings table gets a **CAGR** column — lump-sum annualised return since the holding's own invested date (the optional field already on the add-holding form). Shows "—" with a tooltip if no invested date was entered
- New **Folio XIRR** summary card — money-weighted return across every holding that has an invested date, solved by bisection over the combined cashflows (each holding's invested amount on its own date, current value today). Card label notes how many of your holdings are dated if it's not all of them
- New **Market-cap tilt** panel: buckets equity holdings into Large/Mid/Small from AMFI's scheme category (Large & Mid Cap funds split 50/50 across both). Multi Cap, Flexi Cap, ELSS, Focused, Value, Contra and Sectoral/Thematic funds carry no fixed cap mandate — shown separately as "Flexible" rather than guessed at, and excluded from the target math. Aggressive/Balanced/Conservative presets or custom targets, with buy/trim ₹ actions same as the asset-class panel
- Rebalancing recommendations now also flag the single biggest market-cap drift within equity (alongside the existing asset-class drift, cost, and overlap flags)

## [3.1.2] — 2026-07-19

- Conviction Scan was requiring all four gates from the raw universe scan in one pass — technical (setup≥55) AND money-flow AND delivery AND fundamentals(≥60), all independently rare — so it came back empty most runs. Restructured into a funnel: score every scanned stock on the 3 market-data gates (technical/money-flow/delivery) first, only fetch fundamentals for names already agreeing on 2 of those 3 (bounded to top 20, so a real 4/4 candidate is never silently skipped), then apply the fundamentals gate last
- Thresholds nudged down slightly (setup score ≥50, was 55; invest score ≥55, was 60) — CEMPRO-style names (setup 49, invest 46) are still correctly excluded, but the bar isn't so high it's structurally near-impossible to clear on an average day
- When nothing clears all four, the tab now shows the closest calls instead of a blank screen — top candidates ranked by gates agreed, each with a ✓/✕ per gate so it's clear exactly what's missing, rather than "0 results" with no diagnostic value

## [3.1.1] — 2026-07-19

- Conviction Scan fundamentals gate was too weak: it only checked Quality Score ≥60, which ignores valuation entirely — a stock trading well above its DCF/Graham fair value (or riding an overbought RSI) could still clear all four gates. Caught live: CEMPRO cleared the scan with 7 footprints, but its own Fundamentals-tab verdict said AVOID (RSI 82 overbought, margin of safety -153%, analyst target -17% below price)
- Both gates now reuse the Fundamentals tab's own scoring instead of a separate, weaker check: technical gate is `setupScore()` ≥55 + above SMA200 (the same trade-quality score the Ideas engine uses, which already penalises overbought/stretched/bearish conditions); fundamentals gate is a new shared `computeInvestScore()` — quality 40% + (100-value-trap risk) 20% + DCF/Graham margin-of-safety 40%, extracted out of the consolidated verdict panel so both places compute it identically. A name the Fundamentals tab would call AVOID or STRETCHED can no longer clear Conviction Scan
- Results table swaps the old Quality/Value columns for Setup score, Invest score and Margin of Safety %, so the reasoning is visible inline instead of requiring a click-through

## [3.1.0] — 2026-07-19 · Conviction Scan

- Removed the **Brief** tab and all its dedicated code (`loadBrief`/`renderBriefGate`/`renderBriefIdeas`/`renderBriefEdge`) — replaced by Conviction Scan in the same nav slot. (Unrelated same-named features kept: the Ideas tab's "decision briefs" and the Fundamentals tab's AI news brief.)
- New **Conviction Scan** tab: one button that cross-references four independent footprints and shows only stocks clearing all of them — technical setup (Screener's own bullish signals), money-flow (OBV/Chaikin, computed in that same scan — no separate pass needed), delivery-based accumulation (NSE bhavdata, ≥60% delivery + price up ≥0.5%), and business quality (Fundamentals composite Quality Score ≥60, fetched only for the shortlist that already cleared the first three gates, to keep it fast)
- Results ranked by **footprint count** — total confirming signals across all four gates — so agreement, not just a pass/fail, differentiates the (usually short) list. Deliberately shows nothing on quiet days rather than padding the list
- Universe picker (NIFTY 50 default up to All ~750 stocks) with a 3-stage progress readout
- Mobile: added `#convResults`, `#mfHoldingsTable`, `#mfAllocTable` to the horizontal-scroll/min-width table rules (the last two were missed when the Mutual Funds tab shipped in v3.0.0)

## [3.0.2] — 2026-07-17

- Deals table root-cause fix for "same old data": NSE's snapshot is a multi-day window and the table sorted purely by value, so huge old blocks stayed pinned on top. Now defaults to the **latest session only** (1-day bulk/block tolerance), sorts date-then-value, shows a Date column per deal, and offers an "include older days" checkbox

## [3.0.1] — 2026-07-17

- Bulk & block deals staleness fix (was showing 14-Jul on the 17th): the same NSE stale-payload-to-cookie-less-clients issue fixed for FII/DII in v2.28.2 — the deals function now checks the newest deal date in the payload, retries with a fresh cookie handshake when it's >3.5 days old, and keeps the fresher response; edge cache lowered to 15 min
- Deals header now shows the newest date across bulk+block (was the first block deal's date, which could understate freshness)
- Freshness checks upgraded to trading-day aware (both deals and FII/DII): data must be from the last completed weekday (±1 day publication grace) — a fixed N-day threshold couldn't distinguish "Tuesday's data on Friday" (stale) from "Friday's data on Monday" (fine)

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
