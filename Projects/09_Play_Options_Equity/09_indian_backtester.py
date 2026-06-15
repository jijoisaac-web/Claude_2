#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════╗
║  🇮🇳  Indian Stock Market Backtester — Professional Edition          ║
║  Supports: NSE • BSE • F&O Stocks                                    ║
║  Strategies: 9 institutional-grade strategies                        ║
║  Horizons: Swing | Short-term | Momentum | Long-term                ║
╚══════════════════════════════════════════════════════════════════════╝
DISCLAIMER: For educational & research purposes only. Not financial advice.

Requirements:
    pip install yfinance pandas numpy matplotlib

Run:
    python indian_backtester.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import warnings
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure
import matplotlib.dates as mdates
import matplotlib.gridspec as gridspec

warnings.filterwarnings('ignore')

try:
    import yfinance as yf
    YF_OK = True
except ImportError:
    YF_OK = False

# ══════════════════════════════════════════════════════════════════════════════
# COLOUR PALETTE  (GitHub-dark inspired)
# ══════════════════════════════════════════════════════════════════════════════
C = {
    'bg':     '#0d1117',
    'card':   '#161b22',
    'border': '#30363d',
    'accent': '#1f6feb',
    'green':  '#3fb950',
    'red':    '#f85149',
    'yellow': '#d29922',
    'blue':   '#58a6ff',
    'purple': '#a371f7',
    'orange': '#f0883e',
    'text':   '#e6edf3',
    'sub':    '#8b949e',
    'hdr':    '#0f1923',
}

plt.rcParams.update({
    'axes.facecolor':   C['card'],
    'figure.facecolor': C['bg'],
    'axes.edgecolor':   C['border'],
    'axes.labelcolor':  C['text'],
    'text.color':       C['text'],
    'xtick.color':      C['sub'],
    'ytick.color':      C['sub'],
    'grid.color':       '#21262d',
    'grid.linestyle':   '--',
    'grid.alpha':       0.4,
    'legend.facecolor': C['card'],
    'legend.edgecolor': C['border'],
    'legend.fontsize':  7,
})

# ══════════════════════════════════════════════════════════════════════════════
# NSE F&O POPULAR STOCKS
# ══════════════════════════════════════════════════════════════════════════════
FNO_STOCKS = [
    "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","HINDUNILVR","ITC",
    "SBIN","BAJFINANCE","BHARTIARTL","KOTAKBANK","LT","ASIANPAINT",
    "AXISBANK","MARUTI","TITAN","SUNPHARMA","WIPRO","ULTRACEMCO","TECHM",
    "HCLTECH","POWERGRID","NTPC","TATASTEEL","INDUSINDBK","NESTLEIND",
    "BAJAJFINSV","DRREDDY","CIPLA","DIVISLAB","TATAMOTORS","ONGC",
    "M&M","COALINDIA","EICHERMOT","ADANIENT","ADANIPORTS","JSWSTEEL",
    "BPCL","HDFCLIFE","SBILIFE","GRASIM","TATACONSUM","APOLLOHOSP",
    "HINDALCO","VEDL","DLF","GODREJCP","PIDILITIND","BERGEPAINT",
]

# ══════════════════════════════════════════════════════════════════════════════
# TECHNICAL INDICATOR LIBRARY
# ══════════════════════════════════════════════════════════════════════════════

def ema(s, n):  return s.ewm(span=n, adjust=False).mean()
def sma(s, n):  return s.rolling(n).mean()

def rsi(s, n=14):
    d = s.diff()
    g = d.clip(lower=0).ewm(com=n-1, adjust=False).mean()
    l = (-d.clip(upper=0)).ewm(com=n-1, adjust=False).mean()
    return 100 - 100 / (1 + g / l.replace(0, np.nan))

def macd(s, fast=12, slow=26, sig=9):
    m = ema(s, fast) - ema(s, slow)
    return m, ema(m, sig), m - ema(m, sig)

def bollinger(s, n=20, k=2):
    m = sma(s, n);  std = s.rolling(n).std()
    return m + k*std, m, m - k*std

def atr(df, n=14):
    h, l, c = df['High'], df['Low'], df['Close']
    tr = pd.concat([h-l, (h-c.shift()).abs(), (l-c.shift()).abs()], axis=1).max(1)
    return tr.ewm(com=n-1, adjust=False).mean()

def supertrend(df, n=10, mult=3):
    _atr = atr(df, n)
    hl2  = (df['High'] + df['Low']) / 2
    ub0  = (hl2 + mult * _atr).values
    lb0  = (hl2 - mult * _atr).values
    c    = df['Close'].values
    N    = len(c)
    ub   = np.zeros(N); lb = np.zeros(N)
    st   = np.zeros(N); d  = np.ones(N, dtype=int)

    for i in range(1, N):
        ub[i] = ub0[i] if (ub0[i] < ub[i-1] or c[i-1] > ub[i-1]) else ub[i-1]
        lb[i] = lb0[i] if (lb0[i] > lb[i-1] or c[i-1] < lb[i-1]) else lb[i-1]
        if   st[i-1] == ub[i-1] and c[i] <= ub[i]: d[i] = -1
        elif st[i-1] == ub[i-1] and c[i] >  ub[i]: d[i] =  1
        elif st[i-1] == lb[i-1] and c[i] >= lb[i]: d[i] =  1
        elif st[i-1] == lb[i-1] and c[i] <  lb[i]: d[i] = -1
        else:                                        d[i] =  d[i-1]
        st[i] = lb[i] if d[i] == 1 else ub[i]

    return pd.Series(st, index=df.index), pd.Series(d, index=df.index)

def stochastic(df, k=14, d=3):
    lo = df['Low'].rolling(k).min();  hi = df['High'].rolling(k).max()
    K  = 100 * (df['Close'] - lo) / (hi - lo)
    return K, K.rolling(d).mean()

# ══════════════════════════════════════════════════════════════════════════════
# STRATEGY LIBRARY  — each returns (signal_series, indicator_dict)
# signal: +1 = buy,  -1 = sell,  0 = hold
# ══════════════════════════════════════════════════════════════════════════════

