// ============================================================
// schema_extensions.cypher
// Additive schema for macro/commodity linkage + graph-analytics
// property slots. Designed to stay well inside Aura Free's
// 200k node / 400k relationship ceiling.
// ============================================================

// --- Constraints (idempotent, safe to re-run) ---
CREATE CONSTRAINT stock_ticker_unique IF NOT EXISTS
FOR (s:Stock) REQUIRE s.ticker IS UNIQUE;

CREATE CONSTRAINT sector_name_unique IF NOT EXISTS
FOR (s:Sector) REQUIRE s.name IS UNIQUE;

CREATE CONSTRAINT macro_name_unique IF NOT EXISTS
FOR (m:MacroFactor) REQUIRE m.name IS UNIQUE;

// --- New node type: MacroFactor (commodities, currencies, rates) ---
// Kept as a SINGLE label with a `factor_type` property rather than separate
// Commodity/Currency/Rate labels -- fewer labels to index, same query
// expressiveness via WHERE m.factor_type = '...'.
MERGE (:MacroFactor {name: "CRUDE_OIL", factor_type: "COMMODITY"});
MERGE (:MacroFactor {name: "USD_INR",   factor_type: "CURRENCY"});
MERGE (:MacroFactor {name: "STEEL",     factor_type: "COMMODITY"});
MERGE (:MacroFactor {name: "COPPER",    factor_type: "COMMODITY"});
MERGE (:MacroFactor {name: "10Y_GSEC",  factor_type: "RATE"});

// --- New relationship types: sector-level macro sensitivity ---
// Direction encodes whether a RISE in the factor helps (TAILWIND) or hurts
// (HEADWIND/INPUT_COST) the sector -- explicit relationship type rather than
// a signed property, so a plain MATCH pattern tells the story on its own.
MATCH (m:MacroFactor {name: "CRUDE_OIL"}), (sec:Sector {name: "Oil & Gas Marketing"})
MERGE (m)-[:INPUT_COST_FOR {sensitivity: "HIGH"}]->(sec);

MATCH (m:MacroFactor {name: "USD_INR"}), (sec:Sector {name: "IT Services"})
MERGE (m)-[:TAILWIND_FOR {sensitivity: "HIGH"}]->(sec);

MATCH (m:MacroFactor {name: "USD_INR"}), (sec:Sector {name: "Pharmaceuticals"})
MERGE (m)-[:TAILWIND_FOR {sensitivity: "MEDIUM"}]->(sec);

MATCH (m:MacroFactor {name: "10Y_GSEC"}), (sec:Sector {name: "Banking"})
MERGE (m)-[:HEADWIND_FOR {sensitivity: "HIGH"}]->(sec);

// --- Property slots written by graph_centrality.py ---
// (documented here for reference -- Neo4j properties are schemaless, no DDL needed)
//   Stock.pagerank      FLOAT
//   Stock.betweenness   FLOAT
//   Stock.hub_score     FLOAT    composite 0-1, consumed by the contagion screener
//   Stock.community_id  INTEGER  Louvain cluster membership

// --- Capacity accounting (run before every ingestion batch) ---
// Nodes:  Stock (~750) + Sector (~25) + Industry (~120) + MacroFactor (~10) = ~905 nodes.
//         Budget: 200,000 -- consumed: <1%. Headroom is intentional: DO NOT add
//         per-day price nodes here. Time series stays in CSV/pandas, joined on ticker.
// Rels:   BELONGS_TO/PART_OF (~750-1500) + PARENT_OF/SUBSIDIARY_OF/SUPPLIES_TO
//         (variable, supply-chain dependent) + macro sensitivity edges (~dozens).
//         Budget: 400,000 -- run the census query below after every load to confirm.

// --- Census query: run after every schema change ---
MATCH (n)
WITH labels(n) AS lbls, count(n) AS cnt
UNWIND lbls AS lbl
RETURN lbl AS label, sum(cnt) AS node_count
ORDER BY node_count DESC;

MATCH ()-[r]->()
RETURN type(r) AS rel_type, count(r) AS rel_count
ORDER BY rel_count DESC;
