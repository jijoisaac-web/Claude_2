"""
corporate_group_edges.py
=========================
Curated PARENT_OF / SUBSIDIARY_OF / SUPPLIES_TO / GROUP_AFFILIATE_OF edges for
India's largest conglomerate groups -- the "curate real structural edges
instead of relying only on correlation" item from the graph-insights
follow-up. See system_architecture.md's "Graph insights" section: as of
2026-08-28, SUPPLIES_TO/PARENT_OF/SUBSIDIARY_OF are defined in
graph_centrality.EDGE_WEIGHTS at weight 3.0 but have ZERO populated edges --
CORRELATED_WITH (statistical, data-driven) has been doing all the non-sector
structural work. This module gives the contagion screener a second, causal
source of structure: "Tata Motors gaps up on an EV order -> Tata Steel and
other group companies" is a real propagation channel that price correlation
alone can miss or catch late.

WHY A FOURTH EDGE TYPE (GROUP_AFFILIATE_OF), NOT JUST PARENT_OF/SUBSIDIARY_OF
-------------------------------------------------------------------------------
The obvious modeling mistake here would be marking every company in, say, the
Tata group as PARENT_OF/SUBSIDIARY_OF of every other. That's factually wrong:
Tata Motors does not own Tata Steel. Both are independently listed companies
that happen to share a common (unlisted) ultimate holding company, Tata Sons
-- which isn't itself an NSE-listed Stock node in this graph. Modeling
sibling-under-common-ownership as PARENT_OF would overstate the relationship
(implies operational/board control that doesn't exist) and would be exactly
the kind of "confidently wrong" structural claim this pipeline has
deliberately avoided elsewhere (see graph_centrality.py's PageRank
directionality fix, compute_communities()' zero-column fix).

So this module distinguishes three tiers of confidence, each mapped to a
different edge type:
  1. SUPPLIES_TO -- genuine input/output business relationship (steel into
     vehicle manufacturing). Rare in this starter set; only added where the
     relationship is well-documented and directional.
  2. PARENT_OF / SUBSIDIARY_OF -- genuine, current, majority-ownership /
     controlling-stake relationships BETWEEN TWO LISTED ENTITIES (e.g.
     Ambuja Cements holds a majority stake in ACC; Grasim Industries holds a
     majority stake in UltraTech Cement; Mahindra & Mahindra is the
     controlling listed parent of M&M Financial Services). Only used where
     the majority/controlling stake is well-established public knowledge.
  3. GROUP_AFFILIATE_OF (NEW relationship type, weighted BELOW the ownership
     tier but ABOVE CORRELATED_WITH -- see EDGE_WEIGHTS_EXTENSION below) --
     "same ultimate promoter family / conglomerate, not a confirmed
     listed-to-listed ownership chain." Modeled hub-and-spoke around one
     flagship company per group (e.g. TCS for Tata, ADANIENT for Adani)
     rather than a full pairwise clique between every member -- avoids
     O(n^2) edge bloat (Tata alone has 15 members; a full clique would be
     105 edges for one group) while still making every group member
     reachable from every other within 2 hops, which is what the contagion
     screener's traversal actually needs. Written in BOTH directions (same
     pattern as correlation_edges.py's CORRELATED_WITH) since the family
     relationship is symmetric.

CONFIDENCE CAVEAT (same spirit as MacroFactor's "4 hand-written demo edges"
and the FII/DII threshold "placeholders" already flagged elsewhere in this
project): this list was manually curated from public group-structure
knowledge (ownership percentages, demerger history), not from a bulk
authoritative NSE/BSE shareholding-pattern feed -- there is no free bulk
source for corporate group structure the way there is for price/volume data.
Ticker symbols were spot-checked against current NSE listings (including the
2025 Tata Motors demerger into commercial-vehicle and passenger-vehicle
entities) but ownership percentages can drift (stake sales, further
demergers) and this file will not update itself the way price-derived
CORRELATED_WITH edges do on every run. Re-review periodically.

TICKER UNCERTAINTY, HANDLED DEFENSIVELY: a few tickers below are genuinely
ambiguous as of this writing (the Tata Motors demerger is recent enough that
different data providers show different post-demerger symbols). Rather than
guess wrong and silently write nothing, several candidate spellings are
included per uncertain entity -- MATCH on a nonexistent ticker simply returns
zero rows (same graceful no-op as every other MATCH-based writer in this
pipeline), so the wrong guesses cost nothing and the right one still lands.
refresh_structural_edges() logs exactly how many of the curated edges
actually matched two real Stock nodes in THIS run's universe, so drift is
visible in the pipeline log rather than silently swallowed.
"""

