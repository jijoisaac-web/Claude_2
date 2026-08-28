"""
run_pipeline.py
================
Orchestrates the full daily pipeline: market breadth gate -> RS ranking ->
graph centrality refresh -> institutional footprint -> derivatives confluence,
then writes a single dashboard_data.json consumed by the static dashboard
(dashboard/index.html), which Cloudflare Pages serves as-is.

Expects daily input CSVs in ../data/ (relative to this file):
    daily_eod.csv, bulk_deals.csv, fii_dii_flow.csv, derivatives_data.csv

Any file that's missing is skipped with a warning rather than aborting the
whole run -- a partial dashboard beats no dashboard, and this pipeline is
still missing its live data-fetch layer (see repo README, "Known gaps").

Graph centrality only runs if NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD are set
in the environment (populated from GitHub Actions secrets in CI).
"""

import json
import math
import os

# Patched 2026-08-28 04:48:58: graph-centrality failures no longer abort the whole run
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from rs_ranking import compute_rs_ranking, compute_market_breadth
from institutional_footprint import compute_bulk_deal_signals, compute_flow_regime
from derivatives_analysis import classify_oi_buildup, screen_high_conviction_longs
from technical_signals import compute_technical_signals
from swing_score import compute_swing_score

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE.parent / "data"
DASHBOARD_DIR = BASE.parent / "dashboard"


def _sanitize_for_json(obj):
    """
    Recursively replace NaN/Infinity with None. Neither is valid JSON --
    Python's json.dumps emits them anyway by default (as bare `NaN`/`Infinity`
    tokens), which silently breaks every browser's strict JSON.parse and would
    take down the whole dashboard, not just the offending field. This is a
    safety net on top of fixing the known source (institutional_footprint.py's
    Buy_Sell_Ratio) -- other modules can develop the same failure mode as data
    edge cases show up (e.g. PCR with zero Call_OI), so we sanitize centrally
    at the one place everything funnels through before being written out.
    """
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(v) for v in obj]
    return obj


def _read_csv(name, **kwargs):
    path = DATA_DIR / name
    if not path.exists():
        print(f"[WARN] {name} not found at {path} -- skipping that section of the report.")
        return None
    return pd.read_csv(path, **kwargs)


# ---------------------------------------------------------------------------
# GraphAlpha dashboard exports (2026-08-28) -- added when the GraphAlpha UI
# was wired to real data. Everything below reads ONLY from data already in
# scope in main() (eod, technical, index_levels.csv); no new upstream data
# source except fetch_index_levels.py's index_levels.csv.
# ---------------------------------------------------------------------------

OHLC_EXPORT_TRADING_DAYS = 150   # enough for the dashboard's 6M range with headroom
OHLC_EXPORT_TOP_N = 20           # matches swing_score_top20's own head(20) cap
INDEX_SERIES_MAX_ROWS = 300      # generous cap; index_levels.csv retention keeps this well under anyway


def _price_snapshot(eod_df: pd.DataFrame, tickers) -> pd.DataFrame:
    """Per-ticker Price (latest Close) + Chg_1D_Pct + Chg_5D_Pct, for merging onto
    swing_score_top20 rows -- the composite score has no price/return columns of its
    own (it's built from RS/Technical/Volume/Sector/Graph/Regime *scores*, not raw
    price), so the Opportunity Table/Top Opportunities list needs this merged in
    separately to show real Price/1D/5D figures instead of the old mock ones."""
    rows = []
    ticker_set = set(tickers)
    for ticker, g in eod_df[eod_df["Ticker"].isin(ticker_set)].groupby("Ticker"):
        g = g.sort_values("Date")
        closes = g["Close"].tolist()
        if not closes:
            continue
        price = closes[-1]
        chg_1d = ((price / closes[-2]) - 1.0) * 100.0 if len(closes) >= 2 and closes[-2] else None
        chg_5d = ((price / closes[-6]) - 1.0) * 100.0 if len(closes) >= 6 and closes[-6] else None
        rows.append({"Ticker": ticker, "Price": round(float(price), 2),
                      "Chg_1D_Pct": round(chg_1d, 2) if chg_1d is not None else None,
                      "Chg_5D_Pct": round(chg_5d, 2) if chg_5d is not None else None})
    return pd.DataFrame(rows, columns=["Ticker", "Price", "Chg_1D_Pct", "Chg_5D_Pct"])


