#!/usr/bin/env python3
"""Shared helpers for the India Trader skills (NSE/BSE). Standard library only, Python 3.8+.

Data lives in a `trader/` folder in the current directory (override with TRADER_DIR).
"""
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))  # India has no daylight saving
OPEN_M = 9 * 60 + 15      # 09:15
CLOSE_M = 15 * 60 + 30    # 15:30
BAR_MIN = 5
UA = {"User-Agent": "Mozilla/5.0 (india-trader-skill; personal research)"}

DEFAULT_CONFIG = {
    "capital": 100000,              # INR you are willing to trade with
    "max_loss_per_trade": 500,      # INR, net of costs and slippage, if the stop fills
    "daily_loss_limit": 1500,       # INR, stop trading for the day after this
    "max_trades_per_day": 3,
    "max_position_pct": 50,         # max % of capital in one position
    "intraday_leverage": 1,         # keep 1 until you know your broker's real margin rules
    "min_net_rr": 1.0,              # min reward:risk AFTER costs and slippage
    "product": "MIS",               # MIS = intraday, CNC = delivery
    "entry_earliest": "09:30",
    "entry_latest": "11:00",        # no new entries after this (IST)
    "flat_by": "15:10",             # be out by this time (brokers auto square-off MIS later; check yours)
    "or_minutes": 15,               # opening range = first N minutes
    "orb_min_range_pct": 0.2,       # skip if the opening range is narrower than this %
    "orb_max_range_pct": 2.0,       # skip if wider than this % (stop would be too far)
    "stop_limit_buffer_pct": 0.2,   # limit price sits this % beyond the stop trigger
    "slippage_pct": 0.05,           # assumed slippage per side, % of price
    "min_avg_turnover_cr": 25,      # daily scan: skip stocks trading less than this many INR crore/day
    "holidays": [],                 # ["2026-11-24", ...] NSE trading holidays you want enforced
    "paper": True,
    # Charges. Typical discount-broker numbers; they change. VERIFY against your broker's
    # brokerage calculator and edit here.
    "costs": {
        "brokerage_flat": 20.0,             # INR per executed order (intraday)
        "brokerage_pct": 0.0003,            # or 0.03% of value, whichever is lower
        "brokerage_delivery_per_order": 0.0,
        "stt_intraday_sell": 0.00025,       # 0.025% on sell side
        "stt_delivery": 0.001,              # 0.1% on buy and sell
        "stamp_intraday_buy": 0.00003,      # 0.003% on buy side
        "stamp_delivery_buy": 0.00015,      # 0.015% on buy side
        "exchange_txn": 0.0000297,          # NSE transaction charge on turnover
        "sebi": 0.000001,                   # INR 10 per crore
        "gst": 0.18,                        # on brokerage + exchange + SEBI fees
    },
}


# ---------- files / config ----------
def data_dir():
    d = os.environ.get("TRADER_DIR", "trader")
    os.makedirs(d, exist_ok=True)
    return d


def data_path(name):
    return os.path.join(data_dir(), name)


def save_json(name, obj):
    with open(data_path(name), "w") as f:
        json.dump(obj, f, indent=2, default=str)
    return data_path(name)


def load_json(name, default=None):
    p = data_path(name)
    if not os.path.exists(p):
        return default
    with open(p) as f:
        return json.load(f)


def load_config():
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    user = load_json("config.json", {}) or {}
    for k, v in user.items():
        if k == "costs" and isinstance(v, dict):
            cfg["costs"].update(v)
        elif not k.startswith("_"):
            cfg[k] = v
    return cfg


def hm(s):
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def mod(b):
    """Minute of day (IST) of a bar's start."""
    return b["m"] if "m" in b else b["t"].hour * 60 + b["t"].minute


def now_ist():
    return datetime.now(IST)


def round_tick(x, tick=0.05):
    return round(round(x / tick) * tick, 2)


# ---------- market data (Yahoo Finance chart endpoint: unofficial, may be delayed) ----------
def yahoo_symbol(s):
    s = s.strip().upper()
    if s.startswith("^") or s.endswith(".NS") or s.endswith(".BO"):
        return s
    return s + ".NS"


