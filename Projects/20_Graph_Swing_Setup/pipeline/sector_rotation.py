"""
sector_rotation.py
===================
Aggregates existing per-stock RS Ranking output up to the sector level, and
tracks it day-over-day -- the literal "sectoral rotation" pillar of this
project's original brief, which nothing computed until now despite both
RS Rating (rs_ranking.py) and sector membership (Neo4j BELONGS_TO) already
being available every run. No new data source, no new fetch -- pure
aggregation of what's already flowing through the pipeline.

Sector identity is kept stable across runs by grouping on the Sector node's
NAME (from Neo4j), not on Louvain Community_ID -- Louvain's integer IDs
aren't guaranteed to stay assigned to "the same" cluster from one run to the
next, which would silently break a day-over-day trend. This also means the
rotation view doesn't depend on community detection succeeding at all, only
on the same BELONGS_TO membership load_stock_universe.py already writes.

INPUT CONTRACT
--------------
rs_df: full compute_rs_ranking() output (NOT truncated to top 20) --
       Ticker, RS_Rating, ...
sector_map: {ticker: sector_name}, from fetch_sector_map() below.

OUTPUT
------
data/sector_rotation_history.csv (accumulating, like daily_eod.csv):
    Date, Sector, Avg_RS_Rating, Median_RS_Rating, Member_Count
Returned to the caller: today's snapshot per sector, enriched with
Change_1D (today's Avg_RS_Rating minus the most recent PRIOR trading day
this sector has a row for -- not necessarily yesterday's calendar date, so a
weekend/holiday gap or a sector that briefly dropped below the minimum
member threshold doesn't produce a bogus jump).
"""

from pathlib import Path

import pandas as pd

ROTATION_HISTORY_RETENTION_DAYS = 90
MIN_TICKERS_PER_SECTOR = 3  # sectors with fewer RS-eligible members produce a noisy, low-confidence average


def fetch_sector_map(driver) -> dict:
    """{ticker: sector_name} for every Stock currently linked via BELONGS_TO."""
    with driver.session() as session:
        result = session.run(
            "MATCH (s:Stock)-[:BELONGS_TO]->(sec:Sector) RETURN s.ticker AS ticker, sec.name AS sector"
        )
        return {record["ticker"]: record["sector"] for record in result}


def compute_sector_rotation(rs_df: pd.DataFrame, sector_map: dict) -> pd.DataFrame:
    """
    rs_df must be the FULL RS ranking output (every ticker that had enough
    history to get an RS_Rating), not a top-N slice -- truncating first would
    silently bias every sector average toward whichever sectors happen to
    dominate the top of the list.
    """
    df = rs_df[["Ticker", "RS_Rating"]].copy()
    df["Sector"] = df["Ticker"].map(sector_map)
    df = df.dropna(subset=["Sector"])

    grouped = df.groupby("Sector").agg(
        Avg_RS_Rating=("RS_Rating", "mean"),
        Median_RS_Rating=("RS_Rating", "median"),
        Member_Count=("Ticker", "count"),
    ).reset_index()
    grouped = grouped[grouped["Member_Count"] >= MIN_TICKERS_PER_SECTOR].copy()
    grouped["Avg_RS_Rating"] = grouped["Avg_RS_Rating"].round(1)
    grouped["Median_RS_Rating"] = grouped["Median_RS_Rating"].round(1)
    return grouped.sort_values("Avg_RS_Rating", ascending=False).reset_index(drop=True)


def update_rotation_history(today_df: pd.DataFrame, as_of_date, history_path: Path) -> pd.DataFrame:
    """
    Appends today's per-sector snapshot to the accumulating history CSV
    (creating it on the first run), prunes to the retention window, and
    returns today's rows enriched with Change_1D vs. each sector's most
    recent prior entry.
    """
    as_of_date = pd.Timestamp(as_of_date)
    today_rows = today_df.copy()
    today_rows["Date"] = as_of_date
    today_rows = today_rows[["Date", "Sector", "Avg_RS_Rating", "Median_RS_Rating", "Member_Count"]]

    existing = pd.read_csv(history_path, parse_dates=["Date"]) if history_path.exists() else pd.DataFrame()
    combined = pd.concat([existing, today_rows], ignore_index=True) if not existing.empty else today_rows
    combined = combined.drop_duplicates(subset=["Date", "Sector"], keep="last")

    cutoff = as_of_date - pd.Timedelta(days=ROTATION_HISTORY_RETENTION_DAYS)
    combined = combined[combined["Date"] >= cutoff].sort_values(["Sector", "Date"])

    history_path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(history_path, index=False)

    combined["Prev_Avg_RS_Rating"] = combined.groupby("Sector")["Avg_RS_Rating"].shift(1)
    latest = combined[combined["Date"] == combined["Date"].max()].copy()
    latest["Change_1D"] = (latest["Avg_RS_Rating"] - latest["Prev_Avg_RS_Rating"]).round(1)
    latest = latest.drop(columns=["Prev_Avg_RS_Rating"])
    return latest.sort_values("Avg_RS_Rating", ascending=False).reset_index(drop=True)
