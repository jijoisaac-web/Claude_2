"""
Project Launcher — Web Edition
Browser-based replacement for launcher.py (Tkinter).
Serves a dark-themed dashboard that can launch .bat files,
stream live logs, show market pulse, recent outputs, and run history.

Usage:
    python web_launcher.py          # opens http://localhost:5050
"""

import json
import os
import re
import subprocess
import threading
import time
import queue
import urllib.request
import http.cookiejar
import webbrowser
from pathlib import Path
from datetime import datetime

try:
    from flask import Flask, jsonify, request, Response, stream_with_context
except ImportError:
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "-q"])
    from flask import Flask, jsonify, request, Response, stream_with_context

# ── Config ───────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent
PROJECTS_DIR = BASE_DIR.parent
HISTORY_FILE = BASE_DIR / "run_history.json"
PORT         = 5050

OUTPUT_EXTS  = {".xlsx", ".csv", ".html", ".pdf"}
EXCLUDE_DIRS = {"cache", "data", "__pycache__", ".git", "node_modules", "venv", ".venv"}
MAX_OUTPUTS  = 15
MAX_HISTORY  = 50

PINNED_SCRIPTS = [
    {
        "id": "screener",
        "label": "🔍 Stock Screener",
        "bat": r"C:\Users\Ansa\Claude\Projects\04\04_run_screener.bat",
        "color": "#56d4e8",
        "desc": "Captures live stock scans from Screener.in. Filters equities based on fundamental & technical criteria. Output: screened stock list with key metrics.",
    },
    {
        "id": "equity_report",
        "label": "📊 Equity Report",
        "bat": r"C:\Users\Ansa\Claude\Projects\03\03_run_report.bat",
        "color": "#4ec994",
        "desc": "Generates Indian equity market research report. Covers market breadth, sector performance & top movers. Output: formatted research report file.",
    },
    {
        "id": "strategy_scanner",
        "label": "🔎 Strategy Scanner",
        "bat": r"C:\Users\Ansa\Claude\Projects\02\02_run_scanner.bat",
        "color": "#f0c060",
        "desc": "Runs strategy-based scans on Indian equities. Matches stocks against predefined trading strategies. Output: scan results with matching setups.",
    },
    {
        "id": "planner",
        "label": "📅 Planner",
        "bat": r"C:\Users\Ansa\Claude\Projects\02\02_run_planner.bat",
        "color": "#c07af0",
        "desc": "Trade planner built from Strategy Scanner results. Takes scans captured by 02_run_scanner and organises them into an actionable trading plan for the session.",
    },
    {
        "id": "institutional",
        "label": "🏦 Institutional Engine",
        "bat": r"C:\Users\Ansa\Claude\Projects\05\05_run_strategies.bat",
        "color": "#f07060",
        "desc": "Runs 6 institutional-grade strategies on Nifty 500: Mean Reversion · Momentum · Factor Model · Pairs Trading · Sector Rotation · PEAD → Full Excel report.",
    },
    {
        "id": "mf_tracker",
        "label": "📊 MF Portfolio Tracker",
        "bat": r"C:\Users\Ansa\Claude\Projects\07_Mutual_Fund\07_open_portfolio_tracker.bat",
        "color": "#9d8fff",
        "desc": "Opens the mutual fund portfolio tracker in the browser. Live NAVs, XIRR, sell-today tax simulator, rebalancing plan & SIP goal planner.",
    },
    {
        "id": "momentum",
        "label": "🚀 Equity Momentum",
        "bat": r"C:\Users\Ansa\Claude\Projects\08_EquityMomentum\screeners\08_run_screener.bat",
        "color": "#4ecf7a",
        "desc": "Nifty 500 momentum screener (institutional methodology): Cross-sectional · Trend · Earnings · FII/DII flows · Risk overlays. Output: Excel report with Swing & Positional trade plans.",
    },
    {
        "id": "backtester",
        "label": "🎯 Options Backtester",
        "bat": r"C:\Users\Ansa\Claude\Projects\09_Play_Options_Equity\09_run_indian_backtester.bat",
        "color": "#f07060",
        "desc": "Indian Stock Market Backtester — NSE · BSE · F&O. 9 institutional-grade strategies across Swing, Short-term, Momentum & Long-term horizons.",
    },
]

