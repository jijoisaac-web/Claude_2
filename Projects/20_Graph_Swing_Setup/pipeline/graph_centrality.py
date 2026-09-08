"""
graph_centrality.py
====================
Graph analytics layer for the Nifty 750 structure graph on Neo4j Aura.

CRITICAL ARCHITECTURE NOTE:
Neo4j Aura FREE tier does NOT include the Graph Data Science (GDS) plugin.
All centrality / community detection below is computed in Python via
networkx after pulling the graph structure through plain Cypher -- this
keeps the build on the free tier while still getting native graph-algorithm
output. Results are written back as node properties so downstream Cypher
queries can filter/sort on them directly.

Writes are batched (UNWIND + MERGE) to stay efficient against Aura Free's
memory headroom and the 400k relationship / 200k node ceiling.

BUG FIX (2026-08-28): fetch_graph() originally only pulled Stock-to-Stock
relationships (MATCH (a:Stock)-[r:...]->(b:Stock)). Until supply-chain /
ownership edges are curated, BELONGS_TO -- (:Stock)-[:BELONGS_TO]->(:Sector)
-- is the ONLY relationship type actually populated, and its target is a
:Sector node, never a :Stock node. That query therefore matched zero rows,
so every Stock node landed in the graph fully isolated (0 edges). The
observable symptom on the very first real run: Hub_Score = exactly 0.5 for
every single stock (PageRank/PageRank_max = 1 for all when PageRank is
uniform across an edgeless graph; betweenness and out-degree both collapse
to the "or 1e-9" fallback and contribute 0), and Louvain assigned every
stock its own singleton community (0, 1, 2, ... in node-insertion order,
since there was no structure to cluster on). Fix: fetch_graph() now also
pulls BELONGS_TO edges and includes Sector nodes in the graph purely as
structure -- something for PageRank to flow through and for Louvain to
cluster around -- while compute_centrality()/compute_communities() filter
Sector nodes back out before returning, since scores are only ever reported
and written for Stock nodes.

Requires: neo4j, networkx, pandas, python-dotenv
Environment variables expected: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
"""

import os
import pandas as pd
import networkx as nx
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.environ["NEO4J_URI"]          # e.g. neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER = os.environ["NEO4J_USER"]
NEO4J_PASSWORD = os.environ["NEO4J_PASSWORD"]

BATCH_SIZE = 500  # keep write transactions small

# Which relationship types feed the centrality graph, and their traversal weight.
# Supply-chain / ownership edges carry more contagion weight than a shared-sector edge,
# which is too coarse (hundreds of stocks) to treat as a strong structural link -- it's
# included at low weight so the graph isn't fully disconnected before those edges exist.
# CORRELATED_WITH (see correlation_edges.py, added 2026-08-28) sits in between: real,
# data-driven structure derived from actual price co-movement -- not a guess -- but
# still statistical association, not confirmed corporate/supply-chain causation, so it's
# weighted below the ownership tier. GROUP_AFFILIATE_OF (see corporate_group_edges.py,
# added 2026-08-28) sits between CORRELATED_WITH and confirmed ownership: "same
# promoter family/conglomerate" is real, non-statistical structure (not a guess, and
# stronger propagation evidence than mere price co-movement) but weaker than a
# confirmed listed-to-listed majority-ownership or supply-chain link, since sibling
# group companies can and do move independently on their own company-specific news.
# SUPPLIES_TO/PARENT_OF/SUBSIDIARY_OF/GROUP_AFFILIATE_OF are now populated by
# corporate_group_edges.py's curated starter set (a handful of major conglomerate
# groups); CORRELATED_WITH remains the broader, fully data-driven source of structure
# across the rest of the universe.
EDGE_WEIGHTS = {
    "SUPPLIES_TO": 3.0,
    "PARENT_OF": 3.0,
    "SUBSIDIARY_OF": 3.0,
    "GROUP_AFFILIATE_OF": 2.2,  # curated "same conglomerate family," see corporate_group_edges.py
    "CORRELATED_WITH": 1.5,  # data-driven price co-movement, see correlation_edges.py
    "PART_OF": 1.0,      # industry
    "BELONGS_TO": 0.5,   # sector
}

# Prefix used to namespace Sector nodes in the networkx graph so a sector name can
# never collide with a ticker symbol (both are added as plain string node IDs).
SECTOR_PREFIX = "SECTOR::"


