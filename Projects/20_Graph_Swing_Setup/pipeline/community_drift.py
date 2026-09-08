"""
community_drift.py
====================
Day-over-day Louvain community-membership drift detection -- the "community
drift as an alert" item from the graph-insights follow-up. A stock quietly
shifting which cluster of stocks it structurally behaves like (before that
shift is visible in price, sector classification, or index reconstitution
announcements) is exactly the kind of early, non-obvious signal this
graph-analytics layer exists to surface.

WHY THIS COMPARES PEER SETS, NOT RAW Community_ID VALUES
-----------------------------------------------------------
sector_rotation.py's own docstring already flags this trap: "Louvain's
integer IDs aren't stable run to run." Louvain assigns community labels in
whatever order its internal algorithm happens to enumerate them in a given
run -- community 7 today and community 3 tomorrow could be the SAME set of
stocks with zero real drift, or a genuinely different community that
happened to get reassigned the number a stable-looking group used
yesterday. Comparing raw Community_ID day-over-day would produce constant
false-positive "drift" noise (or worse, false-negative silence) with no
relationship to anything real.

Instead, this module compares each stock's PEER SET -- the other tickers
that share its community -- via Jaccard overlap. That's invariant to
whatever arbitrary integer label Louvain assigns either day: if a stock's
peer group is materially the same set of companies, it hasn't drifted, no
matter what the two runs numbered that cluster. If the peer group has
genuinely reshuffled, the overlap score reflects that directly.

SNAPSHOT DESIGN: a single overwritten "yesterday" file, not an accumulating
history
-----------------------------------------------------------------------------
Unlike daily_eod.csv / sector_rotation_history.csv / index_levels.csv (which
need real trend depth -- RS ranking needs 252 days, momentum charts need
many points), drift detection only ever needs a ONE-day lookback: "did my
peer group change since the last time this ran." So
data/community_snapshot.csv holds only the most recent run's peer sets and
is fully overwritten every run, not appended to -- a deliberately different
persistence pattern from this pipeline's other accumulating CSVs, chosen
because accumulating would just be unused dead weight here.
"""

from pathlib import Path

import pandas as pd

MIN_COMMUNITY_SIZE = 3        # below this, peer churn is noisy/meaningless, not a real signal
MIN_OVERLAP_PCT_FLAG = 50.0   # peer-set Jaccard overlap below this -> flagged as drift
SAMPLE_PEERS_SHOWN = 5        # how many peer tickers to include per side for the UI's "was with / now with" copy


def compute_peer_sets(communities_df: pd.DataFrame) -> dict:
    """{Ticker: frozenset(other tickers in the same Louvain community)},
    restricted to communities with at least MIN_COMMUNITY_SIZE Stock
    members (a singleton or pair "community" has no meaningful peer set to
    track drift against)."""
    if communities_df is None or communities_df.empty:
        return {}
    peer_sets = {}
    for community_id, group in communities_df.groupby("Community_ID"):
        members = group["Ticker"].tolist()
        if len(members) < MIN_COMMUNITY_SIZE:
            continue
        member_set = frozenset(members)
        for ticker in members:
            peer_sets[ticker] = member_set - {ticker}
    return peer_sets


def load_prev_snapshot(path: Path) -> dict:
    """{Ticker: frozenset(peer tickers)} from the last run's snapshot, or {}
    if this is the first run after the feature shipped (or the file was
    otherwise never written) -- callers must treat that as 'no drift
    computable yet', not an error, same as every other first-day-of-a-new-
    export gap in this pipeline (index_levels.csv, sector_rotation_history.csv)."""
    if not path.exists():
        return {}
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    if df.empty or "Ticker" not in df.columns or "Peers" not in df.columns:
        return {}
    out = {}
    for _, row in df.iterrows():
        peers = row["Peers"].split("|") if row["Peers"] else []
        out[row["Ticker"]] = frozenset(p for p in peers if p)
    return out


def save_snapshot(peer_sets: dict, path: Path):
    """Overwrite data/community_snapshot.csv with today's peer sets, for
    tomorrow's run to diff against. See module docstring for why this is a
    single overwritten file rather than an accumulating history."""
    rows = [
        {"Ticker": ticker, "Peers": "|".join(sorted(peers))}
        for ticker, peers in sorted(peer_sets.items())
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows, columns=["Ticker", "Peers"]).to_csv(path, index=False)


def compute_community_drift(current_peer_sets: dict, prev_peer_sets: dict,
                             sector_by_ticker: dict = None,
                             min_overlap_pct: float = MIN_OVERLAP_PCT_FLAG) -> pd.DataFrame:
    """
    For every ticker present in BOTH today's and yesterday's snapshot (a
    ticker missing from either side -- newly listed, dropped out of a
    trackable-size community, or this being the very first comparable run --
    is skipped, not flagged), compute the Jaccard overlap of its peer set
    day-over-day. Tickers whose overlap falls below min_overlap_pct are
    returned, sorted by overlap ascending (biggest drift first).
    """
    sector_by_ticker = sector_by_ticker or {}
    rows = []
    common_tickers = set(current_peer_sets) & set(prev_peer_sets)
    for ticker in common_tickers:
        current_peers = current_peer_sets[ticker]
        prev_peers = prev_peer_sets[ticker]
        union = current_peers | prev_peers
        if not union:
            continue  # both sides empty -- nothing to compare (shouldn't happen given MIN_COMMUNITY_SIZE, but safe)
        overlap_pct = round(len(current_peers & prev_peers) / len(union) * 100, 1)
        if overlap_pct >= min_overlap_pct:
            continue
        rows.append({
            "Ticker": ticker,
            "Sector": sector_by_ticker.get(ticker),
            "Overlap_Pct": overlap_pct,
            "Prior_Peer_Count": len(prev_peers),
            "Current_Peer_Count": len(current_peers),
            "Sample_Prior_Peers": sorted(prev_peers)[:SAMPLE_PEERS_SHOWN],
            "Sample_Current_Peers": sorted(current_peers)[:SAMPLE_PEERS_SHOWN],
        })
    result = pd.DataFrame(rows, columns=[
        "Ticker", "Sector", "Overlap_Pct", "Prior_Peer_Count", "Current_Peer_Count",
        "Sample_Prior_Peers", "Sample_Current_Peers",
    ])
    if result.empty:
        return result
    return result.sort_values("Overlap_Pct", ascending=True).reset_index(drop=True)


if __name__ == "__main__":
    # Manual/local smoke run against a saved graph_centrality.csv, if present.
    import sys

    snapshot_path = Path("data/community_snapshot.csv")
    try:
        communities = pd.read_csv("graph_centrality.csv")
    except FileNotFoundError:
        print("No local graph_centrality.csv to test against -- run graph_centrality.py first.")
        sys.exit(0)

    current = compute_peer_sets(communities)
    prev = load_prev_snapshot(snapshot_path)
    drift = compute_community_drift(current, prev)
    comparable = len(set(current) & set(prev))
    print(f"{len(drift)} tickers flagged for community drift (of {comparable} comparable).")
    save_snapshot(current, snapshot_path)
    print(f"Snapshot written to {snapshot_path} for tomorrow's comparison.")
