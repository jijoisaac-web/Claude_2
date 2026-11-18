#!/usr/bin/env python3
"""Opening-range-breakout entry check. Usage: entry.py check SYMBOL [--side long|short] [--at HH:MM]"""
import argparse, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m


def check(sym, side, at=None, date=None):
    cfg = m.load_config()
    bars = m.fetch_bars(sym, "5m", "5d", cache_minutes=1)
    sessions = m.by_session(bars)
    if not sessions:
        raise SystemExit("no intraday bars for %s" % sym)
    day = max(sessions) if not date else [d for d in sessions if str(d) == date][0]
    as_of = None
    if at:
        h, mi = at.split(":")
        as_of = bars[-1]["t"].replace(year=day.year, month=day.month, day=day.day, hour=int(h), minute=int(mi))
    elif day == m.now_ist().date():
        as_of = m.now_ist()
    sig = m.orb_signal(sessions[day], side, cfg, as_of)
    sig.update(symbol=sym.upper().replace(".NS", ""), date=str(day), ts=m.now_ist().isoformat())
    warn = m.freshness_warning(bars) if day == m.now_ist().date() else None
    if warn:
        sig["data_warning"] = warn
    sig.pop("idx", None)
    m.save_json("entry.json", sig)
    return sig


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    for name in ("check", "watch"):
        p = sp.add_parser(name); p.add_argument("symbol")
        p.add_argument("--side", default="long", choices=["long", "short"])
        p.add_argument("--at"); p.add_argument("--date")
        if name == "watch":
            p.add_argument("--every", type=int, default=60)
    a = ap.parse_args()
    if a.cmd == "check":
        m.out(check(a.symbol, a.side, a.at, a.date)); return
    while True:  # watch
        sig = check(a.symbol, a.side)
        print(m.now_ist().strftime("%H:%M:%S"), sig["status"], sig.get("entry", ""))
        if sig["status"] in ("triggered", "expired", "skipped"):
            m.out(sig); return
        time.sleep(a.every)


if __name__ == "__main__":
    main()
