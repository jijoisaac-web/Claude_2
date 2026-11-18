#!/usr/bin/env python3
"""Turn a triggered entry into a stop/target plan.
Usage: exit.py plan [--stop or-mid|or-opposite|pct:0.5] [--target 1.5]"""
import argparse, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("plan")
    p.add_argument("--stop", default="or-mid"); p.add_argument("--target", type=float, default=1.0,
                                                               help="reward as a multiple of risk (R)")
    a = ap.parse_args()
    sig = m.load_json("entry.json")
    if not sig or sig.get("status") != "triggered":
        raise SystemExit("entry.json is missing or not triggered (status=%s). Run trader-entry first." %
                         (sig or {}).get("status"))
    cfg = m.load_config()
    plan = m.make_plan(sig, a.stop, a.target, cfg)
    plan.update(symbol=sig["symbol"], setup=sig["setup"], date=sig["date"], entry_time=sig["entry_time"])
    m.save_json("plan.json", plan)
    m.out(plan)


if __name__ == "__main__":
    main()