def fetch_graph(driver) -> nx.DiGraph:
    """
    Pull all Stock nodes plus every structural relationship that connects
    them: direct Stock-to-Stock edges (SUPPLIES_TO / PARENT_OF /
    SUBSIDIARY_OF / PART_OF) when present, and Stock-to-Sector BELONGS_TO
    edges, which today are the only edges actually populated. Sector nodes
    are added to the networkx graph (namespaced with SECTOR_PREFIX) purely
    as structure -- callers that report per-stock results filter them back
    out.
    """
    g = nx.DiGraph()
    with driver.session() as session:
        for record in session.run("MATCH (s:Stock) RETURN s.ticker AS ticker"):
            g.add_node(record["ticker"], node_type="Stock")

        stock_rel_types = [t for t in EDGE_WEIGHTS if t != "BELONGS_TO"]
        if stock_rel_types:
            query = f"""
                MATCH (a:Stock)-[r:{'|'.join(stock_rel_types)}]->(b:Stock)
                RETURN a.ticker AS src, b.ticker AS dst, type(r) AS rel_type
            """
            for record in session.run(query):
                weight = EDGE_WEIGHTS.get(record["rel_type"], 0.5)
                g.add_edge(record["src"], record["dst"], weight=weight, rel_type=record["rel_type"])

        for record in session.run(
            "MATCH (s:Stock)-[:BELONGS_TO]->(sec:Sector) RETURN s.ticker AS src, sec.name AS dst"
        ):
            sector_node = f"{SECTOR_PREFIX}{record['dst']}"
            g.add_node(sector_node, node_type="Sector")
            g.add_edge(record["src"], sector_node, weight=EDGE_WEIGHTS["BELONGS_TO"], rel_type="BELONGS_TO")
    return g


def compute_centrality(g: nx.DiGraph) -> pd.DataFrame:
    """
    Compute PageRank, betweenness, and out-degree centrality on the weighted graph.

    DIRECTIONALITY NOTE: standard PageRank rewards nodes that RECEIVE edges (like a
    webpage many others link to). Our edges encode influence flowing outward --
    (Supplier)-[:SUPPLIES_TO]->(Consumer), (Parent)-[:PARENT_OF]->(Subsidiary) -- so
    the node whose breakout should propagate to dependents is the SOURCE, not the
    target. We therefore run PageRank on the reversed graph: inverting edge direction
    turns "many nodes point to me" into "I point to many nodes," which is what we
    actually want a contagion hub to mean. Out-degree centrality reinforces the same
    intuition directly; betweenness stays on the original (forward) direction since
    it measures a node's role as a pass-through link in real supply-chain paths.

    Sector nodes participate in these computations (they're real graph structure --
    e.g. a stock in a small sector gets a bigger reversed-PageRank share per edge
    than one in a large sector) but are excluded from the returned DataFrame, which
    reports Stock nodes only.
    """
    reversed_g = g.reverse(copy=True)
    pagerank = nx.pagerank(reversed_g, weight="weight")
    betweenness = nx.betweenness_centrality(g, weight="weight", normalized=True)
    out_degree = nx.out_degree_centrality(g)

    stock_nodes = [n for n, data in g.nodes(data=True) if data.get("node_type") == "Stock"]
    df = pd.DataFrame({"Ticker": stock_nodes})
    df["PageRank"] = df["Ticker"].map(pagerank)
    df["Betweenness"] = df["Ticker"].map(betweenness)
    df["Out_Degree_Centrality"] = df["Ticker"].map(out_degree)

    pr_max = df["PageRank"].max() or 1e-9
    bt_max = df["Betweenness"].max() or 1e-9
    dg_max = df["Out_Degree_Centrality"].max() or 1e-9

    # Composite "Hub Score" -- the single number the trade screener consumes.
    # Reversed-PageRank weighted heaviest: it captures direct AND propagated
    # downstream influence, not just immediate fan-out.
    df["Hub_Score"] = (
        0.5 * (df["PageRank"] / pr_max)
        + 0.3 * (df["Betweenness"] / bt_max)
        + 0.2 * (df["Out_Degree_Centrality"] / dg_max)
    ).fillna(0)
    return df.sort_values("Hub_Score", ascending=False).reset_index(drop=True)


def compute_communities(g: nx.DiGraph) -> pd.DataFrame:
    """
    Louvain community detection on the undirected projection of the graph.
    Sector nodes are included in the clustering (today they're the only thing
    giving Louvain any structure to cluster on -- without them every stock is
    isolated and lands in its own singleton community) but are stripped out
    of the returned rows, and Community_Size counts Stock members only.
    """
    undirected = g.to_undirected()
    communities = nx.algorithms.community.louvain_communities(undirected, weight="weight", seed=42)
    rows = []
    for community_id, members in enumerate(communities):
        stock_members = [m for m in members if g.nodes[m].get("node_type") == "Stock"]
        for ticker in stock_members:
            rows.append({"Ticker": ticker, "Community_ID": community_id, "Community_Size": len(stock_members)})
    # Explicit columns matter here: pd.DataFrame([]) with no rows produces a
    # DataFrame with ZERO columns, not these three -- and callers merge this
    # onto centrality's output with `on="Ticker"`, which raises KeyError if
    # every community happened to contain only Sector nodes (caught via a
    # smoke test exercising a graph with no Stock-typed nodes at all).
    return pd.DataFrame(rows, columns=["Ticker", "Community_ID", "Community_Size"])


