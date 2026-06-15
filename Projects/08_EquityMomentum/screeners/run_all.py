"""Master screener — runs all modules and writes Momentum_Screener_Report.xlsx.

Usage:
    python run_all.py                 # full run (downloads data, queries fundamentals)
    python run_all.py --skip-earnings # faster: skip per-ticker fundamental calls
    python run_all.py --skip-flows    # skip NSE flow/delivery endpoints
"""
import argparse
import os
import sys

import numpy as np
import pandas as pd

import config
import universe
import data_loader
import screener_cross_sectional as cs
import screener_trend as trend
import risk_overlays as risk


def main(skip_earnings=False, skip_flows=False, prices=None, index_close=None, uni=None):
    # ---- 1. Universe & data ----
    if uni is None:
        uni = universe.load_universe()
    uni = uni.set_index("YahooTicker")
    if prices is None:
        prices = data_loader.download_prices(list(uni.index))
    if index_close is None:
        try:
            index_close = data_loader.download_index()
        except Exception as e:
            print(f"[regime] index download failed ({e}); using equal-weight universe proxy")
            index_close = prices["Close"].mean(axis=1)
    close, volume, high = prices["Close"], prices["Volume"], prices["High"]
    low = prices.get("Low", close * 0.99)

    # ---- 2. Liquidity & vol filters ----
    eligible = liquidity = risk.liquidity_filter(close, volume) & risk.vol_filter(close)
    print(f"[filters] {int(eligible.sum())}/{len(eligible)} pass liquidity+vol filters")
    close_f = close.loc[:, eligible[eligible].index]

    # ---- 3. Screeners ----
    cs_res = cs.run(close_f)
    tr_res = trend.run(close_f, high[close_f.columns])

    earn_res = None
    if not skip_earnings:
        import screener_earnings as earn
        candidates = cs_res.head(config.EARNINGS_TOP_CANDIDATES).index.tolist()
        earn_res = earn.run(candidates)

    flow_res, fii_df = None, None
    if not skip_flows:
        import flows
        flow_res, fii_df = flows.run(volume[close_f.columns])

    # ---- 4. Composite score ----
    comp = pd.DataFrame(index=cs_res.index)
    comp["cs"] = cs_res["cs_percentile"]
    comp["trend"] = tr_res["trend_percentile"].reindex(comp.index)
    comp["earnings"] = (earn_res["earnings_score"].reindex(comp.index)
                        if earn_res is not None else np.nan)
    comp["flows"] = (flow_res["flow_score"].reindex(comp.index)
                     if flow_res is not None else np.nan)

    w = config.COMPOSITE_WEIGHTS
    weights = pd.Series({"cs": w["cross_sectional"], "trend": w["trend"],
                         "earnings": w["earnings"], "flows": w["flows"]})
    avail = comp.notna()
    wsum = avail.mul(weights, axis=1).sum(axis=1)
    comp["composite"] = comp.fillna(0).mul(weights, axis=1).sum(axis=1) / wsum.replace(0, np.nan)
    comp = comp.sort_values("composite", ascending=False)

    # ---- 5. Regime + portfolio construction ----
    regime = risk.market_regime(index_close)
    print(f"[regime] {regime}")

    # ---- 5b. Actionable trade plans ----
    import trade_signals
    swing_df, pos_df = trade_signals.run(
        close_f, high[close_f.columns], low[close_f.columns],
        tr_res, comp, flow_res, earn_res, regime)

    top = comp.head(config.TOP_N).index.tolist()
    sizing = risk.size_positions(close_f, top, regime["exposure_multiplier"])

    port = pd.DataFrame(index=top)
    port["Symbol"] = [t.replace(".NS", "") for t in top]
    port["Company"] = uni["Company"].reindex(top).values
    port["Industry"] = uni["Industry"].reindex(top).values
    port["composite_score"] = comp["composite"].reindex(top).round(1)
    port["weight"] = sizing["weight"].reindex(top)
    port = risk.apply_sector_caps(port)
    port["weight"] = (port["weight"] * regime["exposure_multiplier"]
                      / port["weight"].sum() * sizing["weight"].sum()).round(4)

    # ---- 6. Excel report ----
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    stamp = pd.Timestamp.now().strftime("%Y-%m-%d_%H%M")
    base, ext = os.path.splitext(config.REPORT_NAME)
    path = os.path.join(config.OUTPUT_DIR, f"{base}_{stamp}{ext}")

    def label(df):
        d = df.copy()
        d.insert(0, "Symbol", [t.replace(".NS", "") for t in d.index])
        d.insert(1, "Company", uni["Company"].reindex(d.index).values)
        d.insert(2, "Industry", uni["Industry"].reindex(d.index).values)
        return d.reset_index(drop=True)

    # Build summary DataFrame early (needed by both Excel and HTML)
    summary = pd.DataFrame({
        "Item": ["Run date", "Universe", "Eligible after filters", "Market regime",
                 "Nifty above 200DMA", "Index 21d ann vol", "Exposure multiplier",
                 "Portfolio size", "Gross equity weight"],
        "Value": [pd.Timestamp.now().strftime("%Y-%m-%d %H:%M"), config.UNIVERSE,
                  int(eligible.sum()), "RISK-ON" if regime["risk_on"] else "RISK-OFF",
                  regime["index_above_200dma"], regime["index_ann_vol_21d"],
                  regime["exposure_multiplier"], len(port),
                  round(float(port['weight'].sum()), 3)],
    })

    # ---- 6b. CSV exports ----
    csv_dir = os.path.join(config.OUTPUT_DIR, f"csv_{stamp}")
    os.makedirs(csv_dir, exist_ok=True)
    port.reset_index(drop=True).to_csv(
        os.path.join(csv_dir, "Portfolio_Top30.csv"), index=False)
    label(swing_df).to_csv(
        os.path.join(csv_dir, "Swing_Trades.csv"), index=False)
    label(pos_df).to_csv(
        os.path.join(csv_dir, "Positional_Trades.csv"), index=False)
    label(comp.head(100).round(2)).to_csv(
        os.path.join(csv_dir, "Composite_Ranks.csv"), index=False)
    print(f"[csv] CSVs written to {csv_dir}/")

    # ---- 6c. HTML report ----
    import report_html as rhtml
    html_path = os.path.join(config.OUTPUT_DIR, f"{base}_{stamp}.html")
    rhtml.write_html(
        path=html_path,
        summary=summary,
        swing_df=label(swing_df),
        pos_df=label(pos_df),
        port=port.reset_index(drop=True),
        comp=label(comp.round(2)),
        fii_df=fii_df,
    )
    print(f"[html] HTML report: {html_path}")

    with pd.ExcelWriter(path, engine="xlsxwriter") as xl:
        import report_guide as rg
        rg.write_df(xl, summary, "Summary")
        rg.write_df(xl, label(swing_df), "Swing_Trades")
        rg.write_df(xl, label(pos_df), "Positional_Trades")
        rg.write_df(xl, port.reset_index(drop=True), "Portfolio_Top30")
        rg.write_df(xl, label(comp.round(2)), "Composite_Ranks")
        rg.write_df(xl, label(cs_res.round(4)), "CrossSectional")
        rg.write_df(xl, label(tr_res.round(2)), "Trend")
        if earn_res is not None:
            rg.write_df(xl, label(earn_res.round(2)), "Earnings")
        if flow_res is not None:
            rg.write_df(xl, label(flow_res.round(2)), "Flows_Stock")
        if fii_df is not None:
            rg.write_df(xl, fii_df, "FII_DII_Market")
        rg.write_df(xl, pd.DataFrame([{"param": k, "value": str(v)}
                                      for k, v in vars(config).items()
                                      if k.isupper()]), "Parameters")

    print(f"\n[done] Report written to {path}")
    print("\nTop 10 composite picks:")
    print(port[["Symbol", "Company", "Industry", "composite_score", "weight"]].head(10).to_string(index=False))
    return path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-earnings", action="store_true")
    ap.add_argument("--skip-flows", action="store_true")
    a = ap.parse_args()
    sys.exit(0 if main(skip_earnings=a.skip_earnings, skip_flows=a.skip_flows) else 1)
