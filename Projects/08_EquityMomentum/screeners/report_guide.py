"""In-sheet interpretation notes — every sheet gets a guidance banner at the
top and hover-comments on each column header, so no tab-toggling is needed."""

SHEET_NOTES = {
    "Summary":
        "READ FIRST: RISK-ON = Nifty above 200DMA, calm vol - trade normally. RISK-OFF = downtrend/vol spike - "
        "halve position sizes, book profits faster, expect failed breakouts. The exposure multiplier shows how "
        "much capital the model deploys; the rest is cash protection.",
    "Swing_Trades":
        "READY-MADE 5-20 DAY PLANS. Buy near 'entry' next morning, place the stop-loss immediately. Sell half at "
        "target_1, move stop to breakeven, trail the rest with the 20DMA. Qty is sized so a stop-hit loses ~1% of "
        "CAPITAL (config.py) - set your real capital there. No fill in 2-3 days? Skip the trade.",
    "Positional_Trades":
        "3-6 MONTH HOLDS in established uptrends. Wider stops survive normal 5-10% pullbacks - exit only on a "
        "WEEKLY close below the 50DMA, not daily dips. Book 1/3 at T1, 1/3 at T2, trail the rest with the 50DMA. "
        "Review weekly, not daily.",
    "Portfolio_Top30":
        "MODEL PORTFOLIO for investors (not traders): top-30 composite names, inverse-volatility weighted, max 25% "
        "per sector, scaled down in RISK-OFF. Replicating these weights monthly mimics how momentum index funds "
        "work. Weights not summing to 100% = the difference is deliberate cash.",
    "Composite_Ranks":
        "FULL RANKING of every eligible stock. composite = blend of the 4 sub-scores (45% cross-sectional momentum, "
        "30% trend, 15% earnings, 10% flows), all 0-100. Above 80 = strong; 60-80 = decent; below 50 = no edge. "
        "Stocks strong on ALL four factors are the most reliable.",
    "CrossSectional":
        "THE ACADEMIC MOMENTUM FACTOR (what NSE momentum indices use): 12- and 6-month returns SKIPPING the latest "
        "month (recent spikes mean-revert), divided by volatility - rewards smooth climbers over wild movers. "
        "Decile 10 / percentile >90 = top tier. Institutions buy deciles 9-10, avoid 1-2.",
    "Trend":
        "ENTRY-TIMING SIGNALS. Ideal long: ma_aligned TRUE, near 52w high (no trapped sellers overhead), fresh "
        "breakout_20d, RSI 55-75. RSI 40-50 in an uptrend = pullback buy zone; >80 = stretched, wait. "
        "dist_sma200 >50% = extended - size smaller, expect shakeouts.",
    "Earnings":
        "FUNDAMENTAL CONFIRMATION. Stocks beating estimates drift up for weeks afterwards (PEAD effect); a 3-4 "
        "quarter beat streak is gold. Check earnings_data_coverage - low coverage (common for small caps on free "
        "data) means rely on price signals instead.",
    "Flows_Stock":
        "WHO IS BUYING? delivery_pct >50% = shares taken to demat = investors accumulating; <25% = intraday "
        "speculation - breakouts fail more often. vol_ratio >1.1 with rising price = real demand. "
        "Price up on shrinking volume = weak rally, fade-prone.",
    "FII_DII_Market":
        "MARKET TAILWIND CHECK (Rs. crore, cash market). Sustained FII buying lifts the whole market. FII selling "
        "absorbed by DII buying = rangebound, favour pullback entries over breakout chasing. Both selling = step "
        "aside.",
    "Parameters":
        "AUDIT TRAIL: exact settings for this run. If results look odd, check here first - especially CAPITAL "
        "(position sizing) and UNIVERSE. This tool is for research/screening - not investment advice.",
}