_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
_PATH_PATTERNS = [
    re.compile(r'(?:output|saved?(?:\s+to)?|writing(?:\s+to)?|file|report|result)[:\s]+([A-Za-z]:[\\\/][^\s\'"]+)', re.IGNORECASE),
    re.compile(r'([A-Za-z]:\\[^\s\'"<>|]+\.(?:csv|xlsx?|txt|json|pdf|html?|log|zip|png|jpg))', re.IGNORECASE),
    re.compile(r'([A-Za-z]:/[^\s\'"<>|]+\.(?:csv|xlsx?|txt|json|pdf|html?|log|zip|png|jpg))', re.IGNORECASE),
]


# ── Utilities ─────────────────────────────────────────────────────────────────

def extract_output_paths(line):
    found = []
    for pat in _PATH_PATTERNS:
        for m in pat.finditer(line):
            p = m.group(1).strip().rstrip(".,;)")
            if p not in found:
                found.append(p)
    return found


def age_str(mtime):
    s = time.time() - mtime
    if s < 3600:   return f"{int(s//60)}m ago"
    if s < 86400:  return f"{int(s//3600)}h ago"
    return f"{int(s//86400)}d ago"


def load_history():
    try:
        return json.loads(HISTORY_FILE.read_text())
    except Exception:
        return []


def save_history(hist):
    try:
        HISTORY_FILE.write_text(json.dumps(hist[-MAX_HISTORY:], indent=1))
    except Exception:
        pass


# ── Market data ───────────────────────────────────────────────────────────────

def fetch_market_data():
    out = {"ok": False, "nifty": None, "chg_pct": None, "above_200dma": None,
           "vol21": None, "regime": None, "fii": None, "dii": None,
           "flow_date": None, "error": None}
    try:
        url = "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?range=1y&interval=1d"
        req = urllib.request.Request(url, headers=_UA)
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
        res    = data["chart"]["result"][0]
        closes = [c for c in res["indicators"]["quote"][0]["close"] if c]
        last, prev = closes[-1], closes[-2]
        sma200 = sum(closes[-200:]) / min(200, len(closes))
        rets   = [closes[i]/closes[i-1]-1 for i in range(len(closes)-21, len(closes))]
        mean   = sum(rets)/len(rets)
        vol21  = (sum((x-mean)**2 for x in rets)/len(rets))**0.5 * (252**0.5)
        out.update(nifty=round(last,2), chg_pct=round((last/prev-1)*100,2),
                   above_200dma=last>sma200, vol21=round(vol21,4),
                   regime="RISK-ON" if (last>sma200 and vol21<=0.28) else "RISK-OFF", ok=True)
    except Exception as e:
        out["error"] = str(e)

    try:
        cj     = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        opener.addheaders = list(_UA.items()) + [("Referer","https://www.nseindia.com/")]
        opener.open("https://www.nseindia.com", timeout=12).read(0)
        with opener.open("https://www.nseindia.com/api/fiidiiTradeReact", timeout=12) as r:
            rows = json.loads(r.read().decode())
        for row in rows:
            cat = str(row.get("category","")).upper()
            net = float(row.get("netValue",0))
            if "FII" in cat or "FPI" in cat: out["fii"] = round(net,0)
            elif "DII" in cat:               out["dii"] = round(net,0)
            out["flow_date"] = row.get("date", out["flow_date"])
    except Exception:
        pass
    return out


# ── Recent outputs ────────────────────────────────────────────────────────────

def scan_recent_outputs():
    hits = []
    try:
        for proj in sorted(PROJECTS_DIR.iterdir()):
            if not proj.is_dir() or proj.name == BASE_DIR.name:
                continue
            for root, dirs, files in os.walk(proj):
                dirs[:] = [d for d in dirs if d.lower() not in EXCLUDE_DIRS]
                for f in files:
                    if Path(f).suffix.lower() in OUTPUT_EXTS and not f.startswith("~$"):
                        p = Path(root)/f
                        try:
                            hits.append({"path": str(p), "name": p.name,
                                         "ext": p.suffix.lower(),
                                         "proj": p.relative_to(PROJECTS_DIR).parts[0],
                                         "mtime": p.stat().st_mtime,
                                         "age": age_str(p.stat().st_mtime)})
                        except (OSError, ValueError):
                            pass
    except Exception:
        pass
    hits.sort(key=lambda x: x["mtime"], reverse=True)
    return hits[:MAX_OUTPUTS]


