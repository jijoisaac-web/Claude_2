"""Offline validation: runs the entire pipeline on synthetic price data.
No network needed. Verifies math, filters, trade plans, and Excel output.

    python test_synthetic.py
"""
import glob
import numpy as np
import pandas as pd

import config
import run_all
import report_guide

HDR = report_guide.START_ROW   # data tables start below the guidance banner

rng = np.random.default_rng(42)
N, DAYS = 120, 420
dates = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=DAYS)
tickers = [f"STOCK{i:03d}.NS" for i in range(N)]
sectors = [f"Sector{(i % 8) + 1}" for i in range(N)]

drift = rng.normal(0.0004, 0.0008, N)
vol = rng.uniform(0.012, 0.035, N)
rets = rng.normal(drift, vol, size=(DAYS, N))
close = pd.DataFrame(100 * np.exp(np.cumsum(rets, axis=0)), index=dates, columns=tickers)
high = close * (1 + rng.uniform(0, 0.01, size=close.shape))
low = close * (1 - rng.uniform(0, 0.01, size=close.shape))
volume = pd.DataFrame(rng.integers(2_000_000, 9_000_000, size=close.shape),
                      index=dates, columns=tickers).astype(float)
idx = pd.Series(100 * np.exp(np.cumsum(rng.normal(0.0004, 0.009, DAYS))),
                index=dates, name="index_close")
uni = pd.DataFrame({"Symbol": [t.replace(".NS", "") for t in tickers],
                    "Company": [f"Synthetic Co {i}" for i in range(N)],
                    "Industry": sectors, "YahooTicker": tickers})

path = run_all.main(skip_earnings=True, skip_flows=True,
                    prices={"Close": close, "Volume": volume, "High": high, "Low": low},
                    index_close=idx, uni=uni)

xl = pd.ExcelFile(path)
port = pd.read_excel(path, "Portfolio_Top30", header=HDR)
sw = pd.read_excel(path, "Swing_Trades", header=HDR)
po = pd.read_excel(path, "Positional_Trades", header=HDR)
assert len(port) == config.TOP_N, "portfolio size mismatch"
assert port["weight"].sum() <= 1.0001, "weights exceed 100%"
for df, name in ((sw, "swing"), (po, "positional")):
    if len(df):
        assert (df["stop_loss"] < df["entry"]).all(), f"{name}: stop >= entry"
        assert (df["target_1"] > df["entry"]).all(), f"{name}: T1 <= entry"
        assert (df["target_2"] > df["target_1"]).all(), f"{name}: T2 <= T1"
        assert (df["suggested_qty"] >= 0).all()
print(f"\nAll assertions passed. Sheets: {xl.sheet_names}")
print(f"Report: {path}")
print(f"Swing rows: {len(sw)}, Positional rows: {len(po)}")
if len(sw):
    print(sw[["Symbol", "setup", "entry", "stop_loss", "target_1",
              "target_2", "suggested_qty"]].head(5).to_string(index=False))
