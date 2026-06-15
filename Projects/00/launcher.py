"""
Project Launcher - GUI to quick-launch project batch files with an
insights panel: market snapshot (Nifty regime + FII/DII), recent output
files across all projects, and run history.
Place this file in the 00 folder alongside project folders 01, 02, ...
"""

import json
import os
import re
import subprocess
import threading
import time
import urllib.request
import http.cookiejar
import webbrowser
import tkinter as tk
from tkinter import ttk, scrolledtext
from pathlib import Path
from datetime import datetime

# ── Config ──────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent
PROJECTS_DIR = BASE_DIR.parent          # project folders are siblings of 00
HISTORY_FILE = BASE_DIR / "run_history.json"

OUTPUT_EXTS  = {".xlsx", ".csv", ".html", ".pdf"}
EXCLUDE_DIRS = {"cache", "data", "__pycache__", ".git", "node_modules", "venv", ".venv"}
MAX_OUTPUTS  = 12
MAX_HISTORY_SHOWN = 8

# Pinned quick-launch scripts  (label, path, accent_color, description)
PINNED_SCRIPTS = [
    (
        "🔍 Stock Screener",
        Path(r"C:\Users\Ansa\Claude\Projects\04\04_run_screener.bat"),
        "#56d4e8",
        "Captures live stock scans from Screener.in\nFilters equities based on fundamental & technical criteria.\nOutput: screened stock list with key metrics.",
    ),
    (
        "📊 Equity Report",
        Path(r"C:\Users\Ansa\Claude\Projects\03\03_run_report.bat"),
        "#4ec994",
        "Generates Indian equity market research report.\nCovers market breadth, sector performance & top movers.\nOutput: formatted research report file.",
    ),
    (
        "🔎 Strategy Scanner",
        Path(r"C:\Users\Ansa\Claude\Projects\02\02_run_scanner.bat"),
        "#f0c060",
        "Runs strategy-based scans on Indian equities.\nMatches stocks against predefined trading strategies.\nOutput: scan results with matching setups.",
    ),
    (
        "📅 Planner",
        Path(r"C:\Users\Ansa\Claude\Projects\02\02_run_planner.bat"),
        "#c07af0",
        "Trade planner built from Strategy Scanner results.\nTakes scans captured by 02_run_scanner and organises\nthem into an actionable trading plan for the session.",
    ),
    (
        "🏦 Institutional Engine",
        Path(r"C:\Users\Ansa\Claude\Projects\05\05_run_strategies.bat"),
        "#f07060",
        "Runs 6 institutional-grade strategies on Nifty 500:\nMean Reversion · Momentum · Factor Model · Pairs Trading\nSector Rotation · PEAD  →  Full Excel report.",
    ),
    (
        "📊 MF Portfolio Tracker",
        Path(r"C:\Users\Ansa\Claude\Projects\07_Mutual_Fund\07_open_portfolio_tracker.bat"),
        "#9d8fff",
        "Opens the mutual fund portfolio tracker in the browser.\nLive NAVs, XIRR, sell-today tax simulator,\nrebalancing plan & SIP goal planner.",
    ),
    (
        "🚀 Equity Momentum",
        Path(r"C:\Users\Ansa\Claude\Projects\08_EquityMomentum\screeners\08_run_screener.bat"),
        "#4ecf7a",
        "Nifty 500 momentum screener (institutional methodology):\nCross-sectional · Trend · Earnings · FII/DII flows · Risk overlays\nOutput: Excel report with Swing & Positional trade plans.",
    ),
    (
        "🎯 Options Backtester",
        Path(r"C:\Users\Ansa\Claude\Projects\09_Play_Options_Equity\09_run_indian_backtester.bat"),
        "#f07060",
        "Indian Stock Market Backtester — NSE · BSE · F&O.\n9 institutional-grade strategies across Swing,\nShort-term, Momentum & Long-term horizons.",
    ),
]