class Strats:

    @staticmethod
    def ema_cross(df, fast=9, slow=21):
        """EMA Crossover — Swing & Momentum"""
        c = df['Close'];  ef = ema(c, fast);  es = ema(c, slow)
        sig = pd.Series(0, index=df.index)
        sig[(ef > es) & (ef.shift() <= es.shift())] =  1
        sig[(ef < es) & (ef.shift() >= es.shift())] = -1
        return sig, {'EMA Fast': ef, 'EMA Slow': es}

    @staticmethod
    def rsi_momentum(df, rsi_n=14, ob=65, os=40):
        """RSI Momentum — Institutional momentum filter"""
        c = df['Close'];  r = rsi(c, rsi_n);  e50 = ema(c, 50)
        sig = pd.Series(0, index=df.index)
        sig[(r > os) & (r.shift() <= os) & (c > e50)]  =  1
        sig[(r > ob) | (c < e50 * 0.98)]               = -1
        return sig, {'RSI': r, 'EMA 50': e50}

    @staticmethod
    def macd_cross(df):
        """MACD Signal Crossover — Classic trend"""
        c = df['Close'];  m, s, h = macd(c)
        sig = pd.Series(0, index=df.index)
        sig[(m > s) & (m.shift() <= s.shift())] =  1
        sig[(m < s) & (m.shift() >= s.shift())] = -1
        return sig, {'MACD': m, 'Signal': s, 'Histogram': h}

    @staticmethod
    def bollinger_rev(df, n=20, k=2):
        """Bollinger Band Mean Reversion — Range-bound swing"""
        c = df['Close'];  up, mid, lo = bollinger(c, n, k);  r = rsi(c)
        sig = pd.Series(0, index=df.index)
        sig[(c < lo) & (r < 35)]  =  1
        sig[c > up]                = -1
        return sig, {'BB Upper': up, 'BB Mid': mid, 'BB Lower': lo}

    @staticmethod
    def supertrend_strat(df, n=10, mult=3):
        """Supertrend — Most popular NSE strategy"""
        st, d = supertrend(df, n, mult)
        sig = pd.Series(0, index=df.index)
        sig[(d == 1) & (d.shift() == -1)] =  1
        sig[(d ==-1) & (d.shift() ==  1)] = -1
        return sig, {'Supertrend': st, '_Direction': d}

    @staticmethod
    def golden_cross(df):
        """Golden / Death Cross — Long-term institutional"""
        c = df['Close'];  s50 = sma(c, 50);  s200 = sma(c, 200)
        sig = pd.Series(0, index=df.index)
        sig[(s50 > s200) & (s50.shift() <= s200.shift())] =  1   # Golden
        sig[(s50 < s200) & (s50.shift() >= s200.shift())] = -1   # Death
        return sig, {'SMA 50': s50, 'SMA 200': s200}

    @staticmethod
    def breakout_vol(df, lb=60):
        """52-Week Breakout + Volume — Institutional accumulation"""
        c = df['Close'];  h = df['High'];  v = df['Volume']
        high_lb = h.rolling(min(lb*5, len(df)-1)).max().shift()
        v_avg   = v.rolling(20).mean()
        e200    = ema(c, 200)
        sig = pd.Series(0, index=df.index)
        sig[(c > high_lb) & (v > v_avg * 1.5)] =  1
        sig[c < e200 * 0.96]                    = -1
        return sig, {'52W High': high_lb, 'EMA 200': e200}

    @staticmethod
    def dual_rsi(df, rs=5, rl=14):
        """Dual RSI (Connors) — Short-term mean reversion"""
        c = df['Close'];  rs5 = rsi(c, rs);  rl14 = rsi(c, rl);  e200 = ema(c, 200)
        sig = pd.Series(0, index=df.index)
        sig[(c > e200) & (rs5 < 25)] =  1
        sig[rs5 > 70]                = -1
        return sig, {'RSI Short': rs5, 'RSI Long': rl14, 'EMA 200': e200}

    @staticmethod
    def stoch_rsi(df):
        """Stochastic RSI — Precision entry"""
        c = df['Close'];  K, D = stochastic(df);  e21 = ema(c, 21)
        sig = pd.Series(0, index=df.index)
        sig[(K > D) & (K.shift() <= D.shift()) & (K < 30) & (c > e21)] =  1
        sig[(K < D) & (K.shift() >= D.shift()) & (K > 70)]             = -1
        return sig, {'%K': K, '%D': D}


# Registry — displayed name → function
STRATEGY_MAP = {
    'EMA Crossover (9/21)':    Strats.ema_cross,
    'RSI Momentum':             Strats.rsi_momentum,
    'MACD Crossover':           Strats.macd_cross,
    'Bollinger Band Reversal':  Strats.bollinger_rev,
    'Supertrend':               Strats.supertrend_strat,
    'Golden / Death Cross':     Strats.golden_cross,
    'Breakout + Volume':        Strats.breakout_vol,
    'Dual RSI (Connors)':       Strats.dual_rsi,
    'Stochastic RSI':           Strats.stoch_rsi,
}

# Best-fit horizon scores (0-100)  per strategy
HORIZON_FIT = {
    'EMA Crossover (9/21)':   {'swing':90,'short':70,'momentum':80,'long':35},
    'RSI Momentum':            {'swing':65,'short':78,'momentum':95,'long':50},
    'MACD Crossover':          {'swing':70,'short':65,'momentum':85,'long':60},
    'Bollinger Band Reversal': {'swing':90,'short':75,'momentum':45,'long':30},
    'Supertrend':              {'swing':80,'short':72,'momentum':78,'long':70},
    'Golden / Death Cross':    {'swing':20,'short':20,'momentum':40,'long':95},
    'Breakout + Volume':       {'swing':55,'short':60,'momentum':82,'long':88},
    'Dual RSI (Connors)':      {'swing':70,'short':92,'momentum':65,'long':25},
    'Stochastic RSI':          {'swing':88,'short':84,'momentum':60,'long':30},
}

# ══════════════════════════════════════════════════════════════════════════════
# BACKTESTING ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class Backtester:
    def __init__(self, capital=100_000, sl_pct=5.0, tp_pct=15.0):
        self.capital = capital
        self.sl = sl_pct / 100
        self.tp = tp_pct / 100

    def run(self, df, sig):
        cap   = self.capital
        pos   = 0
        ep    = 0.0
        ed    = None
        trades  = []
        equity  = []

        close  = df['Close'].values
        dates  = df.index
        sigs   = sig.values

        for i in range(len(df)):
            price = close[i]
            date  = dates[i]
            s     = sigs[i]

            # ── Check SL / TP / sell signal while in position ──
            if pos > 0:
                chg = (price - ep) / ep
                exit_reason = None
                if   chg <= -self.sl: exit_reason = 'SL'
                elif chg >=  self.tp: exit_reason = 'TP'
                elif s == -1:         exit_reason = 'Signal'

                if exit_reason:
                    pnl = (price - ep) * pos
                    cap += price * pos
                    trades.append({
                        'Entry Date':   str(ed)[:10],
                        'Exit Date':    str(date)[:10],
                        'Entry ₹':      round(ep, 2),
                        'Exit ₹':       round(price, 2),
                        'Qty':          pos,
                        'P&L ₹':        round(pnl, 2),
                        'Return %':     round(chg * 100, 2),
                        'Exit Reason':  exit_reason,
                        'Result':       'WIN' if pnl > 0 else 'LOSS',
                        'Hold Days':    (date - ed).days,
                    })
                    pos = 0; ep = 0.0; ed = None

            # ── Enter position ──
            if s == 1 and pos == 0 and cap > price * 1:
                pos = int(cap * 0.95 / price)
                if pos > 0:
                    ep  = price
                    ed  = date
                    cap -= pos * price

            equity.append(cap + pos * price)

        # Close open trade at end
        if pos > 0:
            price = close[-1]; date = dates[-1]
            chg   = (price - ep) / ep
            pnl   = (price - ep) * pos
            cap  += price * pos
            trades.append({
                'Entry Date':  str(ed)[:10],
                'Exit Date':   str(date)[:10],
                'Entry ₹':     round(ep, 2),
                'Exit ₹':      round(price, 2),
                'Qty':         pos,
                'P&L ₹':       round(pnl, 2),
                'Return %':    round(chg * 100, 2),
                'Exit Reason': 'EOD',
                'Result':      'WIN' if pnl > 0 else 'LOSS',
                'Hold Days':   (date - ed).days,
            })

        eq = pd.Series(equity, index=df.index)
        return trades, self._metrics(trades, eq), eq

    def _metrics(self, trades, eq):
        if not trades:
            return dict(total_ret=0, total_ret_pct=0, sharpe=0, max_dd=0,
                        win_rate=0, n_trades=0, wins=0, losses=0,
                        avg_ret=0, best=0, worst=0, avg_hold=0, score=0)
        t    = pd.DataFrame(trades)
        wins = t[t['Result'] == 'WIN']
        loss = t[t['Result'] == 'LOSS']

        final     = eq.iloc[-1]
        total_ret = final - self.capital
        ret_pct   = total_ret / self.capital * 100

        dr     = eq.pct_change().dropna()
        sharpe = (dr.mean() / dr.std() * np.sqrt(252)) if dr.std() > 0 else 0

        roll_max = eq.cummax()
        dd_pct   = ((eq - roll_max) / roll_max).min() * 100

        win_rate = len(wins) / len(t) * 100
        avg_ret  = t['Return %'].mean()

        score = (
            min(ret_pct, 200)   * 0.30 +
            win_rate            * 0.25 +
            min(sharpe * 20, 40)* 0.25 +
            max(dd_pct + 100, 0)* 0.10 +
            min(len(t), 20)     * 0.50
        )

        return dict(
            total_ret     = round(total_ret, 2),
            total_ret_pct = round(ret_pct, 2),
            sharpe        = round(sharpe, 2),
            max_dd        = round(dd_pct, 2),
            win_rate      = round(win_rate, 1),
            n_trades      = len(t),
            wins          = len(wins),
            losses        = len(loss),
            avg_ret       = round(avg_ret, 2),
            best          = round(t['Return %'].max(), 2),
            worst         = round(t['Return %'].min(), 2),
            avg_hold      = round(t['Hold Days'].mean(), 1),
            score         = round(score, 1),
        )