def _http_json(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # network, 429, bad JSON
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError("fetch failed for %s: %s" % (url, last))


def fetch_chart(symbol, interval="5m", rng="60d", cache_minutes=5):
    """Returns (bars, meta). bars: dicts with t (IST datetime), o, h, l, c, v. Cached on disk."""
    ysym = yahoo_symbol(symbol)
    cdir = os.path.join(data_dir(), "cache")
    os.makedirs(cdir, exist_ok=True)
    cpath = os.path.join(cdir, re.sub(r"[^A-Za-z0-9._-]", "_", "%s_%s_%s.json" % (ysym, interval, rng)))
    raw = None
    if os.path.exists(cpath) and (time.time() - os.path.getmtime(cpath)) < cache_minutes * 60:
        with open(cpath) as f:
            raw = json.load(f)
    if raw is None:
        url = ("https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=%s&range=%s"
               "&includePrePost=false" % (urllib.parse.quote(ysym), interval, rng))
        raw = _http_json(url)
        with open(cpath, "w") as f:
            json.dump(raw, f)
    res = (raw.get("chart", {}).get("result") or [None])[0]
    if not res:
        raise RuntimeError("no data for %s: %s" % (ysym, raw.get("chart", {}).get("error")))
    q = res["indicators"]["quote"][0]
    bars = []
    for i, ts in enumerate(res.get("timestamp") or []):
        o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        if None in (o, h, l, c):
            continue
        bars.append({"t": datetime.fromtimestamp(ts, IST), "o": o, "h": h, "l": l, "c": c,
                     "v": q["volume"][i] or 0})
    bars.sort(key=lambda b: b["t"])
    return bars, res.get("meta", {})


def fetch_bars(symbol, interval="5m", rng="60d", cache_minutes=5):
    return fetch_chart(symbol, interval, rng, cache_minutes)[0]


def by_session(bars):
    d = {}
    for b in bars:
        d.setdefault(b["t"].date(), []).append(b)
    for k in d:
        d[k].sort(key=lambda x: x["t"])
    return d


def complete_sessions(bars, min_bars=70):
    """Full past sessions only (drops today's partial session and short days)."""
    return {day: s for day, s in sorted(by_session(bars).items()) if len(s) >= min_bars}


# ---------- indicators ----------
def sma(vals, n):
    return sum(vals[-n:]) / n if len(vals) >= n else None


def rsi(closes, n=14):
    if len(closes) <= n:
        return None
    gains = losses = 0.0
    for i in range(1, n + 1):
        d = closes[i] - closes[i - 1]
        gains += max(d, 0)
        losses += max(-d, 0)
    ag, al = gains / n, losses / n
    for i in range(n + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        ag = (ag * (n - 1) + max(d, 0)) / n
        al = (al * (n - 1) + max(-d, 0)) / n
    if al == 0:
        return 100.0
    return 100 - 100 / (1 + ag / al)


# ---------- charges ----------
def trade_costs(buy_value, sell_value, product, cfg):
    c = cfg["costs"]
    if product == "MIS":
        brok = min(c["brokerage_flat"], c["brokerage_pct"] * buy_value) + \
               min(c["brokerage_flat"], c["brokerage_pct"] * sell_value)
        stt = c["stt_intraday_sell"] * sell_value
        stamp = c["stamp_intraday_buy"] * buy_value
    else:  # CNC delivery
        brok = 2 * c["brokerage_delivery_per_order"]
        stt = c["stt_delivery"] * (buy_value + sell_value)
        stamp = c["stamp_delivery_buy"] * buy_value
    exch = c["exchange_txn"] * (buy_value + sell_value)
    sebi = c["sebi"] * (buy_value + sell_value)
    gst = c["gst"] * (brok + exch + sebi)
    return brok + stt + stamp + exch + sebi + gst


def net_pnl(side, entry, exit_, qty, cfg, product=None):
    """INR P&L after slippage and all charges. Returns (net, costs)."""
    product = product or cfg["product"]
    s = cfg["slippage_pct"] / 100.0
    if side == "long":
        e, x = entry * (1 + s), exit_ * (1 - s)
        gross = (x - e) * qty
        costs = trade_costs(e * qty, x * qty, product, cfg)
    else:
        e, x = entry * (1 - s), exit_ * (1 + s)
        gross = (e - x) * qty
        costs = trade_costs(x * qty, e * qty, product, cfg)
    return gross - costs, costs


# ---------- the opening-range-breakout rule ----------
def orb_signal(sess, side="long", cfg=None, as_of=None):
    """Opening-range breakout on 5-minute bars.

    Trigger = first 5-minute CLOSE beyond the opening range (default: first 15 minutes), on a bar
    that starts before entry_latest. Entry is at that close.
    status: forming | waiting | triggered | expired | skipped
    """
    cfg = cfg or load_config()
    or_end = OPEN_M + cfg["or_minutes"]
    latest = hm(cfg["entry_latest"])
    n_or = cfg["or_minutes"] // BAR_MIN
    delta = timedelta(minutes=BAR_MIN)
    closed = lambda b: as_of is None or b["t"] + delta <= as_of
    rb = [b for b in sess if OPEN_M <= mod(b) < or_end and closed(b)]
    res = {"setup": "orb", "side": side, "status": "forming"}
    if len(rb) < n_or:
        return res
    hi, lo = round(max(b["h"] for b in rb), 2), round(min(b["l"] for b in rb), 2)
    rng_pct = (hi - lo) / lo * 100
    res.update(or_high=hi, or_low=lo, or_range_pct=round(rng_pct, 3), status="waiting")
    if rng_pct < cfg["orb_min_range_pct"] or rng_pct > cfg["orb_max_range_pct"]:
        res.update(status="skipped", reason="opening range %.2f%% is outside %.2f-%.2f%%" % (
            rng_pct, cfg["orb_min_range_pct"], cfg["orb_max_range_pct"]))
        return res
    for i, b in enumerate(sess):
        if mod(b) < or_end:
            continue
        if not closed(b):
            break
        if mod(b) >= latest:
            res["status"] = "expired"
            return res
        if (side == "long" and b["c"] > hi) or (side == "short" and b["c"] < lo):
            res.update(status="triggered", entry=round(b["c"], 2), idx=i,
                       entry_time=(b["t"] + delta).isoformat())
            return res
    return res


def make_plan(sig, stop_rule="or-mid", target_r=1.0, cfg=None):
    """Stop and target from a triggered signal. stop_rule: or-mid | or-opposite | pct:<x>."""
    cfg = cfg or load_config()
    side, hi, lo = sig["side"], round(sig["or_high"], 2), round(sig["or_low"], 2)
    entry = round_tick(sig["entry"])
    if stop_rule == "or-mid":
        stop = (hi + lo) / 2
    elif stop_rule == "or-opposite":
        stop = lo if side == "long" else hi
    elif stop_rule.startswith("pct:"):
        p = float(stop_rule.split(":", 1)[1]) / 100.0
        stop = entry * (1 - p) if side == "long" else entry * (1 + p)
    else:
        raise ValueError("unknown stop rule: %s" % stop_rule)
    stop = round_tick(stop)
    risk = (entry - stop) if side == "long" else (stop - entry)
    if risk < 0.05:
        raise ValueError("stop is not on the loss side of entry (risk %.2f)" % risk)
    target = round_tick(entry + target_r * risk) if side == "long" else round_tick(entry - target_r * risk)
    return {"side": side, "entry": entry, "stop": stop, "target": target,
            "risk_per_share": round(risk, 2), "reward_per_share": round(abs(target - entry), 2),
            "stop_rule": stop_rule, "target_r": target_r, "or_high": hi, "or_low": lo,
            "flat_by": cfg["flat_by"]}


def step_bar(side, stop, target, o, h, l):
    """One bar of trade management. Stop is checked before target (conservative if both hit)."""
    if side == "long":
        if o <= stop:
            return ("stop", o)
        if l <= stop:
            return ("stop", stop)
        if o >= target:
            return ("target", o)
        if h >= target:
            return ("target", target)
    else:
        if o >= stop:
            return ("stop", o)
        if h >= stop:
            return ("stop", stop)
        if o <= target:
            return ("target", o)
        if l <= target:
            return ("target", target)
    return None


def replay_trade(sess, start_idx, side, entry, stop, target, flat_by_m):
    """Walk real bars after entry. Returns (outcome, exit_price)."""
    last = entry
    for b in sess[start_idx + 1:]:
        if mod(b) >= flat_by_m:
            break
        r = step_bar(side, stop, target, b["o"], b["h"], b["l"])
        if r:
            return r
        last = b["c"]
    return ("flat", last)


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    a = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - a) / d, (c + a) / d)


def freshness_warning(bars, max_lag_min=20):
    """Warn if the newest bar is stale while the market should be open."""
    if not bars:
        return "no bars returned"
    now = now_ist()
    if now.weekday() >= 5 or not (OPEN_M + 5 <= now.hour * 60 + now.minute <= CLOSE_M + 10):
        return None
    lag = (now - bars[-1]["t"]).total_seconds() / 60 - BAR_MIN
    if lag > max_lag_min:
        return ("data looks ~%d min behind. Yahoo's NSE feed can be delayed; confirm live prices "
                "with your broker before acting" % lag)
    return None


def out(obj):
    print(json.dumps(obj, indent=2, default=str))