import logging

logger = logging.getLogger(__name__)

# Additive to graph_centrality.EDGE_WEIGHTS -- imported and merged in by
# run_pipeline.py / graph_centrality.py rather than duplicated here.
GROUP_AFFILIATE_WEIGHT = 2.2  # between CORRELATED_WITH (1.5) and confirmed ownership (3.0)

# ---------------------------------------------------------------------------
# Tier 1: SUPPLIES_TO -- genuine business input/output relationship.
# (src, dst) meaning src SUPPLIES_TO dst.
# ---------------------------------------------------------------------------
SUPPLIES_TO_EDGES = [
    # Tata Steel is a well-documented primary steel supplier into Tata Motors'
    # vehicle manufacturing. Multiple ticker candidates for the post-2025-
    # demerger passenger/commercial vehicle split -- see module docstring.
    ("TATASTEEL", "TATAMOTORS"),
    ("TATASTEEL", "TMCV"),
    ("TATASTEEL", "TMPV"),
]

# ---------------------------------------------------------------------------
# Tier 2: PARENT_OF -- confirmed, current majority/controlling listed-to-
# listed ownership. (parent, subsidiary) meaning parent PARENT_OF subsidiary.
# ---------------------------------------------------------------------------
PARENT_OF_EDGES = [
    # Adani Group's 2022 acquisition of Ambuja Cements, which itself holds a
    # majority stake in ACC -- a genuine two-listed-company ownership chain.
    ("AMBUJACEM", "ACC"),

    # Mahindra & Mahindra is the listed controlling parent (unlike Tata Sons,
    # M&M itself is the NSE-listed flagship, not a private holding company)
    # of these three -- well-documented majority/controlling promoter stakes.
    ("M&M", "M&MFIN"),
    ("M&M", "TECHM"),
    ("M&M", "MHRIL"),

    # Grasim Industries holds a majority stake in UltraTech Cement and is the
    # promoter/controlling entity behind Aditya Birla Capital.
    ("GRASIM", "ULTRACEMCO"),
    ("GRASIM", "ABCAPITAL"),

    # Bajaj Holdings & Investments is the original (pre-2007-08 demerger)
    # listed holding company; still the promoter-level parent of both.
    ("BAJAJHLDNG", "BAJAJ-AUTO"),
    ("BAJAJHLDNG", "BAJAJFINSV"),
    # Bajaj Finserv in turn holds a majority (~52%) stake in Bajaj Finance.
    ("BAJAJFINSV", "BAJFINANCE"),
]

# ---------------------------------------------------------------------------
# Tier 3: GROUP_AFFILIATE_OF -- same promoter family, hub-and-spoke per group.
# Written in BOTH directions by refresh_structural_edges() (symmetric
# relationship), so only one direction is listed here.
# ---------------------------------------------------------------------------
GROUP_AFFILIATES = {
    # Tata Sons (the true parent) is a private company, not NSE-listed --
    # TCS (by market cap, the group's flagship) stands in as the hub.
    "TCS": [
        "TITAN", "TATASTEEL", "TATAMOTORS", "TMCV", "TMPV", "TRENT",
        "TATAPOWER", "INDHOTEL", "TATACONSUM", "TATACOMM", "VOLTAS",
        "TATAELXSI", "TATACHEM", "TATACAP",
    ],
    # Adani Enterprises historically incubated and demerged several of these;
    # post-demerger they're independently listed siblings under common
    # S B Adani Family Trust ownership, not literal subsidiaries of ADANIENT
    # any more -- hence GROUP_AFFILIATE_OF here rather than PARENT_OF.
    "ADANIENT": [
        "ADANIPORTS", "ADANIPOWER", "ADANIGREEN", "ADANIENSOL",
        "AMBUJACEM", "ATGL", "ACC", "AWL", "NDTV",
    ],
    # Smaller/less-certain-ownership Mahindra group members (the high-
    # confidence majority-stake ones are in PARENT_OF_EDGES above instead).
    "M&M": ["MAHLIFE", "MAHLOG", "SWARAJENG", "MAHEPC"],
    # Aditya Birla Group members without a clean listed-to-listed majority
    # ownership chain to Grasim (cross-holdings across the group are complex
    # and not fully public) -- affiliated, not asserted as owned.
    "GRASIM": ["HINDALCO", "ABFRL", "IDEA", "CENTURYTEX"],
    # Reliance Industries / Jio Financial Services: fully demerged in 2023
    # into an independently listed sibling under the same Ambani family
    # promoter group -- explicitly NOT modeled as PARENT_OF post-demerger.
    "RELIANCE": ["JIOFIN"],
}