def write_scores_back(driver, scores_df: pd.DataFrame):
    """Batched write of Hub_Score / PageRank / Community_ID onto Stock nodes."""
    records = scores_df.to_dict("records")
    with driver.session() as session:
        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i:i + BATCH_SIZE]
            session.run(
                """
                UNWIND $rows AS row
                MATCH (s:Stock {ticker: row.Ticker})
                SET s.pagerank = row.PageRank,
                    s.betweenness = row.Betweenness,
                    s.hub_score = row.Hub_Score,
                    s.community_id = row.Community_ID
                """,
                rows=batch,
            )


def find_contagion_candidates(g: nx.DiGraph, centrality_df: pd.DataFrame,
                               breakout_tickers: list, max_hops: int = 1,
                               hop_decay: float = 0.5) -> pd.DataFrame:
    """
    Given tickers that just triggered a technical breakout, return their
    graph neighbors (laggard candidates) ranked by how strongly they're
    structurally coupled to the breakout node -- this is the core laggard screen.

    max_hops=1 (default, matches the original single-hop-only screener):
    direct graph neighbors only.

    max_hops=2 additionally surfaces "the laggard's laggard" -- a stock
    reachable only via an intermediate neighbor, not directly connected to
    the breakout ticker itself. These are lower-conviction, earlier-stage
    propagation candidates -- catching them before they're obvious is the
    whole point of a graph-based swing-trading edge, so their Contagion_Score
    is multiplied by hop_decay per additional hop (hop 1: x1.0, hop 2:
    x{hop_decay}) rather than treated as equally strong evidence as a direct
    structural link. A BFS explores each breakout ticker's neighborhood one
    hop at a time and marks nodes visited as soon as they're first reached,
    so a candidate discoverable at multiple hop-distances (e.g. both a direct
    neighbor AND a 2-hop path via a different intermediate) is kept only at
    its shortest, strongest, highest-scored distance -- never double-counted.

    Sector nodes are excluded from "neighbors" at every hop: a stock's own
    sector isn't a laggard candidate, it's the grouping structure the graph
    runs through (though a path CAN legitimately pass through a Sector node
    to reach a 2-hop Stock candidate on the other side of it).
    """
    if max_hops < 1:
        raise ValueError("max_hops must be >= 1")
    candidates = []
    for ticker in breakout_tickers:
        if ticker not in g:
            continue
        visited = {ticker}
        frontier = [ticker]
        for hop in range(1, max_hops + 1):
            next_frontier = []
            for node in frontier:
                raw_neighbors = set(g.predecessors(node)) | set(g.successors(node))
                for neighbor in raw_neighbors:
                    if neighbor in visited:
                        continue
                    visited.add(neighbor)
                    if g.nodes[neighbor].get("node_type") != "Stock":
                        # A Sector (or other non-Stock) node still extends the
                        # frontier for further hops -- traversal passes through
                        # it -- it's just never itself reported as a candidate.
                        next_frontier.append(neighbor)
                        continue
                    next_frontier.append(neighbor)
                    edge_data = g.get_edge_data(node, neighbor) or g.get_edge_data(neighbor, node)
                    weight = edge_data["weight"] if edge_data else 0.5
                    hub_row = centrality_df.loc[centrality_df["Ticker"] == neighbor]
                    hub_score = float(hub_row["Hub_Score"].iloc[0]) if not hub_row.empty else 0.0
                    decay = hop_decay ** (hop - 1)
                    candidates.append({
                        "Breakout_Ticker": ticker,
                        "Laggard_Candidate": neighbor,
                        "Edge_Weight": weight,
                        "Hub_Score": hub_score,
                        "Hops": hop,
                        "Contagion_Score": weight * (1 + hub_score) * decay,
                    })
            frontier = next_frontier
            if not frontier:
                break
    result = pd.DataFrame(candidates)
    if result.empty:
        return result
    return result.sort_values("Contagion_Score", ascending=False).reset_index(drop=True)