COLUMN_NOTES = {
    # trade plans
    "setup": "How the trade qualified: fresh 20-day breakout, pullback to the 20DMA in an uptrend, or established MA-aligned uptrend (positional).",
    "entry": "Last close - use as next-morning reference price. Don't chase more than ~1% above it.",
    "stop_loss": "Swing: tighter of 2x ATR or below the 10-day low. Positional: below 50DMA or 3x ATR, capped at 12%. Place this order the moment your buy fills.",
    "risk_pct": "% of your money lost on this position if the stop is hit.",
    "target_1": "First profit target. Swing 1.5x risk, positional 2x. Sell part here and move stop to breakeven - the trade becomes free.",
    "target_2": "Stretch target (swing 2.5x risk, positional 3.5x). Trail the remainder with the 20/50DMA.",
    "rr_target_1": "Reward-to-risk multiple at target 1.",
    "rr_target_2": "Reward-to-risk multiple at target 2.",
    "suggested_qty": "Shares sized so a stop-hit loses ~1% of CAPITAL in config.py (halved in RISK-OFF). Set CAPITAL to your real capital.",
    "capital_at_risk": "Rupees lost if the stop is hit (qty x risk per share).",
    "holding": "Expected holding period. If neither stop nor target hits within it, the setup failed - exit.",
    "exit_rule": "When to get out besides stop/target. Follow it mechanically.",
    # composite
    "composite": "0-100 blend: 45% cross-sectional momentum, 30% trend, 15% earnings, 10% flows. >80 strong, <50 skip.",
    "composite_score": "Same as composite - the overall 0-100 conviction score.",
    "weight": "Model portfolio weight (inverse-volatility, sector-capped, regime-scaled). Sum < 100% = rest in cash.",
    "cs": "Cross-sectional momentum percentile (0-100).",
    "trend": "Trend score percentile (0-100).",
    "earnings": "Earnings momentum score (0-100); blank = no data.",
    "flows": "Volume/delivery flow score (0-100); blank = no data.",
    # cross-sectional
    "ann_vol": "Annualised daily-return volatility. Lower = smoother ride, higher vol-adjusted score.",
    "ret_12_1": "Return over the last 12 months EXCLUDING the latest month - the classic momentum measure.",
    "ret_6_1": "6-month return excluding the latest month.",
    "ret_3_1": "3-month return excluding the latest month.",
    "voladj_12_1": "12-1 return divided by volatility - momentum per unit of risk.",
    "voladj_6_1": "6-1 return divided by volatility.",
    "voladj_3_1": "3-1 return divided by volatility.",
    "momentum_z": "Standardised blend of 12m and 6m vol-adjusted momentum, capped at +/-3 (NSE index methodology).",
    "norm_score": "NSE-style normalized momentum score derived from momentum_z. Higher = stronger.",
    "cs_rank": "1 = strongest momentum in the universe.",
    "decile": "10 = top 10% momentum, 1 = bottom. Institutions buy 9-10.",
    "cs_percentile": "Percentile of momentum strength (100 = best).",
    # trend
    "price": "Last close used for all calculations.",
    "above_sma20": "Price above 20-day average - short-term trend up.",
    "above_sma50": "Price above 50-day average - medium-term trend up.",
    "above_sma200": "Price above 200-day average - long-term uptrend. Only buy TRUE.",
    "golden_cross": "50DMA crossed above 200DMA within the last month - major trend change signal.",
    "ma_aligned": "20 > 50 > 200 DMA: textbook uptrend structure, all timeframes agree.",
    "pct_of_52w_high": "1.00 = at the 52-week high. Stocks near highs have no trapped sellers - they rise easier.",
    "near_52w_high": "Within 10% of the 52-week high.",
    "breakout_20d": "Just cleared the highest high of the past 20 sessions - fresh momentum.",
    "rsi_14": "Momentum oscillator. In uptrends: 40-50 pullback-buy zone, 55-75 healthy, >80 stretched (wait).",
    "macd_hist_pos": "MACD above its signal line - short-term momentum rising.",
    "dist_sma200_pct": "% above the 200DMA. >50% = extended: smaller size, expect sharp shakeouts.",
    "trend_score": "0-100 composite of all trend signals.",
    "trend_percentile": "Trend score rank vs the universe (100 = best).",
    # earnings
    "eps_surprise_pct": "Latest quarterly EPS vs analyst estimate. Positive surprises drift up for weeks (PEAD).",
    "surprise_streak": "Consecutive quarters of beating estimates. 3-4 = high quality.",
    "rec_score": "Analyst buys minus sells, scaled -1 to +1.",
    "fwd_eps_growth": "Expected EPS growth (forward vs trailing).",
    "earnings_score": "0-100 blend of surprise, streak, recommendations and growth.",
    "earnings_data_coverage": "Fraction of inputs available. Low = unreliable, lean on price signals.",
    # flows
    "vol_ratio_20_60": "20-day avg volume vs 60-day. >1.1 = unusual activity behind the move.",
    "volume_expanding": "TRUE = volume backing the price move - real demand.",
    "delivery_pct": ">50% = investors taking delivery (accumulation). <25% = intraday churn - trade fast, exit fast.",
    "high_delivery": "TRUE when delivery % exceeds 50.",
    "flow_score": "0-100 blend of volume expansion and delivery.",
    # FII/DII
    "category": "FII/FPI = foreign institutions; DII = domestic (mutual funds, insurers).",
    "buyValue": "Gross buying, Rs. crore (cash market, provisional).",
    "sellValue": "Gross selling, Rs. crore.",
    "netValue": "Net flow. Sustained FII buying = market tailwind; both negative = step aside.",
}

START_ROW = 2  # data table starts here; rows 0-1 hold the guidance banner


def write_df(xl, df, sheet):
    """Write df with a wrapped guidance banner on top and hover-notes on headers."""
    df.to_excel(xl, sheet_name=sheet, index=False, startrow=START_ROW)
    wb, ws = xl.book, xl.sheets[sheet]

    note = SHEET_NOTES.get(sheet, "")
    nfmt = wb.add_format({"text_wrap": True, "valign": "top", "italic": True,
                          "bg_color": "#FFF7DC", "font_color": "#5C4A00",
                          "border": 1, "border_color": "#E0CE8C"})
    last_col = max(len(df.columns) - 1, 7)
    ws.merge_range(0, 0, 1, last_col, note, nfmt)
    ws.set_row(0, 30)
    ws.set_row(1, 30)

    hfmt = wb.add_format({"bold": True, "bg_color": "#1F4E79",
                          "font_color": "white", "border": 1})
    for c, col in enumerate(df.columns):
        ws.write(START_ROW, c, str(col), hfmt)
        tip = COLUMN_NOTES.get(str(col))
        if tip:
            ws.write_comment(START_ROW, c, tip,
                             {"x_scale": 2.2, "y_scale": 1.6, "font_size": 9})
    ws.freeze_panes(START_ROW + 1, 0)
    for c in range(len(df.columns)):
        width = max(12, min(28, int(df.iloc[:, c].astype(str).str.len().max()
                                    if len(df) else 12) + 2))
        ws.set_column(c, c, width)