def _export_stock_ohlc(eod_df: pd.DataFrame, tickers, days: int = OHLC_EXPORT_TRADING_DAYS) -> dict:
    """Compact per-ticker OHLC+Volume history for the Stock Detail candlestick
    chart, limited to `tickers` (the dashboard only ever links to stocks that
    appear in swing_score_top20, so exporting the full ~750-ticker universe here
    would just bloat dashboard_data.json for rows nothing on the page can reach).
    EMA20/EMA50 are deliberately NOT precomputed here -- the dashboard already
    has a client-side ema() helper from the mock-data build; keeping the
    derivation client-side avoids exporting yet another wide time series."""
    out = {}
    ticker_set = set(tickers)
    for ticker, g in eod_df[eod_df["Ticker"].isin(ticker_set)].groupby("Ticker"):
        g = g.sort_values("Date").tail(days)
        out[ticker] = [
            {
                "Date": row["Date"].strftime("%Y-%m-%d") if hasattr(row["Date"], "strftime") else str(row["Date"]),
                "Open": round(float(row["Open"]), 2) if pd.notna(row["Open"]) else None,
                "High": round(float(row["High"]), 2) if pd.notna(row["High"]) else None,
                "Low": round(float(row["Low"]), 2) if pd.notna(row["Low"]) else None,
                "Close": round(float(row["Close"]), 2) if pd.notna(row["Close"]) else None,
                "Volume": int(row["Volume"]) if pd.notna(row["Volume"]) else None,
            }
            for _, row in g.iterrows()
        ]
    return out


def _export_stock_technicals(technical_df: pd.DataFrame, tickers) -> dict:
    """Per-ticker raw signal flags/values (not just the rolled-up Technical_Score)
    for the tickers the Stock Detail page can open -- lets the 'Why is this stock
    interesting?' / AI Market Intelligence panels state real facts (e.g. 'RSI 62,
    bullish band' or 'Volume running 1.8x average') instead of generic copy."""
    cols = ["RSI_14", "Volume_Ratio", "Breakout_20D", "Breakout_50D",
            "EMA_Pullback", "Higher_High", "RSI_Bullish", "Volume_Spike"]
    ticker_set = set(tickers)
    subset = technical_df[technical_df["Ticker"].isin(ticker_set)].set_index("Ticker")
    out = {}
    for ticker, row in subset.iterrows():
        rec = {}
        for c in cols:
            if c not in subset.columns:
                continue
            v = row[c]
            if isinstance(v, (bool,)) or str(subset[c].dtype) == "bool":
                rec[c] = bool(v)
            elif pd.isna(v):
                rec[c] = None
            else:
                rec[c] = round(float(v), 2)
        out[ticker] = rec
    return out


def _build_market_indices(data_dir: Path, max_rows: int = INDEX_SERIES_MAX_ROWS):
    """NIFTY 50 / NIFTY BANK latest level + Chg_1D_Pct + a trailing Close series
    (for the hero metric cards' sparklines and the Market Momentum chart), read
    from data/index_levels.csv (fetch_index_levels.py). Returns None if that file
    doesn't exist yet (e.g. before the first run after this export was added, or
    if the fetch has never once succeeded) -- callers must treat that as 'not
    available this run', not an error."""
    path = data_dir / "index_levels.csv"
    if not path.exists():
        return None
    df = pd.read_csv(path, parse_dates=["Date"])
    if df.empty:
        return None

    out = {}
    for index_key, g in df.groupby("Index"):
        g = g.sort_values("Date").tail(max_rows)
        latest = g.iloc[-1]
        out[index_key] = {
            "Close": round(float(latest["Close"]), 2) if pd.notna(latest["Close"]) else None,
            "Chg_1D_Pct": round(float(latest["Chg_Pct"]), 2) if pd.notna(latest["Chg_Pct"]) else None,
            "Date": latest["Date"].strftime("%Y-%m-%d"),
            "Series": [
                {"Date": row["Date"].strftime("%Y-%m-%d"), "Close": round(float(row["Close"]), 2)}
                for _, row in g.iterrows() if pd.notna(row["Close"])
            ],
        }
    return out or None


