"""
institutional_footprint.py
===========================
Institutional-flow overlay: bulk/block deal disclosures + FII/DII net flow.
Used as (1) a per-stock conviction booster on breakout/laggard candidates,
and (2) a macro risk-on/off gate applied before any new long is sized.

INPUT CONTRACTS
---------------
bulk_deals.csv:
    Date,Ticker,Client_Name,Deal_Type,Quantity,Price,Exchange
    Deal_Type in {BUY, SELL}

fii_dii_flow.csv:
    Date,FII_Net_Cr,DII_Net_Cr
    (net figures in INR Crores, provisional daily data)

OUTPUT
------
bulk_deal_signals.csv : Ticker, Net_Buy_Qty, Buy_Sell_Ratio, Signal
flow_regime.csv        : Date, FII_5D_Net, DII_5D_Net, Combined_5D_Net, Flow_Regime
"""

import pandas as pd
import numpy as np

ROLLING_WINDOW = 5  # trading days

# Combined 5-day FII+DII net flow thresholds, in INR Crores.
# Tune these periodically against current market-cap base / typical flow magnitude.
FLOW_RISK_OFF_THRESHOLD = -5000
FLOW_RISK_ON_THRESHOLD = 5000


def compute_bulk_deal_signals(bulk_df: pd.DataFrame, lookback_days: int = ROLLING_WINDOW) -> pd.DataFrame:
    """
    Aggregates bulk/block deal net buy pressure per ticker over the trailing window.
    A stock showing sustained net institutional buying (Buy_Sell_Ratio >= 2.0)
    inside an already-hot sector graph cluster is a high-conviction CONFIRMATION,
    not a standalone entry trigger.
    """
    bulk_df = bulk_df.copy()
    bulk_df["Date"] = pd.to_datetime(bulk_df["Date"])
    bulk_df["Deal_Type"] = bulk_df["Deal_Type"].str.upper()

    cutoff = bulk_df["Date"].max() - pd.Timedelta(days=lookback_days * 2)  # calendar buffer for weekends
    recent = bulk_df[bulk_df["Date"] >= cutoff].copy()

    recent["Buy_Qty"] = np.where(recent["Deal_Type"] == "BUY", recent["Quantity"], 0)
    recent["Sell_Qty"] = np.where(recent["Deal_Type"] == "SELL", recent["Quantity"], 0)

    grouped = recent.groupby("Ticker").agg(
        Buy_Qty=("Buy_Qty", "sum"),
        Sell_Qty=("Sell_Qty", "sum"),
        Deal_Count=("Quantity", "count"),
    ).reset_index()

    grouped["Net_Buy_Qty"] = grouped["Buy_Qty"] - grouped["Sell_Qty"]

    # One-sided deal flow (all BUY, zero SELL, or vice versa) is the strongest
    # possible signal, not an edge case to special-case away. A plain
    # Buy_Qty / Sell_Qty division turns "zero sell volume" into NaN, and NaN
    # fails BOTH threshold comparisons below -- silently misclassifying the
    # highest-conviction rows as NEUTRAL. Cap one-sided flow at a sentinel
    # ratio instead of leaving it as NaN/inf (also keeps this JSON-safe
    # downstream, since neither NaN nor Infinity is valid JSON).
    def _ratio(row):
        if row["Sell_Qty"] == 0 and row["Buy_Qty"] > 0:
            return 999.0
        if row["Buy_Qty"] == 0 and row["Sell_Qty"] > 0:
            return 0.0
        if row["Buy_Qty"] == 0 and row["Sell_Qty"] == 0:
            return np.nan  # no deals at all -- shouldn't occur given Deal_Count >= 1
        return round(row["Buy_Qty"] / row["Sell_Qty"], 2)

    grouped["Buy_Sell_Ratio"] = grouped.apply(_ratio, axis=1)
    grouped["Signal"] = np.select(
        [grouped["Buy_Sell_Ratio"] >= 2.0, grouped["Buy_Sell_Ratio"] <= 0.5],
        ["INSTITUTIONAL_ACCUMULATION", "INSTITUTIONAL_DISTRIBUTION"],
        default="NEUTRAL",
    )
    return grouped.sort_values("Net_Buy_Qty", ascending=False).reset_index(drop=True)


def compute_flow_regime(flow_df: pd.DataFrame, window: int = ROLLING_WINDOW) -> pd.DataFrame:
    """
    Rolling FII/DII net flow regime -- the macro gate. Combined 5-day net flow
    sharply negative => no new long entries system-wide, regardless of individual
    setup quality or graph-contagion score.
    """
    flow_df = flow_df.copy()
    flow_df["Date"] = pd.to_datetime(flow_df["Date"])
    flow_df = flow_df.sort_values("Date")

    flow_df["FII_5D_Net"] = flow_df["FII_Net_Cr"].rolling(window).sum()
    flow_df["DII_5D_Net"] = flow_df["DII_Net_Cr"].rolling(window).sum()
    flow_df["Combined_5D_Net"] = flow_df["FII_5D_Net"] + flow_df["DII_5D_Net"]

    conditions = [
        flow_df["Combined_5D_Net"] <= FLOW_RISK_OFF_THRESHOLD,
        flow_df["Combined_5D_Net"] >= FLOW_RISK_ON_THRESHOLD,
    ]
    choices = ["RISK_OFF", "RISK_ON"]
    flow_df["Flow_Regime"] = np.select(conditions, choices, default="NEUTRAL")
    return flow_df


if __name__ == "__main__":
    bulk = pd.read_csv("bulk_deals.csv")
    signals = compute_bulk_deal_signals(bulk)
    signals.to_csv("bulk_deal_signals.csv", index=False)
    print(f"Bulk deal signals computed for {len(signals)} tickers.")

    flow = pd.read_csv("fii_dii_flow.csv")
    regime = compute_flow_regime(flow)
    regime.to_csv("flow_regime.csv", index=False)
    latest = regime.iloc[-1]
    print(f"Latest flow regime: {latest['Flow_Regime']} (5D combined net: {latest['Combined_5D_Net']:.0f} Cr)")
