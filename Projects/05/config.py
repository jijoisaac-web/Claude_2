# -*- coding: utf-8 -*-
"""
config.py — Central configuration for Project 05 Institutional Strategy Engine
"""

import os

# ── Capital & Risk ────────────────────────────────────────────────────────────
CAPITAL          = 2_000_000      # INR 20 Lakhs
RISK_PCT         = 1.0            # % of capital to risk per trade
MAX_POSITIONS    = 10             # max simultaneous open trades
MAX_POSITION_PCT = 15.0           # max % of capital in single position
MIN_POSITION_PCT = 2.0            # min % of capital per trade

# ── Broker (Zerodha NRE — Delivery) ──────────────────────────────────────────
BROKERAGE_PER_ORDER = 200.0       # INR per executed order
STT_PCT             = 0.001       # 0.1% on buy + sell
EXCH_CHARGE_PCT     = 0.0000322   # NSE transaction charge
SEBI_PCT            = 0.000001    # SEBI turnover charge
STAMP_PCT           = 0.00015     # Stamp duty on buy only
GST_PCT             = 0.18        # GST on brokerage + exchange charges

# ── Data ─────────────────────────────────────────────────────────────────────
RESULTS_DIR     = os.path.join(os.path.dirname(__file__), "results")
DATA_DIR        = os.path.join(os.path.dirname(__file__), "data_cache")
LOOKBACK_DAYS   = 365             # 1 year of price history
PRICE_INTERVAL  = "1d"           # daily OHLCV

# ── Strategy Enable / Disable ─────────────────────────────────────────────────
STRATEGIES = {
    "mean_reversion":  True,
    "momentum":        True,
    "factor_model":    True,
    "pairs_trading":   True,
    "sector_rotation": True,
    "pead":            True,
}

# ── Mean Reversion Parameters ─────────────────────────────────────────────────
MR_BB_PERIOD      = 20            # Bollinger Band period
MR_BB_STD         = 2.0           # Standard deviations
MR_RSI_PERIOD     = 14
MR_RSI_OVERSOLD   = 35            # RSI threshold for oversold
MR_RSI_OVERBOUGHT = 65
MR_ZSCORE_ENTRY   = -1.5          # Z-score of price deviation to enter
MR_MIN_ADV        = 5_000_000     # Min avg daily value (INR) for liquidity

# ── Momentum Parameters ───────────────────────────────────────────────────────
MOM_EMA_FAST      = 20
MOM_EMA_SLOW      = 50
MOM_EMA_TREND     = 200
MOM_VOL_MULT      = 1.5           # Volume must be > 1.5x 20-day avg on breakout
MOM_LOOKBACK_RANK = 252           # 12-month return ranking period
MOM_SKIP_RECENT   = 21            # Skip last 1 month (12-1 momentum)
MOM_ADX_MIN       = 20            # Minimum ADX for trend strength
MOM_MIN_ADV       = 10_000_000    # Higher liquidity requirement

# ── Factor Model Parameters ───────────────────────────────────────────────────
FACTOR_WEIGHTS = {
    "momentum_12_1":   0.30,      # 12-1 month price momentum
    "quality_roe":     0.20,      # Return on Equity
    "value_pb":        0.15,      # Price-to-Book (lower = better)
    "low_volatility":  0.15,      # 1-year price volatility (lower = better)
    "earnings_growth": 0.10,      # EPS growth
    "value_pe":        0.10,      # P/E ratio (lower = better)
}
FACTOR_TOP_N      = 20            # Select top N stocks from factor score
FACTOR_REBALANCE  = "monthly"     # Rebalance frequency

# ── Pairs Trading Parameters ──────────────────────────────────────────────────
PAIRS_ZSCORE_ENTRY  = 2.0         # Enter when z-score exceeds this
PAIRS_ZSCORE_EXIT   = 0.5         # Exit when z-score reverts to this
PAIRS_ZSCORE_STOP   = 3.5         # Stop loss if z-score exceeds this
PAIRS_LOOKBACK      = 60          # Days for cointegration test
PAIRS_MIN_CORR      = 0.75        # Minimum correlation to consider pairing

# ── Sector Rotation Parameters ────────────────────────────────────────────────
SR_LOOKBACK_SHORT   = 30          # Short-term momentum (days)
SR_LOOKBACK_LONG    = 90          # Long-term momentum (days)
SR_TOP_SECTORS      = 3           # Invest in top N sectors
SR_REBALANCE_DAYS   = 30

# ── PEAD Parameters ───────────────────────────────────────────────────────────
PEAD_GAP_MIN        = 3.0         # Min gap % to qualify as earnings surprise
PEAD_HOLD_DAYS      = 10          # Days to hold after gap
PEAD_STOP_PCT       = 3.0         # Stop loss % from entry

# ── Kelly Criterion ───────────────────────────────────────────────────────────
KELLY_FRACTION      = 0.25        # Use 25% Kelly (conservative)
KELLY_WIN_RATE_DEFAULT = 0.45     # Default assumed win rate
KELLY_RR_DEFAULT    = 2.0         # Default assumed R:R

# ── Universe ──────────────────────────────────────────────────────────────────
# Sectors mapped to representative ETFs / index proxies for rotation
SECTOR_ETFS = {
    "IT":           "^CNX IT",
    "Banking":      "^NSEBANK",
    "FMCG":         "^CNXFMCG",
    "Auto":         "^CNXAUTO",
    "Pharma":       "^CNXPHARMA",
    "Metal":        "^CNXMETAL",
    "Realty":       "^CNXREALTY",
    "Energy":       "^CNXENERGY",
    "Infra":        "^CNXINFRA",
    "MidCap":       "^NSEMDCP50",
}
