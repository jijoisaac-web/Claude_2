#!/usr/bin/env python3
"""Replay a trade plan two ways before risking money:
 1) Historical: apply the same opening-range rule to every past session in the data (~60 days of 5m bars).
 2) Simulation: bootstrap the rest of the day from real bars at the same time-of-day, thousands of times.
All results are NET of slippage and Indian charges.
Usage: timemachine.py run [--qty N] [--paths 10000] [--seed 19] [--symbol X --side long --stop or-mid --target 1]"""
import argparse, os, random, statistics, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m


def historical(sessions, side, stop_rule, target_r, qty, cfg):
    flat_m = m.hm(cfg["flat_by"])
    rows = []
    for day, sess in sessions.items():
        sig = m.orb_signal(sess, side, cfg)
        if sig["status"] != "triggered":
            continue
        try:
            plan = m.make_plan(sig, stop_rule, target_r, cfg)
        except ValueError:
            continue
        outcome, px = m.replay_trade(sess, sig["idx"], side, plan["entry"], plan["stop"], plan["target"], flat_m)
        pnl, costs = m.net_pnl(side, plan["entry"], px, qty, cfg)
        rows.append({"day": str(day), "outcome": outcome, "net_pnl": pnl, "costs": costs})
    return rows


def build_slots(sessions):
    """For each 5-minute slot, a pool of (high/open, low/open, close/open) ratios from real bars."""
    slots = {}
    for sess in sessions.values():
        for b in sess:
            if b["o"] > 0:
                slots.setdefault(m.mod(b), []).append((b["h"] / b["o"], b["l"] / b["o"], b["c"] / b["o"]))
    return slots


def simulate(slots, side, entry, stop, target, entry_m, flat_m, qty, cfg, paths, seed):
    rng = random.Random(seed)
    ms = [t for t in range(entry_m - entry_m % m.BAR_MIN, flat_m, m.BAR_MIN) if t >= entry_m and t in slots]
    counts = {"target": 0, "stop": 0, "flat": 0}
    pnls = []
    for _ in range(paths):
        px, outcome, exit_px = entry, "flat", None
        for t in ms:
            hr, lr, cr = rng.choice(slots[t])
            o = px
            r = m.step_bar(side, stop, target, o, o * hr, o * lr)
            if r:
                outcome, exit_px = r
                break
            px = o * cr
        if exit_px is None:
            exit_px = px
        counts[outcome] += 1
        pnls.append(m.net_pnl(side, entry, exit_px, qty, cfg)[0])
    pnls.sort()
    n = float(paths)
    return {"paths": paths, "p_target": round(counts["target"] / n, 3), "p_stop": round(counts["stop"] / n, 3),
            "p_flat": round(counts["flat"] / n, 3), "mean_net_pnl": round(sum(pnls) / n, 2),
            "median_net_pnl": round(pnls[paths // 2], 2), "p5_net_pnl": round(pnls[int(paths * 0.05)], 2),
            "p_profit": round(sum(1 for x in pnls if x > 0) / n, 3)}


def verdict(sim, hist):
    s_pos = sim["mean_net_pnl"] > 0
    if not hist["triggered_days"]:
        return "NO HISTORY: the rule never triggered in the data window; nothing to judge."
    h_pos = hist["mean_net_pnl"] > 0
    if not s_pos and not h_pos:
        return "NEGATIVE after costs in both tests. Skip this setup as configured."
    if s_pos != h_pos:
        return "MIXED: the two tests disagree. Treat as a coin flip; do not size up."
    if hist["triggered_days"] < 30:
        return ("POSITIVE but thin: only %d historical triggers. Paper trade first; this is not evidence "
                "of an edge." % hist["triggered_days"])
    return "WEAKLY POSITIVE after costs. Edge is uncertain (see hit-rate range); stay small and keep paper-testing."


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("run")
    p.add_argument("--symbol"); p.add_argument("--side", choices=["long", "short"])
    p.add_argument("--stop"); p.add_argument("--target", type=float); p.add_argument("--qty", type=int)
    p.add_argument("--entry", type=float); p.add_argument("--stop-price", type=float)
    p.add_argument("--target-price", type=float); p.add_argument("--entry-time", help="HH:MM IST")
    p.add_argument("--paths", type=int, default=10000); p.add_argument("--seed", type=int, default=19)
    a = ap.parse_args()
    cfg = m.load_config()
    plan = m.load_json("plan.json", {}) or {}
    orders = m.load_json("orders.json", {}) or {}
    sym = a.symbol or plan.get("symbol")
    side = a.side or plan.get("side", "long")
    stop_rule = a.stop or plan.get("stop_rule", "or-mid")
    target_r = a.target or plan.get("target_r", 1.0)
    qty = a.qty or orders.get("qty") or 10
    if not sym:
        raise SystemExit("need --symbol or a plan.json")
    sessions = m.complete_sessions(m.fetch_bars(sym, "5m", "60d", cache_minutes=60))
    if len(sessions) < 10:
        raise SystemExit("only %d complete sessions of data; need at least 10" % len(sessions))

    rows = historical(sessions, side, stop_rule, target_r, qty, cfg)
    k = sum(1 for r in rows if r["outcome"] == "target")
    lo, hi = m.wilson(k, len(rows))
    hist = {"sessions_tested": len(sessions), "triggered_days": len(rows), "targets": k,
            "stops": sum(1 for r in rows if r["outcome"] == "stop"),
            "flat_exits": sum(1 for r in rows if r["outcome"] == "flat"),
            "target_rate_95pct_range": [round(lo, 2), round(hi, 2)],
            "mean_net_pnl": round(statistics.mean([r["net_pnl"] for r in rows]), 2) if rows else 0.0,
            "total_net_pnl": round(sum(r["net_pnl"] for r in rows), 2),
            "avg_costs_per_trade": round(statistics.mean([r["costs"] for r in rows]), 2) if rows else 0.0}

    # Simulation uses today's plan levels if present, else explicit prices.
    entry = a.entry or plan.get("entry"); stop = a.stop_price or plan.get("stop"); tgt = a.target_price or plan.get("target")
    et = a.entry_time or (plan.get("entry_time") or "")[11:16]
    sim = None
    if entry and stop and tgt and et:
        sim = simulate(build_slots(sessions), side, entry, stop, tgt, m.hm(et), m.hm(cfg["flat_by"]),
                       qty, cfg, a.paths, a.seed)
    result = {"symbol": sym, "side": side, "qty": qty, "rule": {"stop": stop_rule, "target_r": target_r},
              "historical_replay": hist, "simulation": sim,
              "verdict": verdict(sim or {"mean_net_pnl": hist["mean_net_pnl"]}, hist),
              "limits": ["Past 60 days only; one market regime.",
                         "Bootstrapped bars ignore trends/news and day-to-day dependence.",
                         "Fills assumed at bar prices plus flat slippage; real fills in fast markets are worse.",
                         "Stop checked before target when both fall in one 5-minute bar."]}
    m.save_json("timemachine.json", result)
    m.out(result)


if __name__ == "__main__":
    main()
