"""
rs_ranking.py
=============
IBD-style Relative Strength (RS) Rating + Market Breadth regime filter
for the Nifty 750 swing universe.

INPUT CONTRACT
--------------
daily_eod.csv with columns:
    Ticker,Date,Open,High,Low,Close,Volume,Delivery_Pct,MA20,MA50,MA200,ATR14

Must include a benchmark row set with Ticker == BENCHMARK_TICKER (default "NIFTY500")
covering the same date range as the universe.

Minimum lookback: 252 trading days per ticker (for the trailing 12M weighted RS).

OUTPUT
------
rs_ranking.csv     : Ticker, RS_Raw, RS_Rating (1-99 percentile), RS_Rank
breadth_report.csv : Date, Advancers, Decliners, Pct_Above_50DMA, Pct_Above_200DMA, Regime
"""

import pandas as pd
import numpy as np

BENCHMARK_TICKER = "NIFTY500"
TRADING_DAYS_PER_QUARTER = 63

# IBD-style quarterly weighting: most recent quarter weighted 2x the others.
QUARTER_WEIGHTS = {"Q1": 0.4, "Q2": 0.2, "Q3": 0.2, "Q4": 0.2}


def _quarterly_returns(close: pd.Series):
    """Compute trailing 4-quarter returns from a close-price series ordered oldest->newest."""
    n = len(close)
    if n < TRADING_DAYS_PER_QUARTER * 4 + 1:
        return None

    latest = close.iloc[-1]
    q_returns = {}
    for i, label in enumerate(["Q1", "Q2", "Q3", "Q4"], start=1):
        anchor_idx = n - 1 - TRADING_DAYS_PER_QUARTER * i
        anchor_price = close.iloc[anchor_idx]
        q_returns[label] = (latest / anchor_price) - 1.0 if anchor_price > 0 else np.nan
    return q_returns


def compute_rs_ranking(eod_df: pd.DataFrame, benchmark_ticker: str = BENCHMARK_TICKER) -> pd.DataFrame:
    """
    eod_df: long-format DataFrame with columns [Ticker, Date, Close, ...].
    Returns: Ticker, RS_Raw, RS_Rating (1-99), RS_Rank (1 = strongest).
    """
    eod_df = eod_df.sort_values(["Ticker", "Date"])
    bench = eod_df[eod_df["Ticker"] == benchmark_ticker].sort_values("Date")
    bench_q = _quarterly_returns(bench["Close"])
    if bench_q is None:
        raise ValueError(f"Insufficient benchmark history for {benchmark_ticker} (need >=253 sessions).")

    rows = []
    for ticker, grp in eod_df[eod_df["Ticker"] != benchmark_ticker].groupby("Ticker"):
        grp = grp.sort_values("Date")
        q = _quarterly_returns(grp["Close"])
        if q is None:
            continue  # insufficient history -- exclude rather than distort the percentile rank

        # Relative (vs benchmark) quarterly outperformance, IBD-style weighted.
        rs_raw = sum(
            QUARTER_WEIGHTS[label] * (1 + q[label]) / (1 + bench_q[label])
            for label in QUARTER_WEIGHTS
        )
        rows.append({"Ticker": ticker, "RS_Raw": rs_raw})

    rs_df = pd.DataFrame(rows)
    if rs_df.empty:
        raise ValueError("No tickers had sufficient history to compute RS. Check lookback window.")

    # Percentile rank scaled 1-99 (IBD convention); 99 = strongest relative strength.
    rs_df["RS_Rating"] = (rs_df["RS_Raw"].rank(pct=True) * 98 + 1).round().astype(int)
    rs_df["RS_Rank"] = rs_df["RS_Raw"].rank(ascending=False, method="min").astype(int)
    return rs_df.sort_values("RS_Rank").reset_index(drop=True)


def compute_market_breadth(eod_df: pd.DataFrame, as_of_date=None) -> dict:
    """
    Computes breadth stats for the latest date (or as_of_date) across the full universe.
    Requires MA50 / MA200 columns and a prior-day Close for advance/decline.

    Returns a dict with a discrete Regime flag used as a systemic gate:
        RISK_ON  -> breadth confirms strength, full position sizing
        NEUTRAL  -> mixed breadth, halve new position sizing
        RISK_OFF -> breadth deteriorating, no new longs regardless of setup quality
    """
    eod_df = eod_df.sort_values(["Ticker", "Date"])
    latest_date = as_of_date or eod_df["Date"].max()

    today = eod_df[eod_df["Date"] == latest_date]
    prior_dates = sorted(eod_df.loc[eod_df["Date"] < latest_date, "Date"].unique())
    if not prior_dates:
        raise ValueError("Need at least one prior session to compute advance/decline.")
    prior_date = prior_dates[-1]
    prior = eod_df[eod_df["Date"] == prior_date].set_index("Ticker")["Close"]

    merged = today.set_index("Ticker").join(prior.rename("Prior_Close"), how="inner")
    advancers = int((merged["Close"] > merged["Prior_Close"]).sum())
    decliners = int((merged["Close"] < merged["Prior_Close"]).sum())

    pct_above_50 = float((merged["Close"] > merged["MA50"]).mean() * 100)
    pct_above_200 = float((merged["Close"] > merged["MA200"]).mean() * 100)

    if pct_above_50 >= 60 and pct_above_200 >= 55 and advancers > decliners:
        regime = "RISK_ON"
    elif pct_above_50 <= 35 or pct_above_200 <= 35:
        regime = "RISK_OFF"
    else:
        regime = "NEUTRAL"

    return {
        "Date": latest_date,
        "Advancers": advancers,
        "Decliners": decliners,
        "AD_Ratio": round(advancers / decliners, 2) if decliners else float("inf"),
        "Pct_Above_50DMA": round(pct_above_50, 1),
        "Pct_Above_200DMA": round(pct_above_200, 1),
        "Regime": regime,
    }


if __name__ == "__main__":
    eod = pd.read_csv("daily_eod.csv", parse_dates=["Date"])

    rs = compute_rs_ranking(eod)
    rs.to_csv("rs_ranking.csv", index=False)
    print(f"RS ranking written for {len(rs)} tickers.")

    breadth = compute_market_breadth(eod)
    pd.DataFrame([breadth]).to_csv("breadth_report.csv", index=False)
    print(
        f"Market breadth regime: {breadth['Regime']} "
        f"({breadth['Pct_Above_50DMA']}% > 50DMA, {breadth['Pct_Above_200DMA']}% > 200DMA)"
    )