# ══════════════════════════════════════════════════════════════════════════════
# RECOMMENDATION ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def recommend(all_results, df, symbol):
    c  = df['Close']
    r  = rsi(c)

    e20  = ema(c, 20).iloc[-1];  e50 = ema(c, 50).iloc[-1]
    e200 = ema(c, 200).iloc[-1]; cur = c.iloc[-1]
    rsi_val = r.iloc[-1]

    trend = ('STRONG UPTREND'  if cur > e20 > e50 > e200 else
             'UPTREND'         if cur > e50 > e200       else
             'DOWNTREND'       if cur < e50 < e200       else 'SIDEWAYS')

    vol_ann  = c.pct_change().std() * np.sqrt(252) * 100
    vol_lbl  = 'HIGH' if vol_ann > 40 else 'MODERATE' if vol_ann > 20 else 'LOW'
    rsi_lbl  = 'OVERBOUGHT' if rsi_val > 70 else 'OVERSOLD' if rsi_val < 30 else 'NEUTRAL'

    # Sort by backtested score
    ranked = sorted(all_results.items(), key=lambda x: x[1]['m']['score'], reverse=True)
    best   = ranked[0][0] if ranked else 'N/A'

    horizon_best = {}
    for hz in ['swing', 'short', 'momentum', 'long']:
        top_s, top_v = 'N/A', -999
        for name, res in all_results.items():
            m   = res['m']
            fit = HORIZON_FIT.get(name, {}).get(hz, 50)
            v   = m['score'] * 0.6 + fit * 0.4
            if v > top_v and m['n_trades'] > 0:
                top_v = v; top_s = name
        horizon_best[hz] = top_s

    bm = all_results.get(best, {}).get('m', {})
    ret_pct = bm.get('total_ret_pct', 0)
    wr      = bm.get('win_rate', 0)

    verdict = ('🟢 STRONG BUY CANDIDATE' if ret_pct > 50 and wr > 55 else
               '🟡 MODERATE BUY CANDIDATE' if ret_pct > 20 else
               '⚪ WATCHLIST'             if ret_pct > 0  else
               '🔴 AVOID / SHORT CANDIDATE')
    risk    = ('LOW'         if ret_pct > 50 and wr > 60 else
               'MEDIUM'      if ret_pct > 20 else
               'MEDIUM-HIGH' if ret_pct > 0  else 'HIGH')

    return dict(
        symbol    = symbol,
        cur_price = round(cur, 2),
        trend     = trend,
        volatility= f'{vol_lbl}  ({vol_ann:.1f}% ann.)',
        rsi       = f'{rsi_lbl}  ({rsi_val:.1f})',
        best_all  = best,
        best_ret  = ret_pct,
        swing     = horizon_best['swing'],
        short     = horizon_best['short'],
        momentum  = horizon_best['momentum'],
        long      = horizon_best['long'],
        verdict   = verdict,
        risk      = risk,
    )

# ══════════════════════════════════════════════════════════════════════════════
# GUI
# ══════════════════════════════════════════════════════════════════════════════