def main():
    report = {"generated_at_utc": datetime.now(timezone.utc).isoformat(), "warnings": []}

    eod = _read_csv("daily_eod.csv", parse_dates=["Date"])
    rs = None
    if eod is not None:
        breadth = compute_market_breadth(eod)
        breadth["Date"] = str(breadth["Date"])
        report["breadth"] = breadth

        rs = compute_rs_ranking(eod)
        report["rs_ranking_top20"] = rs.head(20).to_dict("records")
    else:
        report["warnings"].append("daily_eod.csv missing -- breadth + RS ranking not computed.")

    # Technical signals (breakout/pullback/RSI/volume) only need daily_eod.csv,
    # same as breadth/RS above -- computed here, independent of whether Neo4j
    # is reachable, so swing_score's Technical/Volume pillars and the
    # leader-laggard breakout list both still work even if the graph step
    # below fails or is skipped. New code path on real 750-ticker data for
    # the first time, unlike breadth/RS which are already proven live, so
    # this one gets its own try/except rather than being allowed to abort
    # the whole run.
    technical = None
    if eod is not None:
        try:
            technical = compute_technical_signals(eod)
            report["technical_signals_computed_for"] = len(technical)
        except Exception as exc:
            report["warnings"].append(f"Technical signals step failed: {exc!r}")

    # NIFTY 50 / NIFTY BANK index levels (GraphAlpha hero cards + Market Momentum
    # chart) -- independent of Neo4j, same as breadth/RS/technical above. Its own
    # try/except since fetch_index_levels.py/index_levels.csv is new as of this
    # export and untested against a real multi-day history yet.
    try:
        market_indices = _build_market_indices(DATA_DIR)
        if market_indices:
            report["market_indices"] = market_indices
        else:
            report["warnings"].append(
                "data/index_levels.csv missing or empty -- market_indices not computed "
                "(GraphAlpha hero index cards will fall back to demo data until "
                "fetch_index_levels.py has run at least once)."
            )
    except Exception as exc:
        report["warnings"].append(f"Market indices export failed: {exc!r}")

    bulk = _read_csv("bulk_deals.csv")
    if bulk is not None:
        signals = compute_bulk_deal_signals(bulk)
        report["institutional_signals"] = signals.head(20).to_dict("records")
    else:
        report["warnings"].append("bulk_deals.csv missing -- institutional signals not computed.")

    flow = _read_csv("fii_dii_flow.csv")
    if flow is not None:
        regime = compute_flow_regime(flow)
        latest = regime.iloc[-1].to_dict()
        latest["Date"] = str(latest["Date"])
        report["flow_regime"] = latest
    else:
        report["warnings"].append("fii_dii_flow.csv missing -- flow regime not computed.")

    deriv = _read_csv("derivatives_data.csv", parse_dates=["Date"])
    if deriv is not None:
        classified = classify_oi_buildup(deriv)
        high_conv = screen_high_conviction_longs(classified)
        report["derivatives_high_conviction"] = (
            high_conv.assign(Date=lambda d: d["Date"].astype(str)).to_dict("records")
        )
    else:
        report["warnings"].append("derivatives_data.csv missing -- OI confluence not computed.")

    if os.environ.get("NEO4J_URI"):
        from neo4j import GraphDatabase
        from graph_centrality import (
            fetch_graph, compute_centrality, compute_communities, write_scores_back,
            find_contagion_candidates,
        )
        from correlation_edges import compute_return_matrix, compute_top_correlated_pairs, refresh_correlation_edges
        from sector_rotation import fetch_sector_map, compute_sector_rotation, update_rotation_history

        driver = GraphDatabase.driver(
            os.environ["NEO4J_URI"],
            auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
        )
        try:
            # Refresh data-driven CORRELATED_WITH edges BEFORE pulling the graph for
            # centrality, so this same run's Hub_Score/community output already
            # reflects today's structure rather than lagging a run behind. Kept
            # inside the same try/except as the rest of the graph step below --
            # a correlation-edge failure shouldn't abort centrality any more than
            # a centrality failure should abort it.
            if eod is not None:
                returns = compute_return_matrix(eod)
                if returns is not None:
                    pairs = compute_top_correlated_pairs(returns)
                    n_written = refresh_correlation_edges(driver, pairs)
                    print(f"Refreshed CORRELATED_WITH edges: {len(pairs)} pairs, {n_written} directed edges.")
                else:
                    report["warnings"].append(
                        "Insufficient price history for correlation edges (need "
                        "60+ trading days) -- skipped this run, will retry as history accumulates."
                    )

            # Default empty so swing_score's GraphStrength pillar and the
            # leader-laggard screener below can both run (as all-zero /
            # skipped, not crashed) even when the graph itself is empty.
            centrality_df = pd.DataFrame(columns=["Ticker", "Hub_Score"])
            graph = fetch_graph(driver)
            if graph.number_of_nodes() == 0:
                report["warnings"].append(
                    "Neo4j connected but no Stock nodes found -- graph is empty. "
                    "Load the Nifty 750 schema (schema_extensions.cypher + your "
                    "Stock/Sector ingestion) before centrality scores will populate."
                )
            else:
                centrality = compute_centrality(graph)
                communities = compute_communities(graph)
                merged = centrality.merge(communities, on="Ticker", how="left")
                write_scores_back(driver, merged)
                report["graph_hub_leaders_top20"] = merged.head(20).to_dict("records")
                centrality_df = merged

            # Sector rotation: aggregates RS Ranking (already computed above) up to
            # sector level using Neo4j's BELONGS_TO membership -- independent of
            # whether Louvain communities/correlation edges are populated, so it's
            # kept outside the `graph.number_of_nodes() == 0` branch above (an
            # empty structure graph doesn't mean BELONGS_TO is empty too, and even
            # if it is, fetch_sector_map() just returns {} and compute_sector_rotation
            # produces an empty-but-valid table rather than crashing).
            if rs is not None:
                sector_map = fetch_sector_map(driver)
                rotation_today = compute_sector_rotation(rs, sector_map)
                rotation_path = DATA_DIR / "sector_rotation_history.csv"
                rotation_latest = update_rotation_history(rotation_today, breadth["Date"], rotation_path)
                report["sector_rotation"] = rotation_latest.to_dict("records")

                # Swing Score: the composite opportunity-ranking engine, blending
                # Technical/RS/Volume/Sector/GraphStrength/Regime -- everything
                # above is already in scope here, so this is pure combination,
                # no new data source. Runs even if centrality_df ended up empty
                # (graph step above hit the empty-graph branch) -- GraphStrength
                # just contributes 0 for every ticker in that case.
                if technical is not None:
                    swing_df = compute_swing_score(
                        technical, rs, sector_map, rotation_latest, centrality_df, breadth["Regime"]
                    )
                    top_swing = swing_df.head(20).copy()

                    # Merge real Price/Chg_1D/Chg_5D + Volume_Ratio onto the top-20
                    # rows -- compute_swing_score() only outputs pillar *scores*,
                    # not raw price, and the GraphAlpha Opportunity Table/Top
                    # Opportunities list needs both. eod is guaranteed non-None
                    # here (technical/rs both require it upstream).
                    if eod is not None:
                        snapshot = _price_snapshot(eod, top_swing["Ticker"].tolist())
                        top_swing = top_swing.merge(snapshot, on="Ticker", how="left")
                        vol_ratio = technical.set_index("Ticker")["Volume_Ratio"] if "Volume_Ratio" in technical.columns else None
                        if vol_ratio is not None:
                            top_swing["Volume_Ratio"] = top_swing["Ticker"].map(vol_ratio).round(2)

                    report["swing_score_top20"] = top_swing.to_dict("records")

                    # Compact OHLC history + raw technical signal flags, scoped to
                    # exactly these top-20 tickers -- the only ones the dashboard's
                    # Stock Detail page can actually be opened for. See
                    # _export_stock_ohlc()/_export_stock_technicals() docstrings.
                    if eod is not None:
                        try:
                            report["stock_ohlc"] = _export_stock_ohlc(eod, top_swing["Ticker"].tolist())
                        except Exception as exc:
                            report["warnings"].append(f"stock_ohlc export failed: {exc!r}")
                    if technical is not None:
                        try:
                            report["stock_technicals"] = _export_stock_technicals(technical, top_swing["Ticker"].tolist())
                        except Exception as exc:
                            report["warnings"].append(f"stock_technicals export failed: {exc!r}")

                    # Leader-laggard: operationalizes find_contagion_candidates(),
                    # which existed since the first graph_centrality.py delivery
                    # but was never called (example_breakouts = [] was hardcoded).
                    # Feed it today's real Breakout_20D/50D tickers. Needs the
                    # actual graph object, which only carries real edges when the
                    # graph wasn't empty.
                    if graph.number_of_nodes() > 0:
                        breakout_tickers = technical.loc[
                            technical["Breakout_20D"] | technical["Breakout_50D"], "Ticker"
                        ].tolist()
                        if breakout_tickers:
                            contagion = find_contagion_candidates(graph, centrality_df, breakout_tickers)
                            if not contagion.empty:
                                report["leader_laggard_top20"] = contagion.head(20).to_dict("records")
        except Exception as exc:
            # A graph-centrality failure (bad creds, transient Aura hiccup,
            # missing scipy, anything) should not discard the breadth/RS/
            # institutional/derivatives sections already computed above --
            # log it into the report and let the rest of the run finish.
            report["warnings"].append(f"Graph centrality step failed: {exc!r}")
        finally:
            driver.close()
    else:
        report["warnings"].append("NEO4J_URI not set -- graph centrality refresh skipped.")

    DASHBOARD_DIR.mkdir(exist_ok=True)
    out_path = DASHBOARD_DIR / "dashboard_data.json"
    clean_report = _sanitize_for_json(json.loads(json.dumps(report, default=str)))
    out_path.write_text(json.dumps(clean_report, indent=2, allow_nan=False))
    print(f"Wrote dashboard data to {out_path}")
    if report["warnings"]:
        print("Warnings:")
        for w in report["warnings"]:
            print(f"  - {w}")


if __name__ == "__main__":
    main()