def identify_bridge_stocks(g: nx.DiGraph, centrality_df: pd.DataFrame,
                            communities_df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """
    Surface "bridge stocks": nodes with high betweenness centrality (already
    30% of the Hub_Score composite, but blended in rather than reported on
    its own) whose direct neighbors reach into at least one OTHER Louvain
    community besides their own. A stock that structurally sits between two
    different clusters -- often a diversified conglomerate or a company mid
    business-model transition -- tends to be where cross-sector rotation
    shows up first, before it's visible in any single sector's own price
    action. Blended into Hub_Score, this signal is invisible; surfaced on
    its own, it's a distinct, actionable "watch this name for rotation"
    screen.

    THRESHOLD NOTE: this is deliberately ">=1 other community," not ">=2."
    Louvain always resolves a node straddling exactly two clusters INTO one
    of them (it has to be assigned somewhere) -- so the most common real
    bridge case (a stock genuinely connecting cluster A and cluster B) shows
    up as "my own community is A, and I touch B" -- exactly one OTHER
    community, never two, no matter how strong the bridge. Requiring >=2
    would only ever fire for a node straddling three-plus clusters
    simultaneously, which is rare almost to the point of never happening,
    and would silently exclude the entire common case this feature exists
    to catch (caught by a smoke test constructing exactly this two-cluster
    scenario and asserting the bridge node IS flagged).

    Ranked by Betweenness (not the composite Hub_Score, and not the
    Communities_Bridged count) since a stock can be a strong bridge without
    being an overall hub (e.g. modest PageRank/out-degree but a uniquely
    cross-cutting position) -- betweenness is the metric that actually
    measures "how much do shortest paths between OTHER nodes pass through
    me," which is what "bridge" is meant to capture. Communities_Bridged is
    reported alongside as corroborating context, not the primary sort key.

    Sector nodes participate in the neighbor traversal (a stock's neighbors
    legitimately include its own BELONGS_TO Sector node, which itself
    belongs to no Louvain community as a Stock-only concept) but are
    excluded from the "distinct communities touched" count, same as
    everywhere else Sector nodes are structure-only.
    """
    if communities_df.empty or "Community_ID" not in communities_df.columns:
        return pd.DataFrame(columns=[
            "Ticker", "Sector", "Betweenness_Score", "Own_Community_ID",
            "Communities_Bridged", "Bridged_Community_IDs",
        ])

    community_by_ticker = communities_df.set_index("Ticker")["Community_ID"].to_dict()
    betweenness_by_ticker = centrality_df.set_index("Ticker")["Betweenness"].to_dict() \
        if "Betweenness" in centrality_df.columns else {}
    sector_by_ticker = {}

    rows = []
    for ticker, own_community in community_by_ticker.items():
        if ticker not in g:
            continue
        raw_neighbors = set(g.predecessors(ticker)) | set(g.successors(ticker))
        neighbor_communities = set()
        sector = None
        for neighbor in raw_neighbors:
            if g.nodes[neighbor].get("node_type") == "Sector":
                sector = neighbor.split("::", 1)[-1]
                continue
            neighbor_community = community_by_ticker.get(neighbor)
            if neighbor_community is not None and neighbor_community != own_community:
                neighbor_communities.add(neighbor_community)
        if sector:
            sector_by_ticker[ticker] = sector
        if len(neighbor_communities) < 1:
            continue  # not a bridge -- every neighbor is in its own community
        rows.append({
            "Ticker": ticker,
            "Sector": sector_by_ticker.get(ticker),
            "Betweenness_Score": round(betweenness_by_ticker.get(ticker, 0.0) * 100, 2),
            "Own_Community_ID": own_community,
            "Communities_Bridged": len(neighbor_communities),
            "Bridged_Community_IDs": sorted(neighbor_communities),
        })

    result = pd.DataFrame(rows, columns=[
        "Ticker", "Sector", "Betweenness_Score", "Own_Community_ID",
        "Communities_Bridged", "Bridged_Community_IDs",
    ])
    if result.empty:
        return result
    return (
        result.sort_values(["Betweenness_Score", "Communities_Bridged"], ascending=[False, False])
        .head(top_n)
        .reset_index(drop=True)
    )


if __name__ == "__main__":
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    try:
        graph = fetch_graph(driver)
        print(f"Pulled graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges.")

        centrality = compute_centrality(graph)
        communities = compute_communities(graph)
        merged = centrality.merge(communities, on="Ticker", how="left")
        merged.to_csv("graph_centrality.csv", index=False)

        write_scores_back(driver, merged)
        print("Centrality + community scores written back to Neo4j.")

        # Populate from today's confirmed price-action breakouts before running.
        example_breakouts = []
        if example_breakouts:
            contagion = find_contagion_candidates(graph, merged, example_breakouts)
            contagion.to_csv("contagion_candidates.csv", index=False)
    finally:
        driver.close()
