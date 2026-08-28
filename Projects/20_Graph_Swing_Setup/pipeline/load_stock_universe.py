"""
load_stock_universe.py
========================
One-time / occasional loader: fetches NSE's official "Nifty Total Market
Index" constituent list (750 stocks -- Nifty 500 + Nifty Microcap 250) and
loads it into Neo4j Aura as the base Stock/Sector structure graph.

Source (public, no auth required):
    https://nsearchives.nseindia.com/content/indices/ind_niftytotalmarket_list.csv
Columns as published: Company Name, Industry, Symbol, Series, ISIN Code

This is NOT part of the daily pipeline -- NSE only rebalances this index
semi-annually, so re-running this script daily would be pointless load on
Aura Free's write quota. Run it once now, and again after each NSE index
reconstitution (typically late March / late September).

Schema created:
    (:Stock {ticker, name, isin, series})
    (:Sector {name})
    (:Stock)-[:BELONGS_TO]->(:Sector)

Capacity impact: ~750 Stock nodes + ~21 Sector nodes + ~750 relationships --
well under Aura Free's 200k node / 400k relationship ceiling, leaving full
headroom for supply-chain / parent-subsidiary edges added later.
"""

import io
import os

import pandas as pd
import requests
from neo4j import GraphDatabase

NSE_URL = "https://nsearchives.nseindia.com/content/indices/ind_niftytotalmarket_list.csv"
BATCH_SIZE = 250

# NSE's archive host rejects requests without a browser-like User-Agent.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}


def fetch_universe() -> pd.DataFrame:
    resp = requests.get(NSE_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    df.columns = [c.strip() for c in df.columns]
    # Defensive rename in case NSE tweaks header casing/spacing again.
    rename_map = {}
    for col in df.columns:
        key = col.strip().lower()
        if key == "company name":
            rename_map[col] = "Company_Name"
        elif key == "industry":
            rename_map[col] = "Sector"
        elif key == "symbol":
            rename_map[col] = "Ticker"
        elif key == "series":
            rename_map[col] = "Series"
        elif key == "isin code":
            rename_map[col] = "ISIN"
    df = df.rename(columns=rename_map)

    required = {"Company_Name", "Sector", "Ticker", "ISIN"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(
            f"NSE CSV schema changed -- missing expected columns {missing}. "
            f"Got columns: {list(df.columns)}. Update the rename_map above."
        )

    df = df.dropna(subset=["Ticker", "Sector"]).drop_duplicates(subset=["Ticker"])
    return df


def load_into_neo4j(driver, df: pd.DataFrame):
    records = df.to_dict("records")
    with driver.session() as session:
        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i : i + BATCH_SIZE]
            session.run(
                """
                UNWIND $rows AS row
                MERGE (sec:Sector {name: row.Sector})
                MERGE (s:Stock {ticker: row.Ticker})
                SET s.name = row.Company_Name,
                    s.isin = row.ISIN,
                    s.series = row.Series
                MERGE (s)-[:BELONGS_TO]->(sec)
                """,
                rows=batch,
            )


def main():
    print(f"Fetching official NSE Total Market constituent list from {NSE_URL} ...")
    df = fetch_universe()
    n_stocks = df["Ticker"].nunique()
    n_sectors = df["Sector"].nunique()
    print(f"Parsed {n_stocks} unique tickers across {n_sectors} sectors.")
    print(f"Projected graph impact: ~{n_stocks + n_sectors} nodes, ~{n_stocks} relationships "
          f"(Aura Free ceiling: 200,000 nodes / 400,000 relationships).")

    driver = GraphDatabase.driver(
        os.environ["NEO4J_URI"],
        auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
    )
    try:
        load_into_neo4j(driver, df)
        with driver.session() as session:
            stock_count = session.run("MATCH (s:Stock) RETURN count(s) AS c").single()["c"]
            sector_count = session.run("MATCH (s:Sector) RETURN count(s) AS c").single()["c"]
            rel_count = session.run("MATCH ()-[r:BELONGS_TO]->() RETURN count(r) AS c").single()["c"]
        print(f"Neo4j now holds: {stock_count} Stock nodes, {sector_count} Sector nodes, "
              f"{rel_count} BELONGS_TO relationships.")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
