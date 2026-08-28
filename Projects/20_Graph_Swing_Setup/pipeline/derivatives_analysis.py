"""
derivatives_analysis.py
========================
F&O overlay for the ~180-200 Nifty 750 constituents with listed derivatives.
Classifies OI buildup type and flags PCR contrarian extremes + rollover risk.

INPUT CONTRACT
--------------
derivatives_data.csv:
    Ticker,Date,Close,Prev_Close,Fut_OI,Prev_Fut_OI,Put_OI,Call_OI,
    Days_To_Expiry,Rollover_Pct

OUTPUT
------
oi_signals.csv                  : Ticker, Date, Buildup_Type, PCR, PCR_Signal, Rollover_Flag
high_conviction_derivatives.csv : rows meeting the full bullish confluence filter
"""

import pandas as pd
import numpy as np

PCR_BULLISH_CONTRARIAN = 1.3   # heavy put writing -- often precedes upside
PCR_BEARISH_CONTRARIAN = 0.7   # heavy call writing -- often precedes downside
LOW_ROLLOVER_THRESHOLD = 60.0  # % -- below this near expiry, treat as a conviction warning


def classify_oi_buildup(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standard four-way OI/price classification:
      Price up   + OI up    -> LONG_BUILDUP     (fresh longs, highest conviction)
      Price down + OI up    -> SHORT_BUILDUP     (fresh shorts)
      Price up   + OI down  -> SHORT_COVERING    (squeeze, not fresh conviction)
      Price down + OI down  -> LONG_UNWINDING     (longs exiting, not fresh shorts)
    """
    df = df.copy()
    price_up = df["Close"] > df["Prev_Close"]
    oi_up = df["Fut_OI"] > df["Prev_Fut_OI"]

    conditions = [
        price_up & oi_up,
        ~price_up & oi_up,
        price_up & ~oi_up,
        ~price_up & ~oi_up,
    ]
    choices = ["LONG_BUILDUP", "SHORT_BUILDUP", "SHORT_COVERING", "LONG_UNWINDING"]
    df["Buildup_Type"] = np.select(conditions, choices, default="FLAT")

    df["PCR"] = (df["Put_OI"] / df["Call_OI"].replace(0, np.nan)).round(2)
    df["PCR_Signal"] = np.select(
        [df["PCR"] >= PCR_BULLISH_CONTRARIAN, df["PCR"] <= PCR_BEARISH_CONTRARIAN],
        ["BULLISH_CONTRARIAN", "BEARISH_CONTRARIAN"],
        default="NEUTRAL",
    )

    df["Rollover_Flag"] = np.where(
        (df["Days_To_Expiry"] <= 3) & (df["Rollover_Pct"] < LOW_ROLLOVER_THRESHOLD),
        "LOW_ROLLOVER_CAUTION",
        "NORMAL",
    )
    return df


def screen_high_conviction_longs(oi_df: pd.DataFrame) -> pd.DataFrame:
    """
    Highest-conviction derivatives confluence for swing longs: fresh long buildup
    + put-heavy PCR (bullish contrarian) + healthy rollover. This is a CONFIRMATION
    filter to run after price-action + graph screening -- never a standalone entry signal.
    """
    mask = (
        (oi_df["Buildup_Type"] == "LONG_BUILDUP")
        & (oi_df["PCR_Signal"] == "BULLISH_CONTRARIAN")
        & (oi_df["Rollover_Flag"] == "NORMAL")
    )
    return oi_df.loc[mask].reset_index(drop=True)


if __name__ == "__main__":
    raw = pd.read_csv("derivatives_data.csv", parse_dates=["Date"])
    classified = classify_oi_buildup(raw)
    classified.to_csv("oi_signals.csv", index=False)

    high_conviction = screen_high_conviction_longs(classified)
    high_conviction.to_csv("high_conviction_derivatives.csv", index=False)
    print(f"Classified {len(classified)} rows. {len(high_conviction)} high-conviction confluence signals found.")