def build_edge_list():
    """
    Flatten the three tiers above into a single list of
    (src_ticker, rel_type, dst_ticker) tuples, ready to MERGE into Neo4j.
    GROUP_AFFILIATE_OF pairs are expanded in both directions here.
    """
    edges = []
    for src, dst in SUPPLIES_TO_EDGES:
        edges.append((src, "SUPPLIES_TO", dst))
    for parent, child in PARENT_OF_EDGES:
        edges.append((parent, "PARENT_OF", child))
        edges.append((child, "SUBSIDIARY_OF", parent))
    for hub, spokes in GROUP_AFFILIATES.items():
        for spoke in spokes:
            edges.append((hub, "GROUP_AFFILIATE_OF", spoke))
            edges.append((spoke, "GROUP_AFFILIATE_OF", hub))
    return edges


def refresh_structural_edges(driver, batch_size: int = 500) -> dict:
    """
    Full refresh of curated structural edges: delete every existing edge of
    the four curated types (identified by rel.source = "curated_static", so
    this never touches CORRELATED_WITH or BELONGS_TO), then MERGE in the
    current curated set. Returns a small dict of {requested, written} so the
    caller can log how many of the curated pairs actually matched two real
    Stock nodes in this run's universe -- the self-reporting diagnostic
    described in the module docstring's "TICKER UNCERTAINTY" section.
    """
    edges = build_edge_list()
    with driver.session() as session:
        session.run(
            "MATCH ()-[r]->() WHERE r.source = 'curated_static' DELETE r"
        )
        if not edges:
            return {"requested": 0, "written": 0}

        rows = [{"a": a, "rel": rel, "b": b} for a, rel, b in edges]
        written = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            # Cypher can't parameterize a relationship TYPE, only properties --
            # group this batch by rel type so each MERGE uses a literal type
            # (still fully parameterized on the ticker values themselves).
            by_type = {}
            for row in batch:
                by_type.setdefault(row["rel"], []).append(row)
            for rel_type, type_rows in by_type.items():
                weight = GROUP_AFFILIATE_WEIGHT if rel_type == "GROUP_AFFILIATE_OF" else 3.0
                result = session.run(
                    f"""
                    UNWIND $rows AS row
                    MATCH (a:Stock {{ticker: row.a}}), (b:Stock {{ticker: row.b}})
                    MERGE (a)-[rel:{rel_type}]->(b)
                    SET rel.weight = $weight, rel.source = 'curated_static'
                    RETURN count(rel) AS n
                    """,
                    rows=type_rows, weight=weight,
                )
                written += result.single()["n"]
    logger.info(
        "Structural edges (curated): %d requested, %d matched real Stock nodes and written.",
        len(edges), written,
    )
    return {"requested": len(edges), "written": written}


if __name__ == "__main__":
    import os
    from neo4j import GraphDatabase

    logging.basicConfig(level=logging.INFO)
    driver = GraphDatabase.driver(
        os.environ["NEO4J_URI"], auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"])
    )
    try:
        stats = refresh_structural_edges(driver)
        print(f"Curated structural edges: {stats['written']}/{stats['requested']} written.")
    finally:
        driver.close()
