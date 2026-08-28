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
        from graph_centrality import fetch_graph, compute_centrality, compute_communities, write_scores_back
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
