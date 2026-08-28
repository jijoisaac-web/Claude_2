"""
fetch_all_market_data.py
==========================
Orchestrator run as the first step of the daily GitHub Actions pipeline, before
run_pipeline.py. Runs all five live-data fetchers in sequence, each in its own
try/except -- one feed failing (most likely candidate: fetch_derivatives.py,
see its docstring) must never prevent the others from updating, and must never
fail the whole workflow. run_pipeline.py already treats a missing/stale CSV as
"skip that section with a warning," so a partial fetch here degrades the
dashboard gracefully rather than breaking it.

Order matters only in that EOD data is the most foundational (RS ranking,
breadth) and derivatives the most speculative -- fetched last so a partial
run still gets the higher-value feeds done first within any time budget.
Index levels (NIFTY 50 / NIFTY BANK, added for the GraphAlpha dashboard's
hero cards) sit right after EOD -- same static-file host/confidence tier,
and it's the other feed run_pipeline.py's market_indices/momentum-chart
export depends on.
"""

import traceback

STEPS = [
    ("EOD price/volume + NIFTY500 benchmark", "fetch_eod_data"),
    ("NIFTY 50 / NIFTY BANK index levels", "fetch_index_levels"),
    ("Bulk/block deals", "fetch_bulk_deals"),
    ("FII/DII flow", "fetch_fii_dii"),
    ("F&O open interest", "fetch_derivatives"),
]


def main():
    results = {}
    for label, module_name in STEPS:
        print(f"\n=== {label} ({module_name}.py) ===")
        try:
            module = __import__(module_name)
            module.main()
            results[label] = "OK"
        except Exception:
            print(f"[ERROR] {label} fetch failed -- continuing with the remaining feeds.")
            traceback.print_exc()
            results[label] = "FAILED"

    print("\n=== Fetch summary ===")
    for label, status in results.items():
        print(f"  {status:6s}  {label}")

    if all(status == "FAILED" for status in results.values()):
        print("\n[WARN] Every feed failed. Today's dashboard will look identical to a run with "
              "no live data wired up at all -- worth checking NSE reachability/schema before "
              "assuming this is transient.")


if __name__ == "__main__":
    main()