class App:

    def __init__(self, root):
        self.root = root
        root.title("🇮🇳 Indian Stock Market Backtester — Professional Edition")
        root.geometry("1540x940")
        root.configure(bg=C['bg'])
        root.minsize(1200, 720)

        self.df          = None
        self.all_results = {}
        self.rec         = {}
        self._status     = tk.StringVar(value="Ready — enter a symbol and click RUN BACKTEST")

        self._style()
        self._header()
        self._body()

    # ── Style ──────────────────────────────────────────────────────────────

    def _style(self):
        s = ttk.Style()
        s.theme_use('clam')
        s.configure('TNotebook',        background=C['bg'],   borderwidth=0)
        s.configure('TNotebook.Tab',    background=C['card'], foreground=C['sub'],
                    padding=[14, 7], font=('Consolas', 9, 'bold'))
        s.map('TNotebook.Tab',
              background=[('selected', C['accent'])],
              foreground=[('selected', C['text'])])
        s.configure('Treeview', background=C['card'], foreground=C['text'],
                    fieldbackground=C['card'], rowheight=26, font=('Consolas', 8))
        s.configure('Treeview.Heading', background='#1c2128', foreground=C['blue'],
                    font=('Consolas', 8, 'bold'))
        s.map('Treeview', background=[('selected', '#1f6feb')])
        s.configure('TCombobox', fieldbackground='#21262d', background='#21262d',
                    foreground=C['text'])
        s.configure('Vertical.TScrollbar', background=C['border'], troughcolor=C['bg'])

    # ── Header ─────────────────────────────────────────────────────────────

    def _header(self):
        h = tk.Frame(self.root, bg=C['hdr'], height=52)
        h.pack(fill='x'); h.pack_propagate(False)
        tk.Label(h, text='  🇮🇳  Indian Stock Market Backtester',
                 font=('Arial', 15, 'bold'), bg=C['hdr'], fg=C['text']).pack(side='left', padx=16)
        tk.Label(h, text='NSE • BSE • F&O • 9 Professional Strategies',
                 font=('Arial', 9), bg=C['hdr'], fg=C['sub']).pack(side='left', padx=4)
        tk.Label(h, textvariable=self._status,
                 font=('Consolas', 8), bg=C['hdr'], fg=C['green']).pack(side='right', padx=18)

    # ── Body ───────────────────────────────────────────────────────────────

    def _body(self):
        body = tk.Frame(self.root, bg=C['bg'])
        body.pack(fill='both', expand=True, padx=8, pady=8)

        left = tk.Frame(body, bg=C['card'], width=288)
        left.pack(side='left', fill='y', padx=(0, 8))
        left.pack_propagate(False)
        self._controls(left)

        self._right = tk.Frame(body, bg=C['bg'])
        self._right.pack(side='left', fill='both', expand=True)
        self._welcome()

    # ── Controls ───────────────────────────────────────────────────────────

    def _controls(self, p):

        def sec(title):
            f = tk.Frame(p, bg=C['card'])
            f.pack(fill='x', padx=10, pady=(12, 0))
            tk.Label(f, text=title, font=('Consolas', 7, 'bold'),
                     bg=C['card'], fg=C['sub']).pack(anchor='w')
            tk.Frame(f, bg=C['border'], height=1).pack(fill='x', pady=2)
            return f

        def lbl(parent, text):
            tk.Label(parent, text=text, font=('Arial', 8),
                     bg=C['card'], fg=C['sub']).pack(anchor='w', pady=(5, 0))

        def inp(parent, var, fg=C['text'], bold=False):
            font = ('Consolas', 11, 'bold') if bold else ('Consolas', 10)
            e = tk.Entry(parent, textvariable=var, font=font,
                         bg='#21262d', fg=fg, insertbackground=C['text'],
                         relief='flat', bd=5)
            e.pack(fill='x', pady=(0, 2))
            return e

        # ─ Stock ─
        s1 = sec('📊  STOCK SELECTION')
        lbl(s1, 'NSE Symbol  (e.g. RELIANCE, TCS, INFY)')
        self.sym_v = tk.StringVar(value='RELIANCE')
        inp(s1, self.sym_v, fg=C['blue'], bold=True)

        lbl(s1, 'Exchange')
        self.exch_v = tk.StringVar(value='NSE (.NS)')
        ttk.Combobox(s1, textvariable=self.exch_v,
                     values=['NSE (.NS)', 'BSE (.BO)'],
                     state='readonly', font=('Arial', 9)).pack(fill='x', pady=(0,3))

        lbl(s1, 'Quick Pick — F&O stocks')
        self.quick_v = tk.StringVar()
        qcb = ttk.Combobox(s1, textvariable=self.quick_v,
                            values=FNO_STOCKS, state='readonly', font=('Arial', 9))
        qcb.pack(fill='x', pady=(0, 3))
        qcb.bind('<<ComboboxSelected>>', lambda _: self.sym_v.set(self.quick_v.get()))

        # ─ Dates ─
        s2 = sec('📅  DATE RANGE')
        lbl(s2, 'Start Date')
        self.start_v = tk.StringVar(value=(datetime.now()-timedelta(days=730)).strftime('%Y-%m-%d'))
        inp(s2, self.start_v)

        lbl(s2, 'End Date')
        self.end_v = tk.StringVar(value=datetime.now().strftime('%Y-%m-%d'))
        inp(s2, self.end_v)

        bf = tk.Frame(s2, bg=C['card']); bf.pack(fill='x', pady=4)
        for lbl_t, d in [('6M',180),('1Y',365),('2Y',730),('3Y',1095),('5Y',1825)]:
            tk.Button(bf, text=lbl_t, font=('Arial', 8), bg=C['border'], fg=C['text'],
                      relief='flat', bd=0, padx=7, pady=3,
                      command=lambda days=d: self._quick_date(days)).pack(side='left', padx=1)

        # ─ Capital ─
        s3 = sec('💰  BACKTEST SETTINGS')
        lbl(s3, 'Initial Capital  (₹)')
        self.cap_v = tk.StringVar(value='100000')
        inp(s3, self.cap_v, fg=C['yellow'])

        lbl(s3, 'Stop Loss  %')
        self.sl_v = tk.StringVar(value='5')
        inp(s3, self.sl_v, fg=C['red'])

        lbl(s3, 'Target Profit  %')
        self.tp_v = tk.StringVar(value='15')
        inp(s3, self.tp_v, fg=C['green'])

        # ─ Strategy ─
        s4 = sec('⚡  STRATEGY')
        lbl(s4, 'Strategy to Chart')
        self.strat_v = tk.StringVar(value='All Strategies')
        ttk.Combobox(s4, textvariable=self.strat_v,
                     values=['All Strategies'] + list(STRATEGY_MAP),
                     state='readonly', font=('Arial', 9)).pack(fill='x', pady=(0,3))

        # ─ Run ─
        tk.Frame(p, bg=C['card'], height=8).pack()
        self._run_btn = tk.Button(p, text='▶   RUN BACKTEST',
                                  font=('Arial', 12, 'bold'),
                                  bg='#238636', fg='white',
                                  relief='flat', pady=13, cursor='hand2',
                                  command=self._launch)
        self._run_btn.pack(fill='x', padx=10, pady=6)
        self._run_btn.bind('<Enter>', lambda _: self._run_btn.config(bg='#2ea043'))
        self._run_btn.bind('<Leave>', lambda _: self._run_btn.config(bg='#238636'))

        # ─ Disclaimer ─
        disc = tk.Frame(p, bg='#0f1923')
        disc.pack(fill='x', padx=8, pady=6, side='bottom')
        tk.Label(disc, text='⚠  Educational purposes only.\nNot financial advice.',
                 font=('Arial', 7), bg='#0f1923', fg=C['sub'],
                 justify='center', wraplength=260).pack(pady=6)

    def _quick_date(self, days):
        e = datetime.now()
        self.start_v.set((e - timedelta(days=days)).strftime('%Y-%m-%d'))
        self.end_v.set(e.strftime('%Y-%m-%d'))

    # ── Welcome screen ─────────────────────────────────────────────────────

    def _welcome(self):
        self._wf = tk.Frame(self._right, bg=C['bg'])
        self._wf.pack(fill='both', expand=True)
        tk.Label(self._wf, text='🇮🇳  Indian Stock Backtester',
                 font=('Arial', 24, 'bold'), bg=C['bg'], fg=C['text']).pack(pady=(100, 12))
        tk.Label(self._wf, text='Enter a stock symbol on the left and click  ▶ RUN BACKTEST',
                 font=('Arial', 12), bg=C['bg'], fg=C['sub']).pack()
        for t in ['📈  9 professional strategies tested simultaneously',
                  '🎯  Best strategy picked per investment horizon automatically',
                  '📊  Supertrend · MACD · RSI · Bollinger · Golden Cross · Breakout',
                  '⚡  Supports all NSE F&O stocks  (add .NS / .BO suffix automatically)']:
            tk.Label(self._wf, text=t, font=('Arial', 11), bg=C['bg'], fg=C['sub']).pack(pady=4)

    # ── Launch backtest thread ──────────────────────────────────────────────

    def _launch(self):
        self._run_btn.config(state='disabled', text='⏳  Fetching…')
        self._status.set('Downloading data…')
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        try:
            if not YF_OK:
                raise ImportError('yfinance not installed.\n\nRun:  pip install yfinance')

            sym    = self.sym_v.get().strip().upper()
            suffix = '.NS' if 'NSE' in self.exch_v.get() else '.BO'
            tick   = sym + suffix
            cap    = float(self.cap_v.get())
            sl     = float(self.sl_v.get())
            tp_    = float(self.tp_v.get())

            self._status.set(f'Downloading  {tick} …')
            df = yf.download(tick, start=self.start_v.get(),
                             end=self.end_v.get(), progress=False)

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            df.dropna(inplace=True)

            if df.empty:
                raise ValueError(f'No data for  {tick}\n\nCheck the symbol and try again.')
            if len(df) < 80:
                raise ValueError(f'Only {len(df)} rows — use a longer date range.')

            self.df = df

            sel = self.strat_v.get()
            strats = STRATEGY_MAP if sel == 'All Strategies' else {sel: STRATEGY_MAP[sel]}

            bt           = Backtester(cap, sl, tp_)
            all_results  = {}

            for name, fn in strats.items():
                self._status.set(f'Testing  {name} …')
                try:
                    sig, inds       = fn(df)
                    trades, m, eq   = bt.run(df, sig)
                    all_results[name] = dict(sig=sig, inds=inds, trades=trades, m=m, eq=eq)
                except Exception as ex:
                    print(f'[SKIP] {name}: {ex}')

            self.all_results = all_results
            self.rec         = recommend(all_results, df, sym)
            self._status.set(f'✓  {sym}  —  {len(all_results)} strategies tested')
            self.root.after(0, self._render)

        except Exception as ex:
            msg = str(ex)
            self.root.after(0, lambda: messagebox.showerror('Error', msg))
            self.root.after(0, lambda: self._status.set('Error — see popup'))
        finally:
            self.root.after(0, lambda: self._run_btn.config(state='normal', text='▶   RUN BACKTEST'))

    # ── Render results ─────────────────────────────────────────────────────

    def _render(self):
        # Remove welcome / old notebook
        for w in self._right.winfo_children():
            w.destroy()

        nb = ttk.Notebook(self._right)
        nb.pack(fill='both', expand=True)

        # Tabs
        self._t_summary  = tk.Frame(nb, bg=C['bg'])
        self._t_chart    = tk.Frame(nb, bg=C['bg'])
        self._t_compare  = tk.Frame(nb, bg=C['bg'])
        self._t_rec      = tk.Frame(nb, bg=C['bg'])
        self._t_trades   = tk.Frame(nb, bg=C['bg'])

        nb.add(self._t_summary, text='  📊 Summary  ')
        nb.add(self._t_chart,   text='  📈 Chart  ')
        nb.add(self._t_compare, text='  ⚖ Compare  ')
        nb.add(self._t_rec,     text='  🎯 Recommendation  ')
        nb.add(self._t_trades,  text='  📋 Trade Log  ')

        ranked    = sorted(self.all_results.items(),
                           key=lambda x: x[1]['m']['score'], reverse=True)
        best_name = ranked[0][0] if ranked else list(self.all_results)[0]

        self._build_summary(best_name)
        self._build_chart_tab(best_name)
        self._build_compare()
        self._build_rec()
        self._build_trades(best_name)

    # ══════════════════════════════════════════════════════════════════════
    # TAB — SUMMARY
    # ══════════════════════════════════════════════════════════════════════

    def _build_summary(self, best):
        p  = self._t_summary
        m  = self.all_results[best]['m']
        eq = self.all_results[best]['eq']
        r  = self.rec

        # ─ top bar ─
        bar = tk.Frame(p, bg=C['card']); bar.pack(fill='x', padx=10, pady=(10,4))
        tk.Label(bar, text=f"  {r['symbol']}  ·  {best}",
                 font=('Arial', 13, 'bold'), bg=C['card'], fg=C['text']).pack(side='left', padx=8, pady=8)
        vcolor = C['green'] if 'BUY' in r['verdict'] else C['yellow'] if 'WATCH' in r['verdict'] else C['red']
        tk.Label(bar, text=r['verdict'], font=('Arial', 11, 'bold'),
                 bg=C['card'], fg=vcolor).pack(side='right', padx=12)

        # ─ metric cards ─
        def card(parent, label, val, color, c_col, c_row):
            f = tk.Frame(parent, bg='#21262d')
            f.grid(row=c_row, column=c_col, padx=5, pady=5, sticky='nsew')
            parent.columnconfigure(c_col, weight=1)
            tk.Label(f, text=label, font=('Arial', 8), bg='#21262d', fg=C['sub']).pack(pady=(7,0))
            tk.Label(f, text=val,   font=('Arial', 15,'bold'), bg='#21262d', fg=color).pack(pady=(0,7))

        row1 = tk.Frame(p, bg=C['bg']); row1.pack(fill='x', padx=10, pady=2)
        rc   = C['green'] if m['total_ret_pct'] > 0 else C['red']
        sc   = C['green'] if m['sharpe'] > 1 else C['yellow'] if m['sharpe'] > 0 else C['red']
        cards = [
            ('Total Return', f"₹{m['total_ret']:+,.0f}", rc),
            ('Return %',     f"{m['total_ret_pct']:+.1f}%", rc),
            ('Sharpe Ratio', f"{m['sharpe']:.2f}", sc),
            ('Max Drawdown', f"{m['max_dd']:.1f}%", C['red']),
            ('Win Rate',     f"{m['win_rate']:.1f}%", C['green'] if m['win_rate']>50 else C['red']),
            ('Trades',       str(m['n_trades']), C['blue']),
            ('Wins',         str(m['wins']),     C['green']),
            ('Losses',       str(m['losses']),   C['red']),
        ]
        for i,(l,v,col) in enumerate(cards):
            card(row1, l, v, col, i%4, i//4)

        row2 = tk.Frame(p, bg=C['bg']); row2.pack(fill='x', padx=10, pady=2)
        for i,(l,v,col) in enumerate([
            ('Best Trade',    f"{m['best']:+.1f}%",    C['green']),
            ('Worst Trade',   f"{m['worst']:+.1f}%",   C['red']),
            ('Avg Return',    f"{m['avg_ret']:+.1f}%", C['text']),
            ('Avg Hold',      f"{m['avg_hold']} days", C['text']),
        ]):
            card(row2, l, v, col, i, 0)

        # ─ stock snapshot ─
        snap = tk.Frame(p, bg=C['card']); snap.pack(fill='x', padx=10, pady=4)
        r2 = self.rec
        for l, v in [('Price', f"₹{r2['cur_price']}"), ('Trend', r2['trend']),
                     ('Volatility', r2['volatility']), ('RSI', r2['rsi']),
                     ('Risk', r2['risk'])]:
            f = tk.Frame(snap, bg=C['card']); f.pack(side='left', padx=14, pady=7)
            tk.Label(f, text=l, font=('Arial', 8), bg=C['card'], fg=C['sub']).pack()
            tk.Label(f, text=v, font=('Consolas', 9,'bold'), bg=C['card'], fg=C['text'],
                     wraplength=140).pack()

        # ─ equity curve ─
        fig = Figure(figsize=(10, 3.2), dpi=96, facecolor=C['bg'])
        ax  = fig.add_subplot(111)
        ax.set_facecolor(C['card'])
        init = float(self.cap_v.get())
        ax.plot(eq.index, eq.values, color=C['blue'], lw=1.5, label='Portfolio')
        ax.axhline(init, color=C['sub'], ls='--', lw=0.8, label='Initial Capital')
        ax.fill_between(eq.index, eq.values, init,
                        where=eq.values >= init, alpha=0.12, color=C['green'])
        ax.fill_between(eq.index, eq.values, init,
                        where=eq.values  < init, alpha=0.12, color=C['red'])
        ax.set_title(f'Equity Curve — {r2["symbol"]} / {best}', color=C['text'], pad=6)
        ax.set_ylabel('₹ Value', fontsize=8); ax.grid(True, alpha=0.3); ax.legend(fontsize=8)
        fig.tight_layout()
        FigureCanvasTkAgg(fig, master=p).get_tk_widget().pack(fill='both', expand=True, padx=10, pady=(0,10))

    # ══════════════════════════════════════════════════════════════════════
    # TAB — CHART
    # ══════════════════════════════════════════════════════════════════════

    def _build_chart_tab(self, best):
        p = self._t_chart
        ctrl = tk.Frame(p, bg=C['card']); ctrl.pack(fill='x', padx=10, pady=5)
        tk.Label(ctrl, text='Strategy:', font=('Arial', 9), bg=C['card'], fg=C['sub']).pack(side='left', padx=10)
        sv = tk.StringVar(value=best)
        cb = ttk.Combobox(ctrl, textvariable=sv, values=list(self.all_results),
                          state='readonly', font=('Arial', 9), width=34)
        cb.pack(side='left', padx=5, pady=5)

        cf = tk.Frame(p, bg=C['bg']); cf.pack(fill='both', expand=True)

        def draw(*_):
            for w in cf.winfo_children(): w.destroy()
            self._draw_chart(cf, sv.get())

        cb.bind('<<ComboboxSelected>>', draw)
        draw()

    def _draw_chart(self, parent, name):
        if name not in self.all_results: return
        res  = self.all_results[name]
        df   = self.df
        sig  = res['sig']
        inds = res['inds']
        m    = res['m']
        c    = df['Close']

        fig = Figure(figsize=(12, 8), dpi=96, facecolor=C['bg'])
        gs  = gridspec.GridSpec(3, 1, figure=fig, height_ratios=[4,1,1.5], hspace=0.07)
        ax1 = fig.add_subplot(gs[0])
        ax2 = fig.add_subplot(gs[1], sharex=ax1)
        ax3 = fig.add_subplot(gs[2], sharex=ax1)
        for ax in (ax1,ax2,ax3): ax.set_facecolor(C['card'])

        # Price
        ax1.plot(df.index, c, color=C['blue'], lw=1, label='Close', zorder=3)

        COLORS = {
            'EMA Fast':'#f0883e','EMA Slow':'#a371f7',
            'EMA 50':'#d29922','EMA 200':'#f85149',
            'SMA 50':'#f0883e','SMA 200':'#f85149',
            'BB Upper':C['sub'],'BB Mid':C['sub'],'BB Lower':C['sub'],
            'Supertrend':C['green'],
        }
        for k, v in inds.items():
            if k.startswith('_') or not isinstance(v, pd.Series): continue
            ls = '--' if 'BB' in k else '-'
            al = 0.35 if 'BB' in k else 0.75
            ax1.plot(df.index, v, color=COLORS.get(k, C['sub']),
                     lw=0.9, ls=ls, alpha=al, label=k, zorder=2)

        if 'BB Upper' in inds and 'BB Lower' in inds:
            ax1.fill_between(df.index, inds['BB Upper'], inds['BB Lower'],
                             alpha=0.04, color=C['blue'])

        buy_mask  = sig == 1;  sell_mask = sig == -1
        ax1.scatter(df.index[buy_mask],  c[buy_mask],  marker='^', color=C['green'],
                    s=90, zorder=5, linewidths=0, label=f'BUY ({buy_mask.sum()})')
        ax1.scatter(df.index[sell_mask], c[sell_mask], marker='v', color=C['red'],
                    s=90, zorder=5, linewidths=0, label=f'SELL ({sell_mask.sum()})')

        ax1.set_title(
            f"{self.sym_v.get().upper()}  ·  {name}  |  "
            f"Return {m['total_ret_pct']:+.1f}%  |  "
            f"Win Rate {m['win_rate']:.0f}%  |  "
            f"Sharpe {m['sharpe']:.2f}  |  "
            f"Trades {m['n_trades']}",
            color=C['text'], fontsize=9, pad=6)
        ax1.legend(ncol=4, fontsize=7, loc='upper left')
        ax1.set_ylabel('Price (₹)', fontsize=8)
        ax1.grid(True, alpha=0.25)

        # Volume
        vc = np.where(df['Close'].values >= df['Open'].values, C['green'], C['red'])
        ax2.bar(df.index, df['Volume'], color=vc, alpha=0.55, width=1)
        ax2.set_ylabel('Volume', fontsize=7); ax2.grid(True, alpha=0.2)

        # Indicator subplot
        if 'RSI' in inds:
            r = inds['RSI']
            ax3.plot(df.index, r, color=C['purple'], lw=0.9, label='RSI')
            ax3.axhline(70, color=C['red'],   ls='--', lw=0.7, alpha=0.6)
            ax3.axhline(30, color=C['green'], ls='--', lw=0.7, alpha=0.6)
            ax3.fill_between(df.index, r, 70, where=r>70, alpha=0.12, color=C['red'])
            ax3.fill_between(df.index, r, 30, where=r<30, alpha=0.12, color=C['green'])
            ax3.set_ylim(0, 100); ax3.set_ylabel('RSI', fontsize=7)
        elif 'MACD' in inds:
            mm = inds['MACD']; ss = inds['Signal']; hh = inds['Histogram']
            ax3.plot(df.index, mm, color=C['blue'],   lw=0.9, label='MACD')
            ax3.plot(df.index, ss, color=C['orange'], lw=0.9, label='Signal')
            hc = np.where(hh.values >= 0, C['green'], C['red'])
            ax3.bar(df.index, hh, color=hc, alpha=0.5, width=1)
            ax3.axhline(0, color=C['sub'], lw=0.5)
            ax3.legend(fontsize=7); ax3.set_ylabel('MACD', fontsize=7)
        elif '%K' in inds:
            ax3.plot(df.index, inds['%K'], color=C['blue'],   lw=0.9, label='%K')
            ax3.plot(df.index, inds['%D'], color=C['orange'], lw=0.9, label='%D')
            ax3.axhline(80, color=C['red'],   ls='--', lw=0.7, alpha=0.6)
            ax3.axhline(20, color=C['green'], ls='--', lw=0.7, alpha=0.6)
            ax3.set_ylim(0, 100); ax3.legend(fontsize=7); ax3.set_ylabel('Stoch', fontsize=7)
        else:
            r = rsi(df['Close'])
            ax3.plot(df.index, r, color=C['purple'], lw=0.9)
            ax3.axhline(70, color=C['red'],   ls='--', lw=0.7, alpha=0.6)
            ax3.axhline(30, color=C['green'], ls='--', lw=0.7, alpha=0.6)
            ax3.set_ylim(0, 100); ax3.set_ylabel('RSI', fontsize=7)

        ax3.grid(True, alpha=0.2)
        ax3.xaxis.set_major_formatter(mdates.DateFormatter('%b %y'))
        ax3.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
        plt.setp(ax3.xaxis.get_majorticklabels(), rotation=30, fontsize=7)
        plt.setp(ax1.xaxis.get_majorticklabels(), visible=False)
        plt.setp(ax2.xaxis.get_majorticklabels(), visible=False)
        fig.tight_layout()

        FigureCanvasTkAgg(fig, master=parent).get_tk_widget().pack(fill='both', expand=True, padx=5, pady=5)

    # ══════════════════════════════════════════════════════════════════════
    # TAB — COMPARE
    # ══════════════════════════════════════════════════════════════════════

    def _build_compare(self):
        p = self._t_compare
        tk.Label(p, text='All Strategies — Ranked by Score',
                 font=('Arial', 11, 'bold'), bg=C['bg'], fg=C['text']).pack(pady=10)

        cols = ('Rank','Strategy','Return %','Sharpe','Win Rate','Max DD %',
                'Trades','Avg Hold','Score','Best Horizon')
        tf = tk.Frame(p, bg=C['bg']); tf.pack(fill='both', expand=False, padx=10)

        tree = ttk.Treeview(tf, columns=cols, show='headings', height=12)
        widths = [40, 200, 80, 70, 80, 80, 60, 80, 70, 120]
        for col, w in zip(cols, widths):
            tree.heading(col, text=col, anchor='center')
            tree.column(col, width=w, anchor='center', minwidth=40)

        tree.tag_configure('top',  background='#1a3a1a', foreground=C['green'])
        tree.tag_configure('pos',  background=C['card'],  foreground=C['text'])
        tree.tag_configure('neg',  background='#2a1a1a', foreground=C['sub'])

        BEST_HZ = {
            'EMA Crossover (9/21)':   'Swing',
            'RSI Momentum':            'Momentum',
            'MACD Crossover':          'Momentum',
            'Bollinger Band Reversal': 'Swing',
            'Supertrend':              'Trend',
            'Golden / Death Cross':    'Long-term',
            'Breakout + Volume':       'Breakout',
            'Dual RSI (Connors)':      'Short-term',
            'Stochastic RSI':          'Swing',
        }

        ranked = sorted(self.all_results.items(),
                        key=lambda x: x[1]['m']['score'], reverse=True)
        for i, (name, res) in enumerate(ranked):
            m   = res['m']
            tag = 'top' if i == 0 else ('pos' if m['total_ret_pct'] >= 0 else 'neg')
            tree.insert('', 'end', values=(
                f'#{i+1}', name,
                f"{m['total_ret_pct']:+.1f}%",
                f"{m['sharpe']:.2f}",
                f"{m['win_rate']:.0f}%",
                f"{m['max_dd']:.1f}%",
                str(m['n_trades']),
                f"{m['avg_hold']}d",
                f"{m['score']:.0f}",
                BEST_HZ.get(name, '-'),
            ), tags=(tag,))

        vsb = ttk.Scrollbar(tf, orient='vertical', command=tree.yview)
        tree.configure(yscrollcommand=vsb.set)
        tree.pack(side='left', fill='both', expand=True)
        vsb.pack(side='right', fill='y')

        # Bar chart
        fig = Figure(figsize=(12, 3.2), dpi=96, facecolor=C['bg'])
        ax  = fig.add_subplot(111)
        ax.set_facecolor(C['card'])
        names   = [n[:18] for n,_ in ranked]
        returns = [r['m']['total_ret_pct'] for _,r in ranked]
        bars    = ax.bar(names, returns,
                         color=[C['green'] if v >= 0 else C['red'] for v in returns],
                         alpha=0.85, edgecolor=C['border'])
        ax.axhline(0, color=C['sub'], lw=0.8)
        ax.set_title('Strategy Return Comparison (%)', color=C['text'], pad=6)
        ax.set_ylabel('Return %', fontsize=8)
        ax.tick_params(axis='x', rotation=22, labelsize=7)
        ax.grid(True, axis='y', alpha=0.25)
        for b, v in zip(bars, returns):
            ax.text(b.get_x() + b.get_width()/2,
                    b.get_height() + (1 if v >= 0 else -2),
                    f'{v:+.1f}%', ha='center', va='bottom', fontsize=7, color=C['text'])
        fig.tight_layout()
        FigureCanvasTkAgg(fig, master=p).get_tk_widget().pack(fill='x', padx=10, pady=6)

    # ══════════════════════════════════════════════════════════════════════
    # TAB — RECOMMENDATION
    # ══════════════════════════════════════════════════════════════════════

    def _build_rec(self):
        p  = self._t_rec
        r  = self.rec

        # Verdict banner
        vc = (C['green'] if 'STRONG BUY' in r['verdict'] else
              C['yellow'] if 'MODERATE'  in r['verdict'] else
              C['sub']    if 'WATCH'     in r['verdict'] else C['red'])

        ban = tk.Frame(p, bg=C['card']); ban.pack(fill='x', padx=14, pady=(14,4))
        tk.Label(ban, text=r['verdict'], font=('Arial', 20,'bold'),
                 bg=C['card'], fg=vc).pack(pady=(14,4))
        tk.Label(ban, text=f"{r['symbol']}  ·  ₹{r['cur_price']}  ·  Risk: {r['risk']}",
                 font=('Arial', 10), bg=C['card'], fg=C['sub']).pack(pady=(0,12))

        # Analysis strip
        arow = tk.Frame(ban, bg=C['card']); arow.pack(fill='x', padx=10, pady=6)
        for l, v in [('📈 Trend', r['trend']), ('📊 Volatility', r['volatility']),
                     ('⚡ RSI', r['rsi']), ('🏆 Best Strategy', r['best_all']),
                     ('💹 Best Return', f"{r['best_ret']:+.1f}%")]:
            f = tk.Frame(arow, bg='#21262d')
            f.pack(side='left', expand=True, fill='x', padx=4)
            tk.Label(f, text=l, font=('Arial', 8), bg='#21262d', fg=C['sub']).pack(pady=(6,0))
            tk.Label(f, text=v, font=('Arial', 9,'bold'), bg='#21262d', fg=C['text'],
                     wraplength=150).pack(pady=(2,6), padx=4)

        # Horizon cards
        tk.Label(p, text='Best Strategy by Investment Horizon',
                 font=('Arial', 12,'bold'), bg=C['bg'], fg=C['text']).pack(pady=(14,4))

        hf = tk.Frame(p, bg=C['bg']); hf.pack(fill='x', padx=14, pady=4)
        HORIZONS = [
            ('🔄 SWING', '2–10 days', r['swing'],
             'Short price swings\nActive daily monitoring\nIdeal: F&O scalpers', C['blue']),
            ('⚡ SHORT-TERM', '2–8 weeks', r['short'],
             'Weekly trend riding\nPart-time trader friendly\nGood risk/reward', C['orange']),
            ('🚀 MOMENTUM', '1–3 months', r['momentum'],
             'Strong trend capture\nHNI & fund favourite\nVolume confirmation key', C['purple']),
            ('🏦 LONG-TERM', '6M – 3 years', r['long'],
             'Wealth creation\nInstitutional signals\nMinimal monitoring', C['green']),
        ]
        for i, (title, dur, strat, desc, col) in enumerate(HORIZONS):
            card = tk.Frame(hf, bg=C['card'])
            card.grid(row=0, column=i, padx=7, pady=4, sticky='nsew')
            hf.columnconfigure(i, weight=1)
            tk.Frame(card, bg=col, height=3).pack(fill='x')
            tk.Label(card, text=title, font=('Arial', 10,'bold'),
                     bg=C['card'], fg=col).pack(pady=(8,1))
            tk.Label(card, text=dur, font=('Arial', 8),
                     bg=C['card'], fg=C['sub']).pack()
            tk.Frame(card, bg=C['border'], height=1).pack(fill='x', pady=5)
            tk.Label(card, text='Recommended:', font=('Arial', 8),
                     bg=C['card'], fg=C['sub']).pack()
            tk.Label(card, text=strat, font=('Consolas', 8,'bold'),
                     bg=C['card'], fg=C['text'], wraplength=180).pack(padx=5, pady=3)
            tk.Frame(card, bg=C['border'], height=1).pack(fill='x', pady=3)
            tk.Label(card, text=desc, font=('Arial', 7), bg=C['card'], fg=C['sub'],
                     wraplength=170, justify='center').pack(padx=4, pady=(2,10))

        # Strategy guide
        tk.Label(p, text='Professional Strategy Guide',
                 font=('Arial', 11,'bold'), bg=C['bg'], fg=C['text']).pack(pady=(14,5))

        gf = tk.Frame(p, bg=C['bg']); gf.pack(fill='x', padx=14, pady=4)
        GUIDES = [
            ('EMA Crossover',
             'Fast/slow EMA crossover is the backbone of professional swing desks. '
             'When 9EMA crosses above 21EMA, short-term momentum is shifting bullish. '
             'Best in trending markets — avoid in sideways/choppy conditions.'),
            ('Supertrend',
             'ATR-based adaptive trend indicator. The most widely used strategy on '
             'NSE F&O by retail and HNI traders. Flips direction signal clearly — '
             'green = hold long, red = exit/short.'),
            ('RSI Momentum',
             'Combines RSI crossing 40 with the 50EMA trend filter. Used by quant '
             'funds to enter momentum breakouts early. Works beautifully on large-cap '
             'F&O stocks with strong sector tailwinds.'),
            ('Golden Cross',
             '50SMA crossing above 200SMA — the most reliable long-term signal. '
             'Institutional funds use this to deploy bulk capital. Low frequency (~2-3 '
             'per year) but very high win rate in bull markets.'),
            ('Bollinger Band Reversal',
             'Price touching lower band + RSI < 35 = oversold bounce entry. '
             'Works exceptionally well in range-bound blue chips. '
             'Avoid during sustained downtrends.'),
            ('Breakout + Volume',
             '52-week high breakout confirmed by 1.5× average volume = institutional '
             'buying. William O\'Neil\'s CAN SLIM method. Best for momentum stocks '
             'making new highs with strong fundamentals.'),
        ]
        for i, (name, desc) in enumerate(GUIDES):
            f = tk.Frame(gf, bg=C['card']); f.grid(row=i//2, column=i%2, padx=4, pady=3, sticky='ew')
            gf.columnconfigure(0, weight=1); gf.columnconfigure(1, weight=1)
            tk.Label(f, text=name, font=('Arial', 9,'bold'),
                     bg=C['card'], fg=C['blue']).pack(anchor='w', padx=8, pady=(6,0))
            tk.Label(f, text=desc, font=('Arial', 7), bg=C['card'], fg=C['sub'],
                     wraplength=420, justify='left').pack(anchor='w', padx=8, pady=(2,8))

    # ══════════════════════════════════════════════════════════════════════
    # TAB — TRADE LOG
    # ══════════════════════════════════════════════════════════════════════

    def _build_trades(self, best):
        p = self._t_trades
        ctrl = tk.Frame(p, bg=C['card']); ctrl.pack(fill='x', padx=10, pady=5)
        tk.Label(ctrl, text='Strategy:', font=('Arial', 9), bg=C['card'], fg=C['sub']).pack(side='left', padx=10)
        sv = tk.StringVar(value=best)
        cb = ttk.Combobox(ctrl, textvariable=sv, values=list(self.all_results),
                          state='readonly', font=('Arial', 9), width=34)
        cb.pack(side='left', padx=5, pady=5)

        tf = tk.Frame(p, bg=C['bg']); tf.pack(fill='both', expand=True, padx=10, pady=5)

        cols = ('Entry Date','Exit Date','Entry ₹','Exit ₹','Qty',
                'P&L ₹','Return %','Exit Reason','Result','Hold Days')
        tree = ttk.Treeview(tf, columns=cols, show='headings')
        ws   = [90, 90, 80, 80, 55, 90, 80, 90, 65, 80]
        for col, w in zip(cols, ws):
            tree.heading(col, text=col); tree.column(col, width=w, anchor='center', minwidth=40)

        tree.tag_configure('win',  background='#1a3a1a', foreground=C['green'])
        tree.tag_configure('loss', background='#2a1a1a', foreground=C['red'])

        vsb = ttk.Scrollbar(tf, orient='vertical', command=tree.yview)
        tree.configure(yscrollcommand=vsb.set)
        tree.pack(side='left', fill='both', expand=True)
        vsb.pack(side='right', fill='y')

        # Summary footer
        footer = tk.Frame(p, bg=C['card']); footer.pack(fill='x', padx=10, pady=4)

        def load(*_):
            for i in tree.get_children(): tree.delete(i)
            name = sv.get()
            if name not in self.all_results: return
            m  = self.all_results[name]['m']
            rc = C['green'] if m['total_ret_pct'] >= 0 else C['red']
            for w in footer.winfo_children(): w.destroy()
            for l, v, col in [
                ('Total P&L', f"₹{m['total_ret']:+,.0f}", rc),
                ('Return',    f"{m['total_ret_pct']:+.1f}%", rc),
                ('Win Rate',  f"{m['win_rate']:.0f}%", C['text']),
                ('Wins',      str(m['wins']),     C['green']),
                ('Losses',    str(m['losses']),   C['red']),
                ('Best',      f"{m['best']:+.1f}%", C['green']),
                ('Worst',     f"{m['worst']:+.1f}%", C['red']),
                ('Avg Hold',  f"{m['avg_hold']}d", C['text']),
            ]:
                f2 = tk.Frame(footer, bg=C['card']); f2.pack(side='left', padx=12, pady=6)
                tk.Label(f2, text=l, font=('Arial', 8),   bg=C['card'], fg=C['sub']).pack()
                tk.Label(f2, text=v, font=('Consolas',10,'bold'), bg=C['card'], fg=col).pack()

            for t in self.all_results[name]['trades']:
                tag = 'win' if t['Result'] == 'WIN' else 'loss'
                tree.insert('', 'end', values=(
                    t['Entry Date'], t['Exit Date'],
                    f"₹{t['Entry ₹']:,.2f}", f"₹{t['Exit ₹']:,.2f}",
                    str(t['Qty']),
                    f"₹{t['P&L ₹']:+,.2f}",
                    f"{t['Return %']:+.2f}%",
                    t['Exit Reason'],
                    t['Result'],
                    f"{t['Hold Days']}d",
                ), tags=(tag,))

        cb.bind('<<ComboboxSelected>>', load)
        load()


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def _ensure_deps():
    import subprocess, sys
    pkgs = []
    for pkg in ('yfinance', 'pandas', 'numpy', 'matplotlib'):
        try:
            __import__(pkg)
        except ImportError:
            pkgs.append(pkg)
    if pkgs:
        print(f'Installing: {pkgs}')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet'] + pkgs)

if __name__ == '__main__':
    _ensure_deps()
    root = tk.Tk()
    App(root)
    root.mainloop()