def scan_html_dashboards():
    hits = []
    try:
        for proj in sorted(PROJECTS_DIR.iterdir()):
            if not proj.is_dir() or proj.name == BASE_DIR.name:
                continue
            for root, dirs, files in os.walk(proj):
                dirs[:] = [d for d in dirs if d.lower() not in EXCLUDE_DIRS]
                for f in files:
                    if f.lower().endswith(".html") and not f.startswith("~$"):
                        p = Path(root)/f
                        try:
                            hits.append({"path": str(p), "name": p.name,
                                         "proj": p.relative_to(PROJECTS_DIR).parts[0],
                                         "mtime": p.stat().st_mtime,
                                         "age": age_str(p.stat().st_mtime)})
                        except (OSError, ValueError):
                            pass
    except Exception:
        pass
    hits.sort(key=lambda x: x["mtime"], reverse=True)
    return hits[:8]


# ── Job tracking ──────────────────────────────────────────────────────────────

_jobs     = {}   # job_id -> {"q": Queue, "done": bool, "exit": int|None}
_job_lock = threading.Lock()
_job_seq  = [0]


def new_job():
    with _job_lock:
        _job_seq[0] += 1
        jid = str(_job_seq[0])
        _jobs[jid] = {"q": queue.Queue(), "done": False, "exit": None,
                      "outputs": [], "started": datetime.now().strftime("%H:%M:%S")}
        return jid


# ── Flask app ─────────────────────────────────────────────────────────────────

app = Flask(__name__)


@app.route("/")
def index():
    return HTML_PAGE


@app.route("/api/scripts")
def api_scripts():
    scripts = []
    for s in PINNED_SCRIPTS:
        scripts.append({**s, "exists": Path(s["bat"]).exists()})
    return jsonify(scripts)


@app.route("/api/market")
def api_market():
    data = fetch_market_data()
    return jsonify(data)


@app.route("/api/outputs")
def api_outputs():
    return jsonify({
        "outputs":    scan_recent_outputs(),
        "dashboards": scan_html_dashboards(),
    })


@app.route("/api/history")
def api_history():
    return jsonify(load_history())


@app.route("/api/run", methods=["POST"])
def api_run():
    bat = request.json.get("bat","")
    bat_path = Path(bat)
    if not bat_path.exists():
        return jsonify({"error": f"Script not found: {bat}"}), 404

    jid = new_job()
    job = _jobs[jid]

    def worker():
        t0 = time.time()
        try:
            proc = subprocess.Popen(
                str(bat_path), cwd=str(bat_path.parent),
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, creationflags=subprocess.CREATE_NO_WINDOW)
            for line in proc.stdout:
                job["q"].put({"type":"log","text":line})
                for p in extract_output_paths(line):
                    job["outputs"].append(p)
                    job["q"].put({"type":"output","path":p})
            proc.wait()
            rc = proc.returncode
            job["exit"] = rc
            job["q"].put({"type":"done","exit":rc,"secs":round(time.time()-t0,1)})

            hist = load_history()
            hist.append({"script": bat_path.name,
                         "time": datetime.now().strftime("%d-%b %H:%M"),
                         "exit": rc, "secs": round(time.time()-t0,1)})
            save_history(hist)
        except Exception as e:
            job["q"].put({"type":"error","text":str(e)})
        finally:
            job["done"] = True

    threading.Thread(target=worker, daemon=True).start()
    return jsonify({"job_id": jid})


@app.route("/api/log/<jid>")
def api_log(jid):
    job = _jobs.get(jid)
    if not job:
        return Response("data: {\"type\":\"error\",\"text\":\"Job not found\"}\n\n",
                        content_type="text/event-stream")

    def generate():
        while True:
            try:
                msg = job["q"].get(timeout=30)
                yield f"data: {json.dumps(msg)}\n\n"
                if msg["type"] in ("done","error"):
                    break
            except queue.Empty:
                yield "data: {\"type\":\"ping\"}\n\n"
                if job["done"]:
                    break

    return Response(stream_with_context(generate()),
                    content_type="text/event-stream",
                    headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})


