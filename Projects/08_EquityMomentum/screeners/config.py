"""Central configuration for all momentum screeners."""

# ---------------- Universe ----------------
UNIVERSE = "NIFTY500"          # NIFTY50 | NIFTY200 | NIFTY500 | CUSTOM
CUSTOM_UNIVERSE_CSV = None     # path to CSV with 'Symbol' column if UNIVERSE == "CUSTOM"

NSE_INDEX_URLS = {
    "NIFTY50":  "https://archives.nseindia.com/content/indices/ind_nifty50list.csv",
    "NIFTY200": "https://archives.nseindia.com/content/indices/ind_nifty200list.csv",
    "NIFTY500": "https://archives.nseindia.com/content/indices/ind_nifty500list.csv",
}

# ---------------- Data ----------------
LOOKBACK_DAYS = 420            # ~20 months of daily bars (covers 12m + buffers)
CACHE_DIR = "data/cache"
CACHE_MAX_AGE_HOURS = 12       # re-download if cache older than this
BATCH_SIZE = 50                # tickers per yfinance batch request

# ---------------- Cross-sectional momentum ----------------
MOM_LOOKBACKS = {"12_1": (252, 21), "6_1": (126, 21), "3_1": (63, 21)}  # (window, skip) trading days
VOL_WINDOW = 252               # daily-return stdev window for vol adjustment
ZSCORE_CAP = 3.0               # winsorize z-scores (NSE index methodology style)
WEIGHT_12M = 0.5               # blend of 12-1 and 6-1 vol-adjusted z-scores
WEIGHT_6M = 0.5
TOP_N = 30                     # portfolio size (mirrors Nifty500 Momentum 50 / N200 Mom 30 style)

# ---------------- Trend / time-series momentum ----------------
SMA_FAST, SMA_MID, SMA_SLOW = 20, 50, 200
HIGH_52W_PROXIMITY = 0.90      # flag if price >= 90% of 52-week high
BREAKOUT_WINDOW = 20           # n-day high breakout
RSI_WINDOW = 14
MACD_FAST, MACD_SLOW, MACD_SIGNAL = 12, 26, 9

# ---------------- Earnings momentum ----------------
EARNINGS_TOP_CANDIDATES = 60   # only query fundamentals for top-N price-momentum names (rate limits)
EARNINGS_PAUSE_SEC = 0.4       # polite delay between yfinance fundamental calls

# ---------------- Liquidity & risk overlays ----------------
MIN_MEDIAN_TRADED_VALUE_CR = 5.0   # min 60d median daily traded value, in INR crore
MIN_PRICE = 20.0                   # avoid penny stocks
MAX_ANN_VOL = 0.70                 # drop names with >70% annualized vol
SECTOR_CAP = 0.25                  # max 25% portfolio weight per sector
TARGET_PORTFOLIO_VOL = 0.18        # vol-scaling target (annualized)
REGIME_INDEX = "^NSEI"             # Nifty 50 for market-regime filter
REGIME_VOL_SPIKE = 0.28            # ann. 21d index vol above this => risk-off
CRASH_PROTECT_EXPOSURE = 0.5       # exposure multiplier when regime is risk-off

# ---------------- Composite score weights ----------------
COMPOSITE_WEIGHTS = {
    "cross_sectional": 0.45,
    "trend": 0.30,
    "earnings": 0.15,
    "flows": 0.10,
}

# ---------------- Actionable trades ----------------
CAPITAL = 1_000_000            # trading capital (INR) for position sizing
RISK_PER_TRADE = 0.01          # risk 1% of capital per trade
RISKOFF_RISK_FACTOR = 0.5      # halve risk per trade when market regime is RISK-OFF

SWING_MIN_COMPOSITE = 70       # min composite score for swing candidates
SWING_RSI_RANGE = (45, 75)     # avoid oversold knife-catches and overheated entries
SWING_T1_R = 1.5               # target 1 at 1.5x risk
SWING_T2_R = 2.5               # target 2 at 2.5x risk

POS_MIN_COMPOSITE = 75         # min composite score for positional candidates
POS_MIN_52W_PCT = 0.85         # must be within 15% of 52-week high
POS_MAX_RISK_PCT = 0.12        # cap positional stop distance at 12%
POS_T1_R = 2.0                 # positional target 1 at 2x risk
POS_T2_R = 3.5                 # positional target 2 at 3.5x risk

# ---------------- Output ----------------
OUTPUT_DIR = "output"
REPORT_NAME = "08_Momentum_Screener_Report.xlsx"
