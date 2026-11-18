#!/usr/bin/env python3
"""Position size from plan.json under your loss limits, including Indian charges and slippage.
Usage: size.py [--write]"""
import argparse, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m


def build_orders(plan, cfg):
    side, e, s, t = plan["side"], plan["entry"], plan["stop"], plan["target"]
    risk = plan["risk_per_share"]
    cap_qty = int(cfg["capital"] * cfg["max_position_pct"] / 100.0 * cfg["intraday_leverage"] // e) \
        if cfg["product"] == "MIS" else int(cfg["capital"] * cfg["max_position_pct"] / 100.0 // e)
    qty = min(int(cfg["max_loss_per_trade"] // risk), cap_qty)
    while qty > 0 and -m.net_pnl(side, e, s, qty, cfg)[0] > cfg["max_loss_per_trade"]:
        qty -= 1
    if qty <= 0:
        return {"qty": 0, "reason": "even 1 share breaks your max loss or capital limit"}
    stop_pnl, stop_cost = m.net_pnl(side, e, s, qty, cfg)
    tgt_pnl, tgt_cost = m.net_pnl(side, e, t, qty, cfg)
    buf = cfg["stop_limit_buffer_pct"] / 100.0
    stop_limit = m.round_tick(s * (1 - buf) if side == "long" else s * (1 + buf))
    entry_side, exit_side = ("BUY", "SELL") if side == "long" else ("SELL", "BUY")
    return {
        "symbol": plan["symbol"], "exchange": "NSE", "product": cfg["product"], "side": side, "qty": qty,
        "position_value": round(e * qty, 2),
        "legs": [
            {"leg": "entry", "transaction": entry_side, "order_type": "LIMIT", "price": e},
            {"leg": "stop_loss", "transaction": exit_side, "order_type": "SL", "trigger": s, "price": stop_limit},
            {"leg": "target", "transaction": exit_side, "order_type": "LIMIT", "price": t},
        ],
        "net_loss_if_stopped": round(-stop_pnl, 2), "net_gain_if_target": round(tgt_pnl, 2),
        "round_trip_costs_at_target": round(tgt_cost, 2),
        "net_reward_risk": round(tgt_pnl / -stop_pnl, 2) if stop_pnl < 0 else None,
        "flat_by": plan["flat_by"],
        "notes": ["Many Indian brokers no longer offer bracket orders: place the entry first, then the stop-loss, "
                  "then the target after the entry fills.",
                  "If the stop-limit does not fill in a fast move you can be left unprotected: watch it."],
    }


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    plan = m.load_json("plan.json")
    if not plan:
        raise SystemExit("plan.json missing. Run trader-exit first.")
    o = build_orders(plan, m.load_config())
    if a.write:
        m.save_json("orders.json", o)
    m.out(o)


if __name__ == "__main__":
    main()