@app.route("/api/open")
def api_open():
    path = request.args.get("path","")
    mode = request.args.get("mode","file")
    try:
        if mode == "folder":
            subprocess.Popen(f'explorer /select,"{path}"')
        elif path.lower().endswith(".html"):
            webbrowser.open(Path(path).as_uri())
        else:
            os.startfile(path)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ── HTML / CSS / JS ───────────────────────────────────────────────────────────

HTML_PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>⚡ Project Launcher</title>
<style>
  :root {
    --bg-dark:  #1e1e2e;
    --bg-mid:   #2a2a3e;
    --bg-card:  #313150;
    --accent:   #7c6af7;
    --accent-hv:#9d8fff;
    --text:     #e0e0f0;
    --text-dim: #888aaa;
    --green:    #4ec994;
    --red:      #f0605a;
    --yellow:   #f0c060;
    --cyan:     #56d4e8;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg-dark);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column}
  a{color:inherit;text-decoration:none}

  /* ── Header ── */
  .header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px 10px;border-bottom:1px solid var(--bg-card)}
  .header-left{display:flex;flex-direction:column;gap:2px}
  .header-title{font-size:1.3rem;font-weight:700;color:var(--accent)}
  .header-sub{font-size:.78rem;color:var(--text-dim)}
  .btn-refresh{background:var(--bg-card);color:var(--text);border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:.85rem;transition:.15s}
  .btn-refresh:hover{background:var(--accent);color:#fff}

  /* ── Quick launch ── */
  .section-title{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);padding:12px 20px 6px}
  .pinned-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;padding:0 20px 14px}
  .pin-card{background:var(--bg-card);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;border:1px solid transparent;transition:border-color .2s}
  .pin-card:hover{border-color:var(--card-color,var(--accent))}
  .pin-bar{height:3px}
  .pin-body{padding:10px 12px;flex:1;display:flex;flex-direction:column;gap:6px}
  .pin-label{font-weight:700;font-size:.9rem}
  .pin-desc{font-size:.72rem;color:var(--text-dim);line-height:1.5;flex:1}
  .pin-footer{display:flex;align-items:center;gap:8px;margin-top:4px}
  .pin-status{width:8px;height:8px;border-radius:50%;background:var(--text-dim);flex-shrink:0;transition:background .3s}
  .pin-status.running{background:var(--yellow);animation:pulse 1s infinite}
  .pin-status.ok{background:var(--green)}
  .pin-status.err{background:var(--red)}
  .btn-run{background:var(--card-color,var(--accent));color:#0d0d1a;border:none;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:.8rem;font-weight:700;transition:opacity .15s;white-space:nowrap}
  .btn-run:disabled{opacity:.4;cursor:not-allowed}
  .btn-run:hover:not(:disabled){opacity:.85}
  .pin-notfound{font-size:.7rem;color:var(--red)}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

  /* ── Divider ── */
  .divider{height:1px;background:var(--bg-card);margin:0 20px}

  /* ── Main layout ── */
  .main{display:flex;flex:1;overflow:hidden;gap:0}
  .left-panel{flex:1;overflow-y:auto;padding:0 20px 20px}
  .right-panel{width:340px;flex-shrink:0;display:flex;flex-direction:column;border-left:1px solid var(--bg-card);overflow:hidden}

  /* ── Cards ── */
  .card{background:var(--bg-card);border-radius:8px;border-left:3px solid var(--card-color,var(--accent));margin-top:14px;overflow:hidden}
  .card-header{padding:10px 14px 6px;font-size:.9rem;font-weight:700}
  .card-body{padding:0 14px 12px}

  /* ── Market pulse ── */
  .mkt-main{display:flex;align-items:baseline;gap:10px;padding:6px 0 4px}
  .mkt-nifty{font-size:1.3rem;font-weight:700}
  .mkt-chg{font-size:1rem;font-weight:700}
  .mkt-chg.up{color:var(--green)}
  .mkt-chg.dn{color:var(--red)}
  .mkt-regime{display:flex;align-items:center;gap:8px;font-size:.82rem;margin:2px 0}
  .regime-badge{font-weight:700;padding:2px 8px;border-radius:4px;font-size:.78rem}
  .regime-badge.risk-on{background:#1a3a2a;color:var(--green)}
  .regime-badge.risk-off{background:#3a1a1a;color:var(--red)}
  .mkt-flows{display:flex;gap:16px;margin-top:6px;font-size:.82rem}
  .flow-fii{font-weight:700}
  .flow-fii.pos{color:var(--green)}
  .flow-fii.neg{color:var(--red)}
  .mkt-hint{font-size:.75rem;color:var(--text-dim);font-style:italic;margin-top:6px;line-height:1.4}

  /* ── Lists ── */
  .file-row{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.82rem}
  .file-row:last-child{border-bottom:none}
  .file-name{flex:1;cursor:pointer;color:var(--cyan);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .file-name:hover{text-decoration:underline}
  .file-proj{font-size:.7rem;color:var(--text-dim);background:var(--bg-mid);padding:1px 5px;border-radius:3px;white-space:nowrap}
  .file-age{font-size:.7rem;color:var(--yellow);white-space:nowrap}
  .icon-btn{background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:.85rem;padding:2px 4px;border-radius:4px;transition:.15s}
  .icon-btn:hover{background:var(--bg-mid);color:var(--text)}
  .badge-proj{font-size:.68rem;font-weight:700;background:#1a3a2a;color:var(--green);padding:1px 5px;border-radius:3px;white-space:nowrap}

  /* ── History ── */
  .hist-row{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.82rem}
  .hist-row:last-child{border-bottom:none}
  .hist-icon{font-size:.9rem}
  .hist-script{flex:1;color:var(--text)}
  .hist-time{font-size:.72rem;color:var(--text-dim)}

  /* ── Right panel ── */
  .log-header{padding:10px 14px 6px;font-size:.88rem;font-weight:700;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bg-card)}
  .log-area{flex:1;overflow-y:auto;background:#0d0d1a;padding:10px 12px;font-family:Consolas,monospace;font-size:.75rem;color:var(--green);line-height:1.6;white-space:pre-wrap;word-break:break-all}
  .log-path{color:var(--cyan);cursor:pointer;text-decoration:underline}
  .log-err{color:var(--red)}
  .log-done{color:var(--yellow);font-weight:700}
  .btn-clear{background:none;border:1px solid var(--bg-card);color:var(--text-dim);padding:3px 10px;border-radius:4px;cursor:pointer;font-size:.72rem}
  .btn-clear:hover{background:var(--bg-card)}

  .output-files{border-top:1px solid var(--bg-card);padding:8px 14px 10px}
  .output-title{font-size:.78rem;font-weight:700;color:var(--cyan);margin-bottom:6px}
  .output-list{display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto}
  .out-row{display:flex;align-items:center;gap:6px;font-size:.75rem}
  .out-name{flex:1;color:var(--cyan);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .out-name:hover{text-decoration:underline}
  .out-empty{font-size:.75rem;color:var(--text-dim);font-style:italic}

  .loading{color:var(--text-dim);font-size:.82rem;padding:8px 0;font-style:italic}
  .empty{color:var(--text-dim);font-size:.8rem;font-style:italic;padding:6px 0}
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="header-left">
    <div class="header-title">⚡ Project Launcher</div>
    <div class="header-sub">Quick launch · market pulse · recent outputs · run history</div>
  </div>
  <button class="btn-refresh" onclick="refreshAll()">↻ Refresh All</button>
</div>

<!-- Quick Launch -->
<div class="section-title">Quick Launch</div>
<div class="pinned-grid" id="pinned-grid"><div class="loading">Loading scripts…</div></div>

<div class="divider"></div>

<!-- Main body -->
<div class="main">
  <div class="left-panel">

    <!-- Market Pulse -->
    <div class="card" style="--card-color:#56d4e8">
      <div class="card-header" style="color:#56d4e8">📈 Market Pulse (NSE)</div>
      <div class="card-body" id="market-body"><div class="loading">Fetching Nifty & FII/DII data…</div></div>
    </div>

    <!-- HTML Dashboards -->
    <div class="card" style="--card-color:#4ecf7a">
      <div class="card-header" style="color:#4ecf7a">🌐 HTML Dashboards</div>
      <div class="card-body" id="dash-body"><div class="loading">Scanning…</div></div>
    </div>

    <!-- Recent Reports -->
    <div class="card" style="--card-color:#7c6af7">
      <div class="card-header" style="color:#7c6af7">🗂 Recent Reports</div>
      <div class="card-body" id="outputs-body"><div class="loading">Scanning project folders…</div></div>
    </div>

    <!-- Run History -->
    <div class="card" style="--card-color:#f0c060">
      <div class="card-header" style="color:#f0c060">🕘 Run History</div>
      <div class="card-body" id="history-body"><div class="loading">Loading…</div></div>
    </div>

  </div>

  <!-- Right: log panel -->
  <div class="right-panel">
    <div class="log-header">
      <span>Output Log</span>
      <button class="btn-clear" onclick="clearLog()">Clear</button>
    </div>
    <div class="log-area" id="log-area"></div>
    <div class="output-files">
      <div class="output-title">Detected Output Files</div>
      <div class="output-list" id="detected-outputs">
        <div class="out-empty">None yet — run a script to detect output files.</div>
      </div>
    </div>
  </div>
</div>

<script>
const API = '';
let detectedOutputs = [];
let activeJobs = {};

// ── Fetch helpers ──────────────────────────────────────────────────────────
async function get(url) {
  const r = await fetch(API + url);
  return r.json();
}

// ── Startup ────────────────────────────────────────────────────────────────
window.onload = () => {
  loadScripts();
  loadMarket();
  loadOutputs();
  loadHistory();
};

function refreshAll() {
  loadScripts();
  loadMarket();
  loadOutputs();
  loadHistory();
}

// ── Scripts ────────────────────────────────────────────────────────────────
async function loadScripts() {
  const scripts = await get('/api/scripts');
  const grid = document.getElementById('pinned-grid');
  grid.innerHTML = '';
  for (const s of scripts) {
    const card = document.createElement('div');
    card.className = 'pin-card';
    card.style.setProperty('--card-color', s.color);
    card.id = 'card-' + s.id;
    card.innerHTML = `
      <div class="pin-bar" style="background:${s.color}"></div>
      <div class="pin-body">
        <div class="pin-label" style="color:${s.color}">${s.label}</div>
        <div class="pin-desc">${s.desc.replace(/\n/g,'<br>')}</div>
        ${!s.exists ? '<div class="pin-notfound">⚠ Script not found</div>' : ''}
        <div class="pin-footer">
          <div class="pin-status" id="status-${s.id}"></div>
          <button class="btn-run" id="btn-${s.id}" onclick="runScript('${s.id}','${escHtml(s.bat)}','${escHtml(s.label)}')"
            ${!s.exists?'disabled':''}>▶ Run</button>
        </div>
      </div>`;
    grid.appendChild(card);
  }
}

async function runScript(id, bat, label) {
  const btn    = document.getElementById('btn-' + id);
  const status = document.getElementById('status-' + id);

  btn.disabled = true;
  btn.textContent = '⏳ Running';
  status.className = 'pin-status running';

  appendLog(`\n[${ts()}] ▶ Launching: ${label}\n`, '');

  const resp = await fetch('/api/run', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({bat})
  });
  const {job_id, error} = await resp.json();

  if (error) {
    appendLog(`[${ts()}] ERROR: ${error}\n`, 'log-err');
    btn.disabled = false; btn.textContent = '▶ Run';
    status.className = 'pin-status err';
    return;
  }

  // Stream logs via SSE
  const es = new EventSource(`/api/log/${job_id}`);
  activeJobs[job_id] = es;

  es.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'log')    { appendLogLine(msg.text); }
    if (msg.type === 'output') { addDetectedOutput(msg.path); }
    if (msg.type === 'done') {
      const ok = msg.exit === 0;
      appendLog(`[${ts()}] ${ok ? '✓' : '✗'} Exit ${msg.exit}: ${label} (${msg.secs}s)\n`, ok ? '' : 'log-err');
      status.className = 'pin-status ' + (ok ? 'ok' : 'err');
      btn.disabled = false; btn.textContent = '▶ Run';
      es.close();
      loadHistory();
      loadOutputs();
    }
    if (msg.type === 'error') {
      appendLog(`[${ts()}] ERROR: ${msg.text}\n`, 'log-err');
      status.className = 'pin-status err';
      btn.disabled = false; btn.textContent = '▶ Run';
      es.close();
    }
  };
  es.onerror = () => {
    es.close();
    btn.disabled = false; btn.textContent = '▶ Run';
  };
}

// ── Market ────────────────────────────────────────────────────────────────
async function loadMarket() {
  const body = document.getElementById('market-body');
  body.innerHTML = '<div class="loading">Fetching Nifty & FII/DII data…</div>';
  const m = await get('/api/market');
  if (!m.ok) {
    body.innerHTML = `<div class="empty">Offline — market data unavailable.${m.error?' ('+m.error+')':''}</div>`;
    return;
  }
  const chgCls = m.chg_pct >= 0 ? 'up' : 'dn';
  const sign   = m.chg_pct >= 0 ? '+' : '';
  const rCls   = m.regime === 'RISK-ON' ? 'risk-on' : 'risk-off';
  const dma    = m.above_200dma ? 'above' : 'below';
  let flowsHtml = '';
  if (m.fii !== null || m.dii !== null) {
    const fiiCls = m.fii !== null ? (m.fii >= 0 ? 'pos' : 'neg') : '';
    const diiCls = m.dii !== null ? (m.dii >= 0 ? 'pos' : 'neg') : '';
    flowsHtml = `<div class="mkt-flows">
      ${m.fii !== null ? `<span class="flow-fii ${fiiCls}">FII ${fmtCr(m.fii)} cr</span>` : ''}
      ${m.dii !== null ? `<span class="flow-fii ${diiCls}">DII ${fmtCr(m.dii)} cr</span>` : ''}
      ${m.flow_date ? `<span style="color:var(--text-dim);font-size:.72rem">(${m.flow_date})</span>` : ''}
    </div>`;
  }
  const hint = m.regime === 'RISK-ON'
    ? 'Momentum entries favoured — normal sizing.'
    : 'Caution: halve size, faster profit-taking, tighter stops.';
  body.innerHTML = `
    <div class="mkt-main">
      <span class="mkt-nifty">NIFTY 50 &nbsp;${m.nifty.toLocaleString('en-IN')}</span>
      <span class="mkt-chg ${chgCls}">${sign}${m.chg_pct}%</span>
    </div>
    <div class="mkt-regime">
      <span class="regime-badge ${rCls}">● ${m.regime}</span>
      <span style="color:var(--text-dim);font-size:.8rem">${dma} 200DMA · 21d vol ${(m.vol21*100).toFixed(1)}%</span>
    </div>
    ${flowsHtml}
    <div class="mkt-hint">${hint}</div>`;
}

// ── Outputs & Dashboards ──────────────────────────────────────────────────
async function loadOutputs() {
  const {outputs, dashboards} = await get('/api/outputs');

  // Dashboards
  const dashBody = document.getElementById('dash-body');
  if (!dashboards.length) {
    dashBody.innerHTML = '<div class="empty">No HTML reports found yet — run a screener first.</div>';
  } else {
    dashBody.innerHTML = dashboards.map(f => `
      <div class="file-row">
        <span class="badge-proj">${f.proj}</span>
        <span class="file-name" onclick="openFile('${escJs(f.path)}')" title="${escHtml(f.path)}">🌐 ${f.name}</span>
        <span class="file-age">${f.age}</span>
        <button class="icon-btn" onclick="openFile('${escJs(f.path)}','folder')" title="Open folder">📂</button>
      </div>`).join('');
  }

  // Recent outputs
  const outBody = document.getElementById('outputs-body');
  if (!outputs.length) {
    outBody.innerHTML = '<div class="empty">No report files found in project folders.</div>';
  } else {
    outBody.innerHTML = outputs.map(f => {
      const icon = f.ext === '.html' ? '🌐' : f.ext === '.xlsx' ? '📊' : f.ext === '.pdf' ? '📄' : '📁';
      return `<div class="file-row">
        <span class="file-proj">${f.proj}</span>
        <span class="file-name" onclick="openFile('${escJs(f.path)}')" title="${escHtml(f.path)}">${icon} ${f.name}</span>
        <span class="file-age">${f.age}</span>
        <button class="icon-btn" onclick="openFile('${escJs(f.path)}','folder')" title="Open folder">📂</button>
      </div>`;
    }).join('');
  }
}

async function openFile(path, mode) {
  await fetch(`/api/open?path=${encodeURIComponent(path)}&mode=${mode||'file'}`);
}

// ── History ───────────────────────────────────────────────────────────────
async function loadHistory() {
  const hist = await get('/api/history');
  const body = document.getElementById('history-body');
  if (!hist.length) { body.innerHTML = '<div class="empty">No runs recorded yet.</div>'; return; }
  body.innerHTML = [...hist].reverse().slice(0, 10).map(r => {
    const ok = r.exit === 0;
    const dur = typeof r.secs === 'number' ? ` · ${r.secs}s` : '';
    return `<div class="hist-row">
      <span class="hist-icon" style="color:${ok?'var(--green)':'var(--red)'}">${ok?'✓':'✗'}</span>
      <span class="hist-script">${r.script}</span>
      <span class="hist-time">${r.time}${dur}</span>
    </div>`;
  }).join('');
}

// ── Log helpers ───────────────────────────────────────────────────────────
const logArea = document.getElementById('log-area');

function appendLogLine(text) {
  const paths = extractPaths(text);
  if (!paths.length) { appendLog(text, ''); return; }
  let remaining = text;
  for (const p of paths) {
    const idx = remaining.indexOf(p);
    if (idx >= 0) {
      appendLog(remaining.slice(0, idx), '');
      const span = document.createElement('span');
      span.className = 'log-path';
      span.textContent = p;
      span.onclick = () => openFile(p);
      logArea.appendChild(span);
      remaining = remaining.slice(idx + p.length);
    }
  }
  appendLog(remaining, '');
}

function appendLog(text, cls) {
  if (!text) return;
  if (cls) {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    logArea.appendChild(span);
  } else {
    logArea.appendChild(document.createTextNode(text));
  }
  logArea.scrollTop = logArea.scrollHeight;
}

function clearLog() {
  logArea.innerHTML = '';
  detectedOutputs = [];
  document.getElementById('detected-outputs').innerHTML =
    '<div class="out-empty">None yet — run a script to detect output files.</div>';
}

function addDetectedOutput(path) {
  if (detectedOutputs.includes(path)) return;
  detectedOutputs.push(path);
  const container = document.getElementById('detected-outputs');
  const empty = container.querySelector('.out-empty');
  if (empty) empty.remove();
  const name = path.split(/[\\\/]/).pop();
  const row = document.createElement('div');
  row.className = 'out-row';
  const isHtml = name.toLowerCase().endsWith('.html');
  row.innerHTML = `
    <span>${isHtml ? '🌐' : '📄'}</span>
    <span class="out-name" onclick="openFile('${escJs(path)}')" title="${escHtml(path)}">${name}</span>
    <button class="icon-btn" onclick="openFile('${escJs(path)}','folder')">📂</button>`;
  container.appendChild(row);
}

// ── Utilities ─────────────────────────────────────────────────────────────
function ts() {
  return new Date().toTimeString().slice(0,8);
}
function fmtCr(v) {
  return (v >= 0 ? '+' : '') + v.toLocaleString('en-IN');
}
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escJs(s) {
  return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}
function extractPaths(text) {
  const found = [];
  const pats = [
    /[A-Za-z]:\\[^\s'"<>|]+\.(?:csv|xlsx?|txt|json|pdf|html?|log|zip|png|jpg)/gi,
    /[A-Za-z]:\/[^\s'"<>|]+\.(?:csv|xlsx?|txt|json|pdf|html?|log|zip|png|jpg)/gi,
  ];
  for (const pat of pats) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const p = m[0].replace(/[.,;)]+$/, '');
      if (!found.includes(p)) found.push(p);
    }
  }
  return found;
}
</script>
</body>
</html>"""


# ── Entry point ───────────────────────────────────────────────────────────────

def open_browser():
    time.sleep(1.2)
    webbrowser.open(f"http://localhost:{PORT}")


if __name__ == "__main__":
    print(f"⚡ Project Launcher — Web Edition")
    print(f"   http://localhost:{PORT}")
    print(f"   Press Ctrl+C to stop\n")
    threading.Thread(target=open_browser, daemon=True).start()
    app.run(host="localhost", port=PORT, debug=False, threaded=True)
