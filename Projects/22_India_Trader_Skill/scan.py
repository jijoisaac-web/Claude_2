#!/usr/bin/env python3
"""Scan an NSE universe. Commands: universe | daily | orb."""
import argparse, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m

# Large, liquid NSE names. This list goes stale: edit trader/universe.txt (one symbol per line).
DEFAULT_UNIVERSE = """RELIANCE TCS HDFCBANK INFY ICICIBANK HINDUNILVR ITC SBIN BHARTIARTL KOTAKBANK LT AXISBANK
ASIANPAINT MARUTI SUNPHARMA TITAN BAJFINANCE ULTRACEMCO NESTLEIND WIPRO HCLTECH ONGC NTPC POWERGRID
TATASTEEL JSWSTEEL COALINDIA TECHM ADANIENT ADANIPORTS BAJAJFINSV INDUSINDBK HINDALCO CIPLA DRREDDY
EICHERMOT GRASIM BRITANNIA HEROMOTOCO APOLLOHOSP DIVISLAB BPCL TATACONSUM SBILIFE HDFCLIFE BAJAJ-AUTO
TRENT ETERNAL JIOFIN BEL HAL""".split()


def load_universe():
    p = m.data_path("universe.txt")
    if os.path.exists(p):
        return [l.strip().upper() for l in open(p) if l.strip() and not l.startswith("#")]
    return DEFAULT_UNIVERSE


def cmd_universe(a):
    if a.nse:
        url = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
        try:
            req = urllib.request.Request(url, headers=m.UA)
            txt = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore").splitlines()
            syms = [r.split(",")[0].strip() for r in txt[1:] if ",EQ," in r]
            open(m.data_path("universe_all.txt"), "w").write("\n".join(syms))
            print("Saved %d EQ symbols to %s. Do NOT scan them all (slow, rate-limited): copy a liquid "
                  "subset into trader/universe.txt." % (len(syms), m.data_path("universe_all.txt")))
        except Exception as e:
            print("NSE download failed (%s). Download EQUITY_L.csv from nseindia.com manually." % e)
        return
    p = m.data_path("universe.txt")
    open(p, "w").write("\n".join(DEFAULT_UNIVERSE) + "\n")
    print("Wrote %d symbols to %s. Edit freely." % (len(DEFAULT_UNIVERSE), p))


def _map(fn, syms, workers=4):
    def safe(s):
        try:
            time.sleep(0.15)
            return fn(s)
        except Exception as e:
            return {"symbol": s, "error": str(e)[:120]}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        return list(ex.map(safe, syms))


def daily_one(sym, cfg):
    bars = m.fetch_bars(sym, "1d", "1y", cache_minutes=60)
    now = m.now_ist()
    partial = False
    # During market hours today's daily candle is incomplete (tiny volume): ignore it.
    if bars and bars[-1]["t"].date() == now.date() and now.weekday() < 5 and \
            now.hour * 60 + now.minute < m.CLOSE_M + 15:
        bars, partial = bars[:-1], True
    if len(bars) < 60:
        return None
    c = [b["c"] for b in bars]; v = [b["v"] for b in bars]
    last = bars[-1]
    turnover_cr = (sum(c[-20:]) / 20) * (sum(v[-20:]) / 20) / 1e7
    if turnover_cr < cfg["min_avg_turnover_cr"]:
        return {"symbol": sym, "illiquid": True}
    hi20 = max(b["h"] for b in bars[-21:-1])
    vr = last["v"] / (sum(v[-21:-1]) / 20) if sum(v[-21:-1]) else 0
    s50, s200, r = m.sma(c, 50), m.sma(c, 200), m.rsi(c)
    tags, score = [], 0
    if last["c"] > hi20 and vr >= 1.5 and s50 and last["c"] > s50:
        tags.append("breakout20+volume"); score += 2 + min(vr, 4) / 4
    if r is not None and r < 30 and s200 and last["c"] > s200:
        tags.append("oversold-in-uptrend"); score += 1.5
    return {"symbol": sym, "date": str(last["t"].date()), "close": round(last["c"], 2),
            "pct_vs_20d_high": round((last["c"] / hi20 - 1) * 100, 2),
            "vol_ratio": round(vr, 2), "rsi14": round(r, 1) if r else None,
            "sma50": round(s50, 2) if s50 else None, "turnover_cr": round(turnover_cr, 1),
            "tags": tags, "score": round(score, 2), "partial_today_ignored": partial}


def cmd_daily(a):
    cfg = m.load_config()
    uni = load_universe()
    res = [r for r in _map(lambda s: daily_one(s, cfg), uni) if r]
    errs = [r for r in res if "error" in r]
    illiquid = [r for r in res if r.get("illiquid")]
    ok = [r for r in res if "error" not in r and not r.get("illiquid")]
    matches = sorted([r for r in ok if r["tags"]], key=lambda r: -r["score"])
    shown = matches[:a.top]
    out = {"mode": "daily", "universe": len(uni), "analysed": len(ok), "illiquid_skipped": len(illiquid),
           "fetch_errors": len(errs), "matches": len(matches), "results": shown}
    if a.all or not matches:
        # Show the closest names so you can see the data is flowing and how near the screen is.
        out["closest_to_20d_high"] = sorted(ok, key=lambda r: -r["pct_vs_20d_high"])[:a.top]
        out["note"] = "No names met the screen." if not matches else None
    if errs:
        out["first_error"] = errs[0]
    m.save_json("scan.json", dict(out, ts=m.now_ist().isoformat()))
    m.out(out)


def orb_one(sym, cfg, as_of):
    bars = m.fetch_bars(sym, "5m", "5d", cache_minutes=1)
    sessions = m.by_session(bars)
    if not sessions:
        return None
    day = max(sessions)
    sess = sessions[day]
    rows = []
    for side in ("long", "short"):
        sig = m.orb_signal(sess, side, cfg, as_of)
        if sig["status"] == "triggered":
            rows.append({"symbol": sym, "side": side, "date": str(day), "entry": sig["entry"],
                         "or_high": sig["or_high"], "or_low": sig["or_low"],
                         "or_range_pct": sig["or_range_pct"], "entry_time": sig["entry_time"]})
    return rows or None


def cmd_orb(a):
    cfg = m.load_config()
    now = m.now_ist()
    if a.at:
        h, mi = a.at.split(":")
        as_of = now.replace(hour=int(h), minute=int(mi), second=0, microsecond=0)
    else:
        as_of = now
    res = _map(lambda s: orb_one(s, cfg, as_of), load_universe())
    flat = [r for rs in res if rs and isinstance(rs, list) for r in rs]
    note = None if now.weekday() < 5 else "weekend: showing the last session in the data"
    m.save_json("scan.json", {"mode": "orb", "ts": now.isoformat(), "as_of": as_of.isoformat(),
                              "results": flat})
    m.out({"mode": "orb", "as_of": as_of.isoformat(), "note": note, "triggered": flat,
           "warning": "Yahoo NSE data may be delayed; verify price with your broker before acting."})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    u = sp.add_parser("universe"); u.add_argument("--nse", action="store_true"); u.set_defaults(f=cmd_universe)
    d = sp.add_parser("daily"); d.add_argument("--top", type=int, default=15)
    d.add_argument("--all", action="store_true", help="also show names closest to a 20-day high"); d.set_defaults(f=cmd_daily)
    o = sp.add_parser("orb"); o.add_argument("--at", help="HH:MM IST, evaluate as of this time"); o.set_defaults(f=cmd_orb)
    a = ap.parse_args(); a.f(a)
