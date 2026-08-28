"""
swing_score.py
================
Composite Swing_Score (0-100) blending every signal pillar the pipeline
already computes into one ranked number per stock, plus a tier label --
"the daily opportunity engine" the user asked for, built entirely from
data already flowing through the pipeline (RS ranking, technical signals,
sector rotation, graph centrality, market breadth).

Pillar weights follow the user's original 7-factor design:
    Technical 30%, Relative Strength 15%, Volume 15%, Sector 15%,
    Catalyst 10%, Graph Structure 10%, Market Regime 5%
Catalyst (news/earnings/order-win sentiment) has no data source wired up
yet -- see system_architecture.md "Graph insights" -> "Still not built".
Rather than silently give every stock 0/10 for a pillar with no data (which
would just shrink every score by a flat 10 points and distort the tier
bands below), the remaining six weights are rescaled to sum to 100 so the
score stays meaningfully on a 0-100 scale. CATALYST_WEIGHT is kept as a
named constant specifically so wiring in real news data later is a
one-line change: give it a real weight and this rescaling collapses back
to the user's original 10%.
"""

import pandas as pd

RAW_WEIGHTS = {
    "Technical": 30,
    "RS": 15,
    "Volume": 15,
    "Sector": 15,
    "Catalyst": 10,  # not yet wired -- see module docstring
    "GraphStrength": 10,
    "Regime": 5,
}
CATALYST_WEIGHT = RAW_WEIGHTS["Catalyst"]
_ACTIVE_WEIGHTS = {k: v for k, v in RAW_WEIGHTS.items() if k != "Catalyst"}
_ACTIVE_TOTAL = sum(_ACTIVE_WEIGHTS.values())  # 90
# Rescaled so the six active pillars sum to 100.
WEIGHTS = {k: v / _ACTIVE_TOTAL * 100 for k, v in _ACTIVE_WEIGHTS.items()}

REGIME_SCORE = {"RISK_ON": 100.0, "NEUTRAL": 50.0, "RISK_OFF": 0.0}

# (score floor, tier label) -- checked top-down, first match wins.
TIERS = [
    (80, "A+ setup"),
    (70, "A setup"),
    (60, "Watchlist"),
    (50, "Early setup"),
    (0, "Ignore"),
]


def _tier(score: float) -> str:
    for floor, label in TIERS:
        if score >= floor:
            return label
    return "Ignore"


def compute_swing_score(
    technical_df: pd.DataFrame,
    rs_df: pd.DataFrame,
    sector_map: dict,
    sector_rotation_df: pd.DataFrame,
    centrality_df: pd.DataFrame,
    regime: str,
) -> pd.DataFrame:
    """
    technical_df: Ticker, Technical_Score (0-100), Volume_Score (0-100) -- technical_signals.py
    rs_df: Ticker, RS_Rating (1-99) -- rs_ranking.py
    sector_map: {ticker: sector_name} -- sector_rotation.fetch_sector_map()
    sector_rotation_df: Sector, Avg_RS_Rating -- sector_rotation.compute_sector_rotation()
    centrality_df: Ticker, Hub_Score (roughly 0-1) -- graph_centrality.compute_centrality()
    regime: one of RISK_ON / NEUTRAL / RISK_OFF -- compute_market_breadth()["Regime"]

    Returns: Ticker, Sector, the six pillar scores (0-100 each), Swing_Score
    (0-100), Tier -- sorted strongest first.

    Universe is the RS ranking's tickers (a swing score needs enough price
    history for RS to exist before it means anything). Technical/Volume/
    Sector/GraphStrength each default to 0 for a ticker missing from the
    corresponding input -- e.g. graph centrality didn't run this cycle, or
    the ticker's sector was dropped from rotation for too few members --
    rather than dropping the ticker outright.
    """
    base = rs_df[["Ticker", "RS_Rating"]].copy()
    base["RS_Score"] = base["RS_Rating"].clip(0, 100).astype(float)

    tech = technical_df.set_index("Ticker")[["Technical_Score", "Volume_Score"]]
    base = base.join(tech, on="Ticker")
    base["Technical_Score"] = base["Technical_Score"].fillna(0.0)
    base["Volume_Score"] = base["Volume_Score"].fillna(0.0)

    sector_avg = sector_rotation_df.set_index("Sector")["Avg_RS_Rating"] if not sector_rotation_df.empty else pd.Series(dtype=float)
    base["Sector"] = base["Ticker"].map(sector_map)
    base["Sector_Score"] = base["Sector"].map(sector_avg).fillna(0.0).astype(float)

    if not centrality_df.empty:
        hub = centrality_df.set_index("Ticker")["Hub_Score"]
        base["GraphStrength_Score"] = (base["Ticker"].map(hub).fillna(0.0) * 100).clip(0, 100)
    else:
        base["GraphStrength_Score"] = 0.0

    base["Regime_Score"] = REGIME_SCORE.get(regime, 50.0)

    base["Swing_Score"] = (
        WEIGHTS["Technical"] / 100 * base["Technical_Score"]
        + WEIGHTS["RS"] / 100 * base["RS_Score"]
        + WEIGHTS["Volume"] / 100 * base["Volume_Score"]
        + WEIGHTS["Sector"] / 100 * base["Sector_Score"]
        + WEIGHTS["GraphStrength"] / 100 * base["GraphStrength_Score"]
        + WEIGHTS["Regime"] / 100 * base["Regime_Score"]
    ).round(1)

    base["Tier"] = base["Swing_Score"].apply(_tier)
    cols = ["Ticker", "Sector", "Technical_Score", "RS_Score", "Volume_Score",
            "Sector_Score", "GraphStrength_Score", "Regime_Score", "Swing_Score", "Tier"]
    return base[cols].sort_values("Swing_Score", ascending=False).reset_index(drop=True)
