#!/usr/bin/env python3
"""Pre-trade gate. Verdict is BLOCK if any hard check fails. Usage: check.py [--now YYYY-MM-DDTHH:MM]"""
import argparse, os, sys
from datetime import datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m


def run(cfg, orders, plan, journal, news, now):
    checks = []
    add = lambda name, level, detail: checks.append({"check": name, "level": level, "detail": detail})
    today = str(now.date())
    if not orders or not orders.get("qty"):
        add("order", "BLOCK", "no sized order (orders.json missing or qty=0)")
        return checks
    loss = orders["net_loss_if_stopped"]
    add("max loss per trade", "PASS" if loss <= cfg["max_loss_per_trade"] else "BLOCK",
        "Rs %.0f if stopped vs limit Rs %.0f" % (loss, cfg["max_loss_per_trade"]))
    day_pnl = sum(j["net_pnl"] for j in journal if j.get("date") == today)
    n_today = sum(1 for j in journal if j.get("date") == today)
    add("daily loss limit", "PASS" if day_pnl - loss >= -cfg["daily_loss_limit"] else "BLOCK",
        "today Rs %.0f; worst case after this trade Rs %.0f; limit -Rs %.0f" % (day_pnl, day_pnl - loss, cfg["daily_loss_limit"]))
    add("trades today", "PASS" if n_today < cfg["max_trades_per_day"] else "BLOCK",
        "%d done, max %d" % (n_today, cfg["max_trades_per_day"]))
    nrr = orders.get("net_reward_risk")
    add("net reward:risk", "PASS" if nrr and nrr >= cfg["min_net_rr"] else "BLOCK",
        "%s after costs vs minimum %.2f" % (nrr, cfg["min_net_rr"]))
    lev = cfg["intraday_leverage"] if cfg["product"] == "MIS" else 1
    pos_ok = orders["position_value"] <= cfg["capital"] * cfg["max_position_pct"] / 100.0 * lev + 1
    add("position size", "PASS" if pos_ok else "BLOCK",
        "Rs %.0f vs cap Rs %.0f" % (orders["position_value"], cfg["capital"] * cfg["max_position_pct"] / 100.0 * lev))
    add("cash", "PASS" if orders["position_value"] / lev <= cfg["capital"] else "BLOCK",
        "needs ~Rs %.0f of Rs %.0f" % (orders["position_value"] / lev, cfg["capital"]))
    cost = orders["round_trip_costs_at_target"]
    add("cost drag", "PASS" if cost <= 0.15 * cfg["max_loss_per_trade"] else "WARN",
        "charges Rs %.0f = %.0f%% of your max loss" % (cost, 100 * cost / cfg["max_loss_per_trade"]))
    mins = now.hour * 60 + now.minute
    in_window = m.hm(cfg["entry_earliest"]) <= mins <= m.hm(cfg["entry_latest"])
    ok_day = now.weekday() < 5 and today not in cfg["holidays"]
    add("trading day", "PASS" if ok_day else "BLOCK", "weekday and not in your holiday list" if ok_day else "weekend/holiday")
    add("entry window", "PASS" if in_window else "BLOCK",
        "%s IST; allowed %s-%s" % (now.strftime("%H:%M"), cfg["entry_earliest"], cfg["entry_latest"]))
    if plan and plan.get("date") and plan["date"] != today:
        add("plan freshness", "BLOCK", "plan is from %s, not today" % plan["date"])
    ns = ((news or {}).get("symbols") or {}).get(orders["symbol"], {})
    if ns.get("event_risk"):
        add("event risk", "WARN", "headlines tagged %s: read them before entering" % ", ".join(ns.get("tags", [])))
    return checks


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--now")
    a = ap.parse_args()
    now = datetime.fromisoformat(a.now).replace(tzinfo=m.IST) if a.now else m.now_ist()
    checks = run(m.load_config(), m.load_json("orders.json"), m.load_json("plan.json"),
                 m.load_json("journal.json", []) or [], m.load_json("news.json"), now)
    verdict = "BLOCK" if any(c["level"] == "BLOCK" for c in checks) else "PASS"
    res = {"verdict": verdict, "ts": now.isoformat(), "checks": checks,
           "manual_checks": ["Stock is in normal EQ series (not BE/BZ trade-for-trade: cannot square off intraday).",
                             "Not under ASM/GSM surveillance with restricted margin/leverage.",
                             "Not at or near its circuit limit (you may be unable to exit).",
                             "Confirm the live price and the available margin in your broker app.",
                             "No results/board meeting for this stock today unless you want that risk."]}
    m.save_json("risk.json", res)
    m.out(res)


if __name__ == "__main__":
    main()
