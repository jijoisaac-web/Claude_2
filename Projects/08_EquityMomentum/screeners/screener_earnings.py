"""Screener 3 — Earnings momentum (best-effort via free yfinance fundamentals).

Signals: latest EPS surprise %, surprise streak, analyst recommendation balance,
forward-EPS growth. Free data is patchy for Indian small caps, so this runs only
on the top price-momentum candidates and degrades gracefully.
"""
import time
import numpy as np
import pandas as pd
import yfinance as yf

import config


def _one(ticker: str) -> dict:
    row = {"ticker": ticker, "eps_surprise_pct": np.nan, "surprise_streak": np.nan,
           "rec_score": np.nan, "fwd_eps_growth": np.nan}
    t = yf.Ticker(ticker)

    try:
        ed = t.get_earnings_dates(limit=8)
        if ed is not None and "Surprise(%)" in ed.columns:
            s = ed["Surprise(%)"].dropna()
            if len(s):
                row["eps_surprise_pct"] = float(s.iloc[0])
                streak = 0
                for v in s:
                    if v > 0:
                        streak += 1
                    else:
                        break
                row["surprise_streak"] = streak
    except Exception:
        pass

    try:
        rec = t.get_recommendations()
        if rec is not None and len(rec):
            r = rec.iloc[0]  # most recent period
            buys = r.get("strongBuy", 0) + r.get("buy", 0)
            sells = r.get("sell", 0) + r.get("strongSell", 0)
            total = buys + sells + r.get("hold", 0)
            if total > 0:
                row["rec_score"] = (buys - sells) / total  # -1..+1
    except Exception:
        pass

    try:
        info = t.get_info()
        teps, feps = info.get("trailingEps"), info.get("forwardEps")
        if teps and feps and teps > 0:
            row["fwd_eps_growth"] = feps / teps - 1
    except Exception:
        pass

    return row


def run(candidates: list[str]) -> pd.DataFrame:
    """candidates: Yahoo tickers (pass top cross-sectional names to limit API load)."""
    rows = []
    n = min(len(candidates), config.EARNINGS_TOP_CANDIDATES)
    for i, tk in enumerate(candidates[:n], 1):
        if i % 10 == 0:
            print(f"[earnings] {i}/{n}")
        rows.append(_one(tk))
        time.sleep(config.EARNINGS_PAUSE_SEC)

    out = pd.DataFrame(rows).set_index("ticker")

    # 0-100 earnings score from available components, NaN-tolerant
    comp = pd.DataFrame(index=out.index)
    comp["surprise"] = (out["eps_surprise_pct"].clip(-50, 50) + 50) / 100   # 0..1
    comp["streak"] = (out["surprise_streak"].clip(0, 4)) / 4
    comp["recs"] = (out["rec_score"] + 1) / 2
    comp["growth"] = (out["fwd_eps_growth"].clip(-0.5, 0.5) + 0.5)
    out["earnings_score"] = (comp.mean(axis=1, skipna=True) * 100).round(1)
    out["earnings_data_coverage"] = comp.notna().mean(axis=1)
    out.loc[out["earnings_data_coverage"] == 0, "earnings_score"] = np.nan
    return out.sort_values("earnings_score", ascending=False)


if __name__ == "__main__":
    print(run(["RELIANCE.NS", "TCS.NS", "INFY.NS"]).round(2))
