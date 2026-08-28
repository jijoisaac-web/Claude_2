"""
correlation_edges.py
=====================
Derives CORRELATED_WITH edges between Stock nodes directly from the
accumulated price history in daily_eod.csv, as a data-driven proxy for real
structural relationships (supply chain, common ownership, shared factor
exposure) that would otherwise require manual research to source one company
at a time. See system_architecture.md's graph-insights discussion for the
rationale -- until SUPPLIES_TO/PARENT_OF/SUBSIDIARY_OF are curated, this is
the only source of graph structure beyond plain sector co-membership
(BELONGS_TO), and it's the reason Hub_Score/community detection currently
just reflects sector size rather than genuine structural influence.

Recomputed in FULL every run, not incrementally -- correlations drift as the
trailing window rolls forward, and a stale edge is worse than a refreshed
one. The edge count is kept small (top-K strongest peers per ticker, above a
floor) so a full refresh stays cheap against both Aura Free's write budget
and GitHub Actions runtime: ~750 tickers x 8 neighbors x 2 directions is
~12,000 edges, well inside the 400k relationship ceiling even stacked on top
of everything else in the graph.
"""

import pandas as pd

BENCHMARK_TICKER = "NIFTY500"
CORRELATION_LOOKBACK_DAYS = 120       # trailing trading sessions used for the correlation window
MIN_CORRELATION_LOOKBACK_DAYS = 60    # below this, a correlation is too noisy to trust -- skip the whole step
TOP_K_PER_TICKER = 8                  # cap neighbors per ticker so the graph stays sparse and meaningful
MIN_CORRELATION = 0.6                 # keep only genuinely strong co-movement, not market-wide beta noise
CORRELATION_EDGE_WEIGHT = 1.5         # between BELONGS_TO (0.5, coarse sector bucket) and confirmed
                                       # ownership/supply-chain edges (3.0) -- real, data-driven, but not
                                       # as strong evidence as a confirmed corporate structural link


def compute_return_matrix(eod_df: pd.DataFrame, lookback_days: int = CORRELATION_LOOKBACK_DAYS):
    """
    Wide matrix of daily % returns, tickers as columns, trailing `lookback_days`
    trading sessions. Excludes the NIFTY500 benchmark row -- correlating every
    stock to the index it's already measured against isn't the point here;
    we want genuine stock-to-stock co-movement.

    Returns None if there isn't enough accumulated history yet to trust the
    result (e.g. right after a fresh backfill, or a short retention window) --
    callers should skip the correlation-edge step entirely in that case
    rather than write noisy edges.
    """
    df = eod_df[eod_df["Ticker"] != BENCHMARK_TICKER]
    wide = df.pivot(index="Date", columns="Ticker", values="Close").sort_index()
    wide = wide.tail(lookback_days)
    if len(wide) < MIN_CORRELATION_LOOKBACK_DAYS:
        return None
    returns = wide.pct_change().dropna(how="all")
    return returns


def compute_top_correlated_pairs(returns: pd.DataFrame, top_k: int = TOP_K_PER_TICKER,
                                  min_corr: float = MIN_CORRELATION) -> pd.DataFrame:
    """
    Pairwise correlation of the return matrix, kept sparse: only each ticker's
    top-K positively-correlated peers above min_corr survive as edges.

    Negative correlation isn't modeled as an edge in this first version --
    CORRELATED_WITH is meant to read as "moves together," the same
    directional sense (propagation of strength) as the contagion screener's
    other edge types. An anti-correlated pair is a different kind of signal
    (a hedge/pairs-trade relationship) that would need its own edge type and
    its own consumer logic -- not built here.

    Tickers with too little overlapping history in the window (recent
    listings, long trading halts) are dropped before correlating rather than
    left in, so a handful of shared sessions can't produce a spuriously high
    correlation.
    """
    min_overlap = int(len(returns) * 0.8)
    valid_cols = returns.columns[returns.notna().sum() >= min_overlap]
    returns = returns[valid_cols]
    if returns.shape[1] < 2:
        return pd.DataFrame(columns=["Ticker_A", "Ticker_B", "Correlation"])

    corr = returns.corr(min_periods=min_overlap)

    pairs = []
    for ticker in corr.columns:
        row = corr[ticker].drop(index=ticker, errors="ignore").dropna()
        row = row[row >= min_corr].sort_values(ascending=False).head(top_k)
        for peer, value in row.items():
            pairs.append({"Ticker_A": ticker, "Ticker_B": peer, "Correlation": round(float(value), 3)})
    return pd.DataFrame(pairs)


def refresh_correlation_edges(driver, pairs_df: pd.DataFrame, batch_size: int = 500) -> int:
    """
    Full refresh: delete every existing CORRELATED_WITH edge, then write the
    fresh set in both directions (the relationship is symmetric; Neo4j
    relationships aren't, so writing both directions means graph_centrality's
    directed traversal -- and find_contagion_candidates' predecessor/successor
    lookup -- sees the link regardless of which ticker it starts from).
    Returns the number of directed edges written.
    """
    with driver.session() as session:
        session.run("MATCH ()-[r:CORRELATED_WITH]->() DELETE r")
        if pairs_df.empty:
            return 0

        rows = []
        for r in pairs_df.to_dict("records"):
            rows.append({"a": r["Ticker_A"], "b": r["Ticker_B"], "weight": CORRELATION_EDGE_WEIGHT, "correlation": r["Correlation"]})
            rows.append({"a": r["Ticker_B"], "b": r["Ticker_A"], "weight": CORRELATION_EDGE_WEIGHT, "correlation": r["Correlation"]})

        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            session.run(
                """
                UNWIND $rows AS row
                MATCH (a:Stock {ticker: row.a}), (b:Stock {ticker: row.b})
                MERGE (a)-[rel:CORRELATED_WITH]->(b)
                SET rel.weight = row.weight, rel.correlation = row.correlation
                """,
                rows=batch,
            )
        return len(rows)


if __name__ == "__main__":
    import os
    from neo4j import GraphDatabase

    eod = pd.read_csv("daily_eod.csv", parse_dates=["Date"])
    returns = compute_return_matrix(eod)
    if returns is None:
        print(f"Insufficient history (<{MIN_CORRELATION_LOOKBACK_DAYS} trading days) for correlation edges -- skipped.")
    else:
        pairs = compute_top_correlated_pairs(returns)
        pairs.to_csv("correlation_pairs.csv", index=False)
        print(f"Computed {len(pairs)} correlation pairs from {len(returns)} trading days of history.")

        driver = GraphDatabase.driver(
            os.environ["NEO4J_URI"], auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"])
        )
        try:
            n = refresh_correlation_edges(driver, pairs)
            print(f"Wrote {n} directed CORRELATED_WITH edges to Neo4j.")
        finally:
            driver.close()
