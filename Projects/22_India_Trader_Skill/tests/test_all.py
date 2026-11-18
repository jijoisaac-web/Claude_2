import importlib.util, os, random, sys, tempfile, unittest
from datetime import datetime, timedelta
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.join(ROOT, "_lib"))
os.environ["TRADER_DIR"] = tempfile.mkdtemp()
import inmkt as m


def load(path):
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], os.path.join(ROOT, path))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


def session(day, closes_after_or=None, seed=1, base=100.0):
    """75 five-minute bars. First 3 bars: range 100-101. Optionally force later closes."""
    rng = random.Random(seed)
    bars, px = [], base
    t0 = datetime(day.year, day.month, day.day, 9, 15, tzinfo=m.IST)
    for i in range(75):
        t = t0 + timedelta(minutes=5 * i)
        if i < 3:
            o, h, l, c = 100.4, 101.0, 100.0, 100.6
        elif closes_after_or and i - 3 < len(closes_after_or):
            c = closes_after_or[i - 3]; o = px; h = max(o, c) + 0.1; l = min(o, c) - 0.1
        else:
            o = px; c = o * (1 + rng.uniform(-0.0015, 0.0015)); h = max(o, c) * 1.0005; l = min(o, c) * 0.9995
        bars.append({"t": t, "o": o, "h": h, "l": l, "c": c, "v": 1000})
        px = c
    return bars


class Core(unittest.TestCase):
    def test_costs_hand_calc(self):
        cfg = m.load_config()
        # brokerage 20+20, stt .00025*100500=25.125, stamp 3, exch .0000297*200500=5.955, sebi .2005, gst .18*(40+5.955+.2005)
        exp = 40 + 25.125 + 3 + 5.9549 + 0.2005 + 0.18 * (40 + 5.9549 + 0.2005)
        self.assertAlmostEqual(m.trade_costs(100000, 100500, "MIS", cfg), exp, places=1)

    def test_orb_trigger_and_plan(self):
        s = session(datetime(2026, 9, 7).date(), closes_after_or=[101.5, 101.8])
        sig = m.orb_signal(s, "long", m.load_config())
        self.assertEqual(sig["status"], "triggered")
        self.assertEqual(sig["entry"], 101.5)
        self.assertTrue(sig["entry_time"].endswith("+05:30") and "09:35" in sig["entry_time"])
        plan = m.make_plan(sig, "or-mid", 1.0)
        self.assertEqual(plan["stop"], 100.5); self.assertEqual(plan["target"], 102.5)

    def test_orb_not_triggered_before_close_and_skip(self):
        s = session(datetime(2026, 9, 7).date(), closes_after_or=[101.5])
        as_of = s[3]["t"] + timedelta(minutes=2)   # trigger bar not yet closed
        self.assertEqual(m.orb_signal(s, "long", m.load_config(), as_of)["status"], "waiting")
        cfg = m.load_config(); cfg["orb_max_range_pct"] = 0.5
        self.assertEqual(m.orb_signal(s, "long", cfg)["status"], "skipped")

    def test_step_bar_conservative(self):
        self.assertEqual(m.step_bar("long", 99, 101, 100, 101.5, 98.5), ("stop", 99))
        self.assertEqual(m.step_bar("long", 99, 101, 100, 101.5, 99.5), ("target", 101))
        self.assertEqual(m.step_bar("short", 101, 99, 100, 100.5, 98.5), ("target", 99))
        self.assertEqual(m.step_bar("long", 99, 101, 98, 99, 97), ("stop", 98))  # gap through stop

    def test_net_pnl_short_symmetry(self):
        cfg = m.load_config()
        l, _ = m.net_pnl("long", 100, 101, 100, cfg); s, _ = m.net_pnl("short", 100, 99, 100, cfg)
        self.assertTrue(l > 0 and s > 0)


class Pipeline(unittest.TestCase):
    def setUp(self):
        days = [d for d in (datetime(2026, 8, 3).date() + timedelta(days=i) for i in range(45)) if d.weekday() < 5]
        bars = []
        for i, d in enumerate(days):
            bars += session(d, closes_after_or=[101.5 + 0.1 * (i % 3)], seed=i)
        self.bars = bars
        m.fetch_bars = lambda *a, **k: self.bars

    def test_size_and_risk_and_timemachine(self):
        s = session(datetime(2026, 9, 7).date(), closes_after_or=[101.5])
        sig = m.orb_signal(s, "long", m.load_config()); sig.update(symbol="TEST", date="2026-09-07")
        plan = m.make_plan(sig, "or-mid", 1.5); plan.update(symbol="TEST", date="2026-09-07", entry_time=sig["entry_time"])
        m.save_json("plan.json", plan)
        size = load("trader-budget/size.py")
        o = size.build_orders(plan, m.load_config())
        self.assertGreater(o["qty"], 0)
        self.assertLessEqual(o["net_loss_if_stopped"], m.load_config()["max_loss_per_trade"])
        m.save_json("orders.json", o)
        chk = load("trader-risk/check.py")
        cfg = m.load_config()
        good = chk.run(cfg, o, plan, [], None, datetime(2026, 9, 7, 10, 0, tzinfo=m.IST))
        self.assertFalse(any(c["level"] == "BLOCK" for c in good), good)
        late = chk.run(cfg, o, plan, [], None, datetime(2026, 9, 7, 13, 0, tzinfo=m.IST))
        self.assertTrue(any(c["check"] == "entry window" and c["level"] == "BLOCK" for c in late))
        lossy = chk.run(cfg, o, plan, [{"date": "2026-09-07", "net_pnl": -1400}], None, datetime(2026, 9, 7, 10, 0, tzinfo=m.IST))
        self.assertTrue(any(c["check"] == "daily loss limit" and c["level"] == "BLOCK" for c in lossy))
        tm = load("trader-timemachine/timemachine.py")
        sys.argv = ["tm", "run", "--paths", "2000", "--qty", str(o["qty"])]
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            tm.main()
        res = m.load_json("timemachine.json")
        self.assertGreater(res["historical_replay"]["triggered_days"], 20)
        sim = res["simulation"]
        self.assertAlmostEqual(sim["p_target"] + sim["p_stop"] + sim["p_flat"], 1.0, places=2)
        print("\nverdict:", res["verdict"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