BG_DARK   = "#1e1e2e"
BG_MID    = "#2a2a3e"
BG_CARD   = "#313150"
ACCENT    = "#7c6af7"
ACCENT_HV = "#9d8fff"
TEXT      = "#e0e0f0"
TEXT_DIM  = "#888aaa"
GREEN     = "#4ec994"
RED       = "#f0605a"
YELLOW    = "#f0c060"
CYAN      = "#56d4e8"
FONT_HEAD = ("Segoe UI", 13, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_MONO = ("Consolas", 9)

_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

# Regex patterns to detect output file paths in script output
_PATH_PATTERNS = [
    re.compile(r'(?:output|saved?(?:\s+to)?|writing(?:\s+to)?|file|report|result)[:\s]+([A-Za-z]:[\\\/][^\s\'"]+)', re.IGNORECASE),
    re.compile(r'([A-Za-z]:\\[^\s\'"<>|]+\.(?:csv|xlsx?|txt|json|pdf|html?|log|zip|png|jpg))', re.IGNORECASE),
    re.compile(r'([A-Za-z]:/[^\s\'"<>|]+\.(?:csv|xlsx?|txt|json|pdf|html?|log|zip|png|jpg))', re.IGNORECASE),
]


def extract_output_paths(line: str) -> list:
    found = []
    for pat in _PATH_PATTERNS:
        for m in pat.finditer(line):
            p = m.group(1).strip().rstrip(".,;)")
            if p not in found:
                found.append(p)
    return found


# ── Market snapshot (background fetch, stdlib only) ─────────────────────────

def fetch_market_data() -> dict:
    """Nifty level/regime via Yahoo chart API + FII/DII via NSE. Never raises."""
    out = {"ok": False, "nifty": None, "chg_pct": None, "above_200dma": None,
           "vol21": None, "regime": None, "fii": None, "dii": None,
           "flow_date": None, "error": None}
    try:
        url = ("https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI"
               "?range=1y&interval=1d")
        req = urllib.request.Request(url, headers=_UA)
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
        res = data["chart"]["result"][0]
        closes = [c for c in res["indicators"]["quote"][0]["close"] if c]
        last, prev = closes[-1], closes[-2]
        sma200 = sum(closes[-200:]) / min(200, len(closes))
        rets = [closes[i] / closes[i - 1] - 1 for i in range(len(closes) - 21, len(closes))]
        mean = sum(rets) / len(rets)
        vol21 = (sum((x - mean) ** 2 for x in rets) / len(rets)) ** 0.5 * (252 ** 0.5)
        out.update(nifty=last, chg_pct=(last / prev - 1) * 100,
                   above_200dma=last > sma200, vol21=vol21,
                   regime="RISK-ON" if (last > sma200 and vol21 <= 0.28) else "RISK-OFF",
                   ok=True)
    except Exception as e:
        out["error"] = f"index: {e}"

    try:
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        opener.addheaders = list(_UA.items()) + [("Referer", "https://www.nseindia.com/")]
        opener.open("https://www.nseindia.com", timeout=12).read(0)
        with opener.open("https://www.nseindia.com/api/fiidiiTradeReact", timeout=12) as r:
            rows = json.loads(r.read().decode())
        for row in rows:
            cat = str(row.get("category", "")).upper()
            net = float(row.get("netValue", 0))
            if "FII" in cat or "FPI" in cat:
                out["fii"] = net
            elif "DII" in cat:
                out["dii"] = net
            out["flow_date"] = row.get("date", out["flow_date"])
    except Exception:
        pass
    return out


# ── Recent outputs scan ──────────────────────────────────────────────────────

def scan_recent_outputs() -> list:
    """Newest report files across all project folders. Returns [(Path, mtime)]."""
    hits = []
    try:
        for proj in sorted(PROJECTS_DIR.iterdir()):
            if not proj.is_dir() or proj.name == BASE_DIR.name:
                continue
            for root, dirs, files in os.walk(proj):
                dirs[:] = [d for d in dirs if d.lower() not in EXCLUDE_DIRS]
                for f in files:
                    if Path(f).suffix.lower() in OUTPUT_EXTS and not f.startswith("~$"):
                        p = Path(root) / f
                        try:
                            hits.append((p, p.stat().st_mtime))
                        except OSError:
                            pass
    except Exception:
        pass
    hits.sort(key=lambda t: t[1], reverse=True)
    return hits[:MAX_OUTPUTS]


def age_str(mtime: float) -> str:
    s = time.time() - mtime
    if s < 3600:
        return f"{int(s // 60)}m ago"
    if s < 86400:
        return f"{int(s // 3600)}h ago"
    return f"{int(s // 86400)}d ago"


# ── Run history persistence ──────────────────────────────────────────────────

def load_history() -> list:
    try:
        return json.loads(HISTORY_FILE.read_text())
    except Exception:
        return []


def save_history(hist: list):
    try:
        HISTORY_FILE.write_text(json.dumps(hist[-50:], indent=1))
    except Exception:
        pass


class LauncherApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Project Launcher")
        self.configure(bg=BG_DARK)
        self.geometry("1000x680")
        self.minsize(760, 520)
        self.detected_outputs = []
        self.history = load_history()
        self.market = None   # dict once fetched

        self._build_ui()
        self.refresh()
        threading.Thread(target=self._fetch_market_async, daemon=True).start()

    # ── UI ───────────────────────────────────────────────────────────────────

    def _build_ui(self):
        hdr = tk.Frame(self, bg=BG_DARK)
        hdr.pack(fill="x", padx=16, pady=(14, 4))
        tk.Label(hdr, text="⚡  Project Launcher", font=("Segoe UI", 16, "bold"),
                 bg=BG_DARK, fg=ACCENT).pack(side="left")
        tk.Button(hdr, text="↻  Refresh", command=self.refresh_all,
                  bg=BG_CARD, fg=TEXT, relief="flat", font=FONT_BODY,
                  padx=10, cursor="hand2",
                  activebackground=ACCENT, activeforeground="white").pack(side="right")
        tk.Label(hdr, text="Quick launch · market pulse · recent outputs · run history",
                 font=FONT_BODY, bg=BG_DARK, fg=TEXT_DIM).pack(side="left", padx=16)

        tk.Frame(self, bg=BG_CARD, height=1).pack(fill="x", padx=16, pady=4)
        self._build_pinned_panel()
        tk.Frame(self, bg=BG_CARD, height=1).pack(fill="x", padx=16, pady=4)

        pane = tk.PanedWindow(self, orient="horizontal", bg=BG_DARK,
                              sashwidth=6, sashrelief="flat")
        pane.pack(fill="both", expand=True, padx=16, pady=(0, 8))

        # Left: insights (scrollable)
        left = tk.Frame(pane, bg=BG_DARK)
        pane.add(left, minsize=380, stretch="always")

        canvas = tk.Canvas(left, bg=BG_DARK, highlightthickness=0)
        sb = ttk.Scrollbar(left, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        self.card_frame = tk.Frame(canvas, bg=BG_DARK)
        self.canvas_win = canvas.create_window((0, 0), window=self.card_frame, anchor="nw")
        canvas.bind("<Configure>", lambda e: canvas.itemconfig(self.canvas_win, width=e.width))
        self.card_frame.bind("<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.bind_all("<MouseWheel>",
            lambda e: canvas.yview_scroll(int(-1 * (e.delta / 120)), "units"))

        # Right: log + output files
        right = tk.Frame(pane, bg=BG_DARK)
        pane.add(right, minsize=240)

        tk.Label(right, text="Output Log", font=FONT_HEAD,
                 bg=BG_DARK, fg=TEXT).pack(anchor="w", pady=(0, 4))

        self.log = scrolledtext.ScrolledText(
            right, bg="#0d0d1a", fg=GREEN, font=FONT_MONO,
            relief="flat", state="disabled", wrap="word")
        self.log.tag_config("path", foreground=CYAN, underline=True)
        self.log.pack(fill="both", expand=True)

        tk.Button(right, text="Clear log", command=self._clear_log,
                  bg=BG_CARD, fg=TEXT_DIM, relief="flat",
                  font=("Segoe UI", 8), cursor="hand2",
                  activebackground=BG_MID).pack(anchor="e", pady=(4, 0))

        tk.Frame(right, bg=BG_CARD, height=1).pack(fill="x", pady=(8, 0))
        tk.Label(right, text="Detected Output Files", font=("Segoe UI", 10, "bold"),
                 bg=BG_DARK, fg=CYAN).pack(anchor="w", pady=(4, 2))

        self.output_frame = tk.Frame(right, bg=BG_DARK)
        self.output_frame.pack(fill="x")

        self._no_output_lbl = tk.Label(
            self.output_frame,
            text="None yet — run a script to detect output files.",
            font=("Segoe UI", 8), bg=BG_DARK, fg=TEXT_DIM, wraplength=200, justify="left")
        self._no_output_lbl.pack(anchor="w")

    def _build_pinned_panel(self):
        panel = tk.Frame(self, bg=BG_MID)
        panel.pack(fill="x", padx=16, pady=(0, 4), ipady=8)

        tk.Label(panel, text="Quick Launch", font=("Segoe UI", 9, "bold"),
                 bg=BG_MID, fg=TEXT_DIM).pack(anchor="w", padx=12, pady=(4, 2))

        grid = tk.Frame(panel, bg=BG_MID)
        grid.pack(fill="x", padx=8)

        self._pinned_widgets = []

        for col, (label, bat, color, desc) in enumerate(PINNED_SCRIPTS):
            card = tk.Frame(grid, bg=BG_CARD,
                            highlightbackground=color, highlightthickness=1)
            card.grid(row=0, column=col, padx=5, pady=2, sticky="nsew")
            grid.columnconfigure(col, weight=1)

            tk.Frame(card, bg=color, height=3).pack(fill="x")
            tk.Label(card, text=label, font=("Segoe UI", 10, "bold"),
                     bg=BG_CARD, fg=color).pack(anchor="w", padx=8, pady=(6, 0))
            tk.Label(card, text=desc, font=("Segoe UI", 8),
                     bg=BG_CARD, fg=TEXT, justify="left",
                     wraplength=180).pack(anchor="w", padx=8, pady=(3, 0))
            tk.Frame(card, bg=BG_MID, height=1).pack(fill="x", padx=8, pady=(6, 4))

            path_text = bat.name if bat.exists() else "⚠  not found"
            path_color = TEXT_DIM if bat.exists() else RED
            path_lbl = tk.Label(card, text=path_text, font=("Consolas", 7),
                                bg=BG_CARD, fg=path_color, anchor="w")
            path_lbl.pack(anchor="w", padx=8)

            btn_row = tk.Frame(card, bg=BG_CARD)
            btn_row.pack(fill="x", padx=8, pady=(6, 8))

            dot = tk.Label(btn_row, text="●", font=("Segoe UI", 11),
                           bg=BG_CARD, fg=TEXT_DIM)
            dot.pack(side="left", padx=(0, 4))

            btn = tk.Button(
                btn_row, text="▶  Run",
                font=("Segoe UI", 9, "bold"),
                bg=color, fg="#0d0d1a",
                relief="flat", padx=10, pady=3,
                cursor="hand2" if bat.exists() else "arrow",
                activebackground=color,
                state="normal" if bat.exists() else "disabled",
            )
            btn.configure(command=lambda b=bat, d=dot, bl=btn: self._launch(b, d, bl))
            btn.pack(side="left")

            self._pinned_widgets.append((bat, path_lbl, dot, btn, color))

    # ── Insights panel (left) ────────────────────────────────────────────────

    def refresh_all(self):
        self.refresh()
        threading.Thread(target=self._fetch_market_async, daemon=True).start()

    def refresh(self):
        for w in self.card_frame.winfo_children():
            w.destroy()

        for (bat, path_lbl, dot, btn, color) in self._pinned_widgets:
            if bat.exists():
                path_lbl.configure(text=bat.name, fg=TEXT_DIM)
                btn.configure(state="normal", cursor="hand2")
            else:
                path_lbl.configure(text="⚠ not found", fg=RED)
                btn.configure(state="disabled", cursor="arrow")

        self._build_market_card()
        self._build_html_dashboards_card()
        self._build_outputs_card()
        self._build_history_card()

    def _card(self, title, accent):
        card = tk.Frame(self.card_frame, bg=BG_CARD,
                        highlightbackground=accent, highlightthickness=1)
        card.pack(fill="x", padx=8, pady=5, ipady=4)
        tk.Frame(card, bg=accent, height=2).pack(fill="x")
        tk.Label(card, text=title, font=("Segoe UI", 11, "bold"),
                 bg=BG_CARD, fg=accent).pack(anchor="w", padx=10, pady=(6, 2))
        body = tk.Frame(card, bg=BG_CARD)
        body.pack(fill="x", padx=10, pady=(0, 6))
        return body

    # -- Market snapshot --

    def _fetch_market_async(self):
        self.market = None
        self.after(0, self._build_or_update_market)
        data = fetch_market_data()
        self.market = data
        self.after(0, self._build_or_update_market)

    def _build_or_update_market(self):
        # Rebuild whole insights column is cheap and avoids stale widgets
        if hasattr(self, "card_frame") and self.card_frame.winfo_exists():
            self.refresh_market_only()

    def refresh_market_only(self):
        if getattr(self, "_market_body", None) and self._market_body.winfo_exists():
            for w in self._market_body.winfo_children():
                w.destroy()
            self._fill_market_body(self._market_body)

    def _build_market_card(self):
        self._market_body = self._card("📈  Market Pulse (NSE)", CYAN)
        self._fill_market_body(self._market_body)

    def _fill_market_body(self, body):
        m = self.market
        if m is None:
            tk.Label(body, text="Fetching Nifty & FII/DII data…",
                     font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_DIM).pack(anchor="w")
            return
        if not m["ok"]:
            tk.Label(body, text="Offline — market data unavailable.",
                     font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_DIM).pack(anchor="w")
            return

        row1 = tk.Frame(body, bg=BG_CARD)
        row1.pack(fill="x")
        chg = m["chg_pct"]
        chg_color = GREEN if chg >= 0 else RED
        tk.Label(row1, text=f"NIFTY 50   {m['nifty']:,.0f}",
                 font=("Segoe UI", 13, "bold"), bg=BG_CARD, fg=TEXT).pack(side="left")
        tk.Label(row1, text=f"  {chg:+.2f}%", font=("Segoe UI", 11, "bold"),
                 bg=BG_CARD, fg=chg_color).pack(side="left")

        regime_color = GREEN if m["regime"] == "RISK-ON" else RED
        row2 = tk.Frame(body, bg=BG_CARD)
        row2.pack(fill="x", pady=(4, 0))
        tk.Label(row2, text=f"● {m['regime']}", font=("Segoe UI", 10, "bold"),
                 bg=BG_CARD, fg=regime_color).pack(side="left")
        dma = "above" if m["above_200dma"] else "below"
        tk.Label(row2, text=f"   {dma} 200DMA · 21d vol {m['vol21']*100:.1f}%",
                 font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_DIM).pack(side="left")

        if m["fii"] is not None or m["dii"] is not None:
            row3 = tk.Frame(body, bg=BG_CARD)
            row3.pack(fill="x", pady=(4, 0))
            parts = []
            if m["fii"] is not None:
                parts.append(("FII", m["fii"]))
            if m["dii"] is not None:
                parts.append(("DII", m["dii"]))
            for name, val in parts:
                c = GREEN if val >= 0 else RED
                tk.Label(row3, text=f"{name} {val:+,.0f} cr   ",
                         font=("Segoe UI", 9, "bold"), bg=BG_CARD, fg=c).pack(side="left")
            if m["flow_date"]:
                tk.Label(row3, text=f"({m['flow_date']})", font=("Segoe UI", 8),
                         bg=BG_CARD, fg=TEXT_DIM).pack(side="left")

        hint = ("Momentum entries favoured — normal sizing."
                if m["regime"] == "RISK-ON"
                else "Caution: halve size, faster profit-taking, tighter stops.")
        tk.Label(body, text=hint, font=("Segoe UI", 8, "italic"),
                 bg=BG_CARD, fg=TEXT_DIM, wraplength=340,
                 justify="left").pack(anchor="w", pady=(4, 0))

    # -- HTML Dashboards --

    def _build_html_dashboards_card(self):
        """Scan all project output folders for HTML reports; show as browser links."""
        html_files = []
        try:
            for proj in sorted(PROJECTS_DIR.iterdir()):
                if not proj.is_dir() or proj.name == BASE_DIR.name:
                    continue
                for root, dirs, files in os.walk(proj):
                    dirs[:] = [d for d in dirs if d.lower() not in EXCLUDE_DIRS]
                    for f in files:
                        if f.lower().endswith(".html") and not f.startswith("~$"):
                            p = Path(root) / f
                            try:
                                html_files.append((p, p.stat().st_mtime))
                            except OSError:
                                pass
        except Exception:
            pass

        html_files.sort(key=lambda t: t[1], reverse=True)
        html_files = html_files[:8]

        body = self._card("🌐  HTML Dashboards (open in browser)", "#4ecf7a")

        if not html_files:
            tk.Label(body, text="No HTML reports found yet — run a screener first.",
                     font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_DIM).pack(anchor="w")
            return

        for p, mtime in html_files:
            row = tk.Frame(body, bg=BG_CARD)
            row.pack(fill="x", pady=2)

            try:
                proj_part = p.relative_to(PROJECTS_DIR).parts[0]
            except ValueError:
                proj_part = ""

            # Coloured project badge
            badge = tk.Label(row, text=f" {proj_part} ", font=("Segoe UI", 7, "bold"),
                             bg="#1a3a2a", fg="#4ecf7a", padx=3)
            badge.pack(side="left", padx=(0, 6))

            # Filename — click opens in browser
            name_lbl = tk.Label(row, text=p.name, font=("Segoe UI", 9, "bold"),
                                bg=BG_CARD, fg=CYAN, anchor="w", cursor="hand2",
                                wraplength=240)
            name_lbl.pack(side="left", fill="x", expand=True)
            name_lbl.bind("<Button-1>", lambda e, ps=str(p): self._open_in_browser(ps))

            # Age
            tk.Label(row, text=age_str(mtime), font=("Segoe UI", 8),
                     bg=BG_CARD, fg=YELLOW).pack(side="right", padx=(6, 0))

            # Browser button
            tk.Button(row, text="🌐 Open", font=("Segoe UI", 8),
                      bg="#1a3a2a", fg="#4ecf7a", relief="flat", padx=6,
                      cursor="hand2",
                      command=lambda ps=str(p): self._open_in_browser(ps)).pack(
                          side="right", padx=(4, 0))

            # Folder button
            fold = tk.Label(row, text="📂", font=("Segoe UI", 9), bg=BG_CARD,
                            fg=TEXT_DIM, cursor="hand2")
            fold.pack(side="right", padx=(0, 4))
            fold.bind("<Button-1>", lambda e, ps=str(p): self._open_folder(ps))

    # -- Recent outputs --

    def _build_outputs_card(self):
        body = self._card("🗂  Recent Reports (all projects)", ACCENT)
        hits = scan_recent_outputs()
        if not hits:
            tk.Label(body, text="No report files found in project folders.",
                     font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_DIM).pack(anchor="w")
            return
        for p, mtime in hits:
            row = tk.Frame(body, bg=BG_CARD)
            row.pack(fill="x", pady=1)
            try:
                proj = p.relative_to(PROJECTS_DIR).parts[0]
            except ValueError:
                proj = ""
            is_html = p.suffix.lower() == ".html"
            icon = "🌐" if is_html else "📄"
            fg_color = "#4ecf7a" if is_html else CYAN
            name_lbl = tk.Label(row, text=f"{icon} {p.name}", font=("Segoe UI", 9, "bold"),
                                bg=BG_CARD, fg=fg_color, anchor="w", cursor="hand2")
            name_lbl.pack(side="left")
            if is_html:
                name_lbl.bind("<Button-1>", lambda e, ps=str(p): self._open_in_browser(ps))
            else:
                name_lbl.bind("<Button-1>", lambda e, ps=str(p): self._open_path(ps))
            tk.Label(row, text=f"  {proj}", font=("Segoe UI", 8),
                     bg=BG_CARD, fg=TEXT_DIM).pack(side="left")
            tk.Label(row, text=age_str(mtime), font=("Segoe UI", 8),
                     bg=BG_CARD, fg=YELLOW).pack(side="right")
            fold = tk.Label(row, text="📂", font=("Segoe UI", 9), bg=BG_CARD,
                            fg=TEXT_DIM, cursor="hand2")
            fold.pack(side="right", padx=(0, 6))
            fold.bind("<Button-1>", lambda e, ps=str(p): self._open_folder(ps))
            if is_html:
                tk.Button(row, text="🌐", font=("Segoe UI", 9),
                          bg=BG_CARD, fg="#4ecf7a", relief="flat", cursor="hand2",
                          command=lambda ps=str(p): self._open_in_browser(ps)).pack(
                              side="right", padx=(0, 2))

    # -- Run history --

    def _build_history_card(self):
        body = self._card("🕘  Run History", YELLOW)
        if not self.history:
            tk.Label(body, text="No runs recorded yet.",
                     font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_DIM).pack(anchor="w")
            return
        for rec in reversed(self.history[-MAX_HISTORY_SHOWN:]):
            row = tk.Frame(body, bg=BG_CARD)
            row.pack(fill="x", pady=1)
            ok = rec.get("exit", 1) == 0
            tk.Label(row, text="✓" if ok else "✗", font=("Segoe UI", 9, "bold"),
                     bg=BG_CARD, fg=GREEN if ok else RED).pack(side="left")
            tk.Label(row, text=f" {rec.get('script', '?')}", font=("Segoe UI", 9),
                     bg=BG_CARD, fg=TEXT, anchor="w").pack(side="left")
            secs = rec.get("secs")
            dur = f" · {secs:.0f}s" if isinstance(secs, (int, float)) else ""
            tk.Label(row, text=f"{rec.get('time', '')}{dur}", font=("Segoe UI", 8),
                     bg=BG_CARD, fg=TEXT_DIM).pack(side="right")

    def _record_run(self, bat: Path, rc: int, secs: float):
        self.history.append({"script": bat.name,
                             "time": datetime.now().strftime("%d-%b %H:%M"),
                             "exit": rc, "secs": round(secs, 1)})
        save_history(self.history)
        self.after(0, self.refresh)

    # ── Output file tracking ─────────────────────────────────────────────────

    def _add_output_file(self, path_str: str):
        if path_str in self.detected_outputs:
            return
        self.detected_outputs.append(path_str)

        if self._no_output_lbl and self._no_output_lbl.winfo_exists():
            self._no_output_lbl.destroy()
            self._no_output_lbl = None

        row = tk.Frame(self.output_frame, bg=BG_DARK)
        row.pack(fill="x", pady=1)

        p = Path(path_str)
        is_html = p.suffix.lower() == ".html"
        icon = "🌐" if is_html else "📄"
        fg_color = "#4ecf7a" if is_html else CYAN

        tk.Label(row, text=icon, bg=BG_DARK, fg=fg_color,
                 font=("Segoe UI", 9)).pack(side="left")

        name_lbl = tk.Label(row, text=p.name, font=("Segoe UI", 9, "bold"),
                            bg=BG_DARK, fg=fg_color, anchor="w", cursor="hand2")
        name_lbl.pack(side="left", padx=(2, 4))
        if is_html:
            name_lbl.bind("<Button-1>", lambda e, ps=path_str: self._open_in_browser(ps))
        else:
            name_lbl.bind("<Button-1>", lambda e, ps=path_str: self._open_path(ps))

        tk.Label(row, text=str(p.parent), font=("Segoe UI", 7),
                 bg=BG_DARK, fg=TEXT_DIM, anchor="w").pack(side="left")

        tk.Button(row, text="📂", font=("Segoe UI", 9),
                  bg=BG_CARD, fg=TEXT_DIM, relief="flat", cursor="hand2",
                  command=lambda ps=path_str: self._open_folder(ps)).pack(side="right")
        if is_html:
            tk.Button(row, text="🌐 Browser", font=("Segoe UI", 8),
                      bg="#1a3a2a", fg="#4ecf7a", relief="flat", padx=6, cursor="hand2",
                      command=lambda ps=path_str: self._open_in_browser(ps)).pack(
                          side="right", padx=(4, 0))
        else:
            tk.Button(row, text="Open", font=("Segoe UI", 8),
                      bg=BG_CARD, fg=TEXT, relief="flat", padx=6, cursor="hand2",
                      command=lambda ps=path_str: self._open_path(ps)).pack(
                          side="right", padx=(4, 0))

    def _open_path(self, path_str: str):
        try:
            os.startfile(path_str)
        except Exception as e:
            self._log(f"[{_ts()}] Cannot open {path_str}: {e}\n")

    def _open_in_browser(self, path_str: str):
        try:
            webbrowser.open(Path(path_str).as_uri())
            self._log(f"[{_ts()}] 🌐 Opened in browser: {Path(path_str).name}\n")
        except Exception as e:
            self._log(f"[{_ts()}] Cannot open in browser {path_str}: {e}\n")

    def _open_folder(self, path_str: str):
        try:
            subprocess.Popen(f'explorer /select,"{path_str}"')
        except Exception as e:
            self._log(f"[{_ts()}] Cannot open folder: {e}\n")

    # ── Generic launch ───────────────────────────────────────────────────────

    def _launch(self, bat: Path, dot: tk.Label, btn: tk.Button):
        orig_bg  = btn.cget("bg")
        orig_fg  = btn.cget("fg")
        orig_txt = btn.cget("text")
        btn.configure(state="disabled", text="⏳ Running", bg=YELLOW, fg="#1e1e2e")
        dot.configure(fg=YELLOW)
        self._log(f"[{_ts()}] Launching: {bat.name}\n")

        def run():
            t0 = time.time()
            try:
                proc = subprocess.Popen(
                    str(bat), cwd=str(bat.parent),
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, creationflags=subprocess.CREATE_NO_WINDOW)
                for line in proc.stdout:
                    self._log_line(line, highlight_paths=True)
                    for p in extract_output_paths(line):
                        self.after(0, lambda path=p: self._add_output_file(path))
                proc.wait()
                rc = proc.returncode
                dot_color = GREEN if rc == 0 else RED
                self.after(0, lambda: dot.configure(fg=dot_color))
                symbol = "✓" if rc == 0 else "✗"
                self._log(f"[{_ts()}] {symbol} Exit {rc}: {bat.name}\n")
                self._record_run(bat, rc, time.time() - t0)
            except Exception as e:
                self._log(f"[{_ts()}] ERROR: {e}\n")
                self.after(0, lambda: dot.configure(fg=RED))
                self._record_run(bat, -1, time.time() - t0)
            finally:
                self.after(0, lambda: btn.configure(
                    state="normal", text=orig_txt, bg=orig_bg, fg=orig_fg))

        threading.Thread(target=run, daemon=True).start()

    # ── Log helpers ──────────────────────────────────────────────────────────

    def _log(self, msg: str):
        def _w():
            self.log.configure(state="normal")
            self.log.insert("end", msg)
            self.log.see("end")
            self.log.configure(state="disabled")
        self.after(0, _w)

    def _log_line(self, line: str, highlight_paths=False):
        def _w():
            self.log.configure(state="normal")
            if highlight_paths:
                paths = extract_output_paths(line)
                if paths:
                    remaining = line
                    for p in paths:
                        idx = remaining.find(p)
                        if idx >= 0:
                            self.log.insert("end", remaining[:idx])
                            self.log.insert("end", p, "path")
                            remaining = remaining[idx + len(p):]
                    self.log.insert("end", remaining)
                else:
                    self.log.insert("end", line)
            else:
                self.log.insert("end", line)
            self.log.see("end")
            self.log.configure(state="disabled")
        self.after(0, _w)

    def _clear_log(self):
        self.log.configure(state="normal")
        self.log.delete("1.0", "end")
        self.log.configure(state="disabled")


def _ts():
    return datetime.now().strftime("%H:%M:%S")


if __name__ == "__main__":
    app = LauncherApp()
    app.mainloop()
