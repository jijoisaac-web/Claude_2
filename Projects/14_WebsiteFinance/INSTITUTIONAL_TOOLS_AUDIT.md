# Institutional Tools — Audit Against the 20-Item Wishlist

Validated directly against the current codebase (not from memory) as of v3.25.0. Status key: ✅ Built · 🟡 Partial · ❌ Missing.

## Phase 1 — Easy and immediately useful

**1. Bulk/block deal tracker — ✅ Built.** `/api/largedeals` + FII/DII tab: full deal table, known-FII/known-institution name filters, day-range filters, round-trip detection, CSV import/export, git-committed baseline archive, pagination. This is the most mature tool on the list.

**2. FII/DII/MF holding-change tracker — 🟡 Partial, and narrower than it looks.** Two pieces exist but neither is what this item asks for: `/api/fiidii` gives daily market-wide FII/DII cash totals (not per-stock holdings), and `/api/shareholding/:symbol` gives quarterly Promoter% vs Public% **only** — confirmed by reading the endpoint: NSE's `corporate-share-holdings-master` API returns Table I summary only, it does **not** split Public% into FII/DII/MF/Insurance sub-categories. That breakdown exists only in each quarter's linked XBRL filing, which isn't parsed. So today there is no per-stock FII/DII/MF% at all — only promoter vs. everyone else. This is the single biggest gap relative to the wishlist, since items 3, 4, 5, 8 and 10 below all assume real FII/DII/MF category data exists.

**3. Institutional entry/exit tracker — ❌ Missing.** No universe-wide "which stocks did an institution newly enter or fully exit" view. Blocked on item 2's data gap (can't detect FII/DII entry/exit without the category split) — bulk-deal entries are visible per-transaction today, but that's transaction-level, not stake-level.

**4. Institutional ownership trend charts — 🟡 Partial.** Promoter%/Public% trend exists, but as an HTML table (Fundamentals tab, one stock at a time), not a chart, and not FII/DII/MF-specific for the reason above.

**5. Institutional conviction score — ❌ Missing as a distinct thing**, though ingredients exist. "Conviction Scan" is a different, technical+flow+delivery+fundamentals score — not specifically an institutional-activity score. A real "Institutional Conviction Score" combining shareholding delta + bulk deals + insider filings + delivery accumulation into one 0–100 number is buildable **today** from data already fetched, no new source needed — genuinely a quick win once prioritized.

## Phase 2 — Real edge

**6. Estimated institutional cost basis — 🟡 Partial.** For a disclosed bulk/block deal, the deal price *is* the cost basis (already used as backtest entry price). For a shareholding-pattern-implied position build, there's no per-transaction price — only a rough estimate using the average share price around that quarter would be possible.

**7. Smart money divergence** (price falling while institutions accumulate, or the reverse) **— ❌ Missing** as a named signal, though every ingredient (price trend, delivery accumulation, shareholding delta) already exists separately and just needs combining.

**8. Institutional accumulation detector — 🟡 Partial.** Delivery-based accumulation/churn signals already exist (`ACCUMULATION`, `QUIET_ACCUMULATION` in the Screener/Conviction Scan) — but they're volume/delivery-based, not specifically tied to a named institution's actual stake change (blocked on item 2 again for the stake-level version).

**9. Institutional investor historical performance score — ❌ Missing, but cheaply buildable.** The FII bulk-deal backtest (`runFiiDealBacktest`) already computes called-it/missed per deal — it just isn't grouped by client name. Grouping the existing backtest output by `client` to rank "which named FIIs/institutions have the best historical hit rate" is a small extension of code that already exists, not a new data source.

**10. New entrant detection — ❌ Missing.** No diffing of "has this client ever traded this stock before" across the deals archive, and no shareholding-category history to detect a brand-new FII/DII position. The deals-archive version (has this client name shown up on this stock before, in stored history) is feasible now; the shareholding version is blocked on item 2.

## Phase 3 — Quantitative edge

**11. Earnings revision tracker — ❌ Missing, and low feasibility on free data.** Needs a *history* of analyst estimate changes; Yahoo only exposes current forward P/E and earnings-growth, not a revision timeline, and there's no free Indian source for this. Realistic version: start snapshotting our own forward-estimate fields going forward (build the history from today onward), not backfill the past.

**12. Factor scoring — ❌ Missing as a unified ranking, but the pieces already exist.** `computeInvestScore` (quality + value + margin-of-safety) and `setupScore` (momentum/technical) are both already computed per stock — combining them into one multi-factor Screener ranking (value/quality/momentum composite, sector-relative) is a genuine quick win, no new data needed.

**13. Backtesting engine — ✅ Built, and fairly extensive.** Signal backtest (12 trigger types, configurable stop/target/hold), FII/institutional bulk-deal backtest, options spread-probability backtest, and (just shipped) the Conviction Scan 3-gate walk-forward backtest.

**14. Portfolio construction — ❌ Missing.** Only a single-trade position-size/margin calculator exists (Ideas tab) and a mutual-fund-folio XIRR calculator (Mutual Funds tab, for funds not stocks). No multi-stock allocation/weighting tool.

**15. Risk management — ❌ Missing at the portfolio level.** Per-trade ATR-based stop/target exists; no portfolio-level correlation, concentration, or drawdown/VaR view across a multi-stock watchlist. Fully buildable from price histories already fetched — no new data source needed.

## Phase 4 — AI layer

**16. Explain why a stock moved — ❌ Missing**, but the pattern to build it on already exists (same Workers AI setup as the News tab's bull/bear brief and the Investor Presentations ratio-trend AI read) — would combine today's price/volume move with news headlines and any same-day bulk deal.

**17. Summarize quarterly filings — ❌ Missing, and the hardest of the five.** Concall/investor-presentation *links* are surfaced (Fundamentals tab), but nothing reads the PDF/XBRL content — this needs a text-extraction step before any AI summarization step, more involved than the others.

**18. Compare institutional behaviour — ❌ Missing**, and partly blocked on item 2 (no real FII/DII/MF series to compare across stocks yet).

**19. Detect unusual ownership changes — ❌ Missing**, but wouldn't even need AI — a simple statistical threshold on shareholding-pattern deltas (already-fetched data) would catch this. Blocked on item 2 for anything beyond promoter%.

**20. Generate a research report — ❌ Missing.** Every ingredient exists as a separate view (financial trend AI read, news AI brief, Conviction Scan, investor presentations) but nothing stitches them into one document. Straightforward once the individual AI pieces above exist — mostly an assembly job.

## Bottom line

Two tools are genuinely done well (bulk deals, backtesting engine). Everything institutional-ownership-specific (items 2–5, 7–10, 18–19) is gated behind one real data gap: **NSE's shareholding endpoint currently in use only returns Promoter vs. Public, not the FII/DII/MF split.** Worth a dedicated investigation pass (the same kind of devtools-based endpoint discovery that found the insider-trading feed) before building any of those, since it unblocks roughly half the list at once. Separately, several items (5, 9, 12, 15) need **no new data at all** — just new code combining data already being fetched, so they're the cheapest wins regardless of how the shareholding investigation goes.
