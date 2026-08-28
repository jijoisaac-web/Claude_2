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
EDGE_WEIGHTS = {
    "SUPPLIES_TO": 3.0,
    "PARENT_OF": 3.0,
    "SUBSIDIARY_OF": 3.0,
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
    return pd.DataFrame(rows)


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
                               breakout_tickers: list) -> pd.DataFrame:
    """
    Given tickers that just triggered a technical breakout, return their direct
    graph neighbors (laggard candidates) ranked by how strongly they're
    structurally coupled to the breakout node -- this is the core laggard screen.

    Sector nodes are excluded from "neighbors": a stock's own sector isn't a
    laggard candidate, it's the grouping structure the graph runs through.
    """
    candidates = []
    for ticker in breakout_tickers:
        if ticker not in g:
            continue
        raw_neighbors = set(g.predecessors(ticker)) | set(g.successors(ticker))
        neighbors = {n for n in raw_neighbors if g.nodes[n].get("node_type") == "Stock"}
        for neighbor in neighbors:
            edge_data = g.get_edge_data(ticker, neighbor) or g.get_edge_data(neighbor, ticker)
            weight = edge_data["weight"] if edge_data else 0.5
            hub_row = centrality_df.loc[centrality_df["Ticker"] == neighbor]
            hub_score = float(hub_row["Hub_Score"].iloc[0]) if not hub_row.empty else 0.0
            candidates.append({
                "Breakout_Ticker": ticker,
                "Laggard_Candidate": neighbor,
                "Edge_Weight": weight,
                "Hub_Score": hub_score,
                "Contagion_Score": weight * (1 + hub_score),
            })
    result = pd.DataFrame(candidates)
    if result.empty:
        return result
    return result.sort_values("Contagion_Score", ascending=False).reset_index(drop=True)


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
