#!/usr/bin/env python3
"""Plain-English order ticket + trade journal.
Usage: ticket.py show | paper-fill --exit-price X [--outcome target|stop|flat] | log --pnl X | journal"""
import argparse, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m


def append_journal(entry):
    j = m.load_json("journal.json", []) or []
    j.append(entry)
    m.save_json("journal.json", j)


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("show")
    p = sp.add_parser("paper-fill"); p.add_argument("--exit-price", type=float, required=True)
    p.add_argument("--outcome", default="flat")
    q = sp.add_parser("log"); q.add_argument("--pnl", type=float, required=True); q.add_argument("--note", default="")
    sp.add_parser("journal")
    a = ap.parse_args()
    cfg = m.load_config()
    o, risk = m.load_json("orders.json"), m.load_json("risk.json")
    if a.cmd == "show":
        if not o or not o.get("qty"):
            raise SystemExit("no sized order. Run trader-budget first.")
        ready = bool(risk and risk["verdict"] == "PASS")
        print("TICKET: %s %d x %s on NSE, product %s" % (o["legs"][0]["transaction"], o["qty"], o["symbol"], o["product"]))
        for leg in o["legs"]:
            print("  %-10s %s %s %s" % (leg["leg"], leg["transaction"], leg["order_type"],
                                       ("trigger %s limit %s" % (leg["trigger"], leg["price"])) if "trigger" in leg
                                       else "@ %s" % leg["price"]))
        print("  worst case (stop fills): -Rs %.0f net | at target: +Rs %.0f net | be flat by %s" %
              (o["net_loss_if_stopped"], o["net_gain_if_target"], o["flat_by"]))
        print("RISK GATE: %s" % (risk["verdict"] if risk else "NOT RUN"))
        for c in (risk or {}).get("checks", []):
            if c["level"] != "PASS":
                print("  %s: %s - %s" % (c["level"], c["check"], c["detail"]))
        if cfg["paper"]:
            print("MODE: PAPER. Do not send to the broker. Use paper-fill when the trade would have closed.")
        elif ready:
            print("MODE: LIVE. Send ONLY after the user types an explicit yes to this exact ticket.")
        else:
            print("STATUS: BLOCKED. Do not send.")
    elif a.cmd == "paper-fill":
        pnl, costs = m.net_pnl(o["side"], o["legs"][0]["price"], a.exit_price, o["qty"], cfg)
        append_journal({"date": str(m.now_ist().date()), "symbol": o["symbol"], "side": o["side"], "qty": o["qty"],
                        "entry": o["legs"][0]["price"], "exit": a.exit_price, "outcome": a.outcome,
                        "net_pnl": round(pnl, 2), "costs": round(costs, 2), "paper": True})
        print("Logged paper trade: net Rs %.2f (charges Rs %.2f)" % (pnl, costs))
    elif a.cmd == "log":
        append_journal({"date": str(m.now_ist().date()), "symbol": (o or {}).get("symbol"), "net_pnl": a.pnl,
                        "paper": False, "note": a.note})
        print("Logged live trade: Rs %.2f" % a.pnl)
    else:
        j = m.load_json("journal.json", []) or []
        wins = [x for x in j if x["net_pnl"] > 0]
        m.out({"trades": len(j), "wins": len(wins), "net_pnl": round(sum(x["net_pnl"] for x in j), 2),
               "paper_trades": sum(1 for x in j if x.get("paper")), "entries": j[-20:]})


if __name__ == "__main__":
    main()
