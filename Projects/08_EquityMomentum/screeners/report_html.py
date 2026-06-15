"""Generate a self-contained HTML analysis report from screener DataFrames.

Called by run_all.py after all data is computed.  No external dependencies —
all CSS and JS are inline so the file opens anywhere without a network.
"""

from __future__ import annotations
import html
from typing import Optional
import pandas as pd


# ── colour helpers ──────────────────────────────────────────────────────────

def _score_colour(v: float) -> str:
    if pd.isna(v):
        return "#555"
    if v >= 80:   return "#27ae60"
    if v >= 65:   return "#f39c12"
    return "#e74c3c"

def _rsi_colour(v: float) -> str:
    if pd.isna(v):    return "#555"
    if v > 75:        return "#e74c3c"
    if v >= 55:       return "#27ae60"
    if v >= 40:       return "#f39c12"
    return "#e74c3c"

def _bool_badge(v) -> str:
    if v is True  or str(v).upper() == "TRUE":
        return '<span class="badge green">✓</span>'
    if v is False or str(v).upper() == "FALSE":
        return '<span class="badge red">✗</span>'
    return html.escape(str(v))

def _score_bar(v: float, max_val: float = 100) -> str:
    if pd.isna(v): return "—"
    pct    = min(100, max(0, v / max_val * 100))
    colour = _score_colour(v)
    return (f'<div class="bar-wrap">'
            f'<div class="bar-fill" style="width:{pct:.0f}%;background:{colour}"></div>'
            f'<span class="bar-label">{v:.1f}</span></div>')

def _fmt(v) -> str:
    if pd.isna(v):                           return "—"
    if isinstance(v, bool):                  return _bool_badge(v)
    if isinstance(v, float):                 return f"{v:.4g}"
    return html.escape(str(v))


# ── CSS ─────────────────────────────────────────────────────────────────────

_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#0f1117;color:#e0e0e0;font-size:13px}
a{color:#4ecf7a}
h1{font-size:1.6rem;font-weight:700;color:#fff}
h2{font-size:1.05rem;font-weight:600;color:#c9d1d9;margin:0 0 10px}
h3{font-size:1rem;font-weight:700;color:#fff;margin-bottom:12px}

/* Top bar */
.topbar{padding:18px 28px;background:linear-gradient(135deg,#1a1f2e 0%,#0f1117 100%);
        border-bottom:1px solid #2a2f3f;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.topbar h1 span{color:#4ecf7a}
.meta{font-size:11px;color:#888;margin-top:4px}

/* Regime banner */
.regime-on {background:#0d3b1e;border:1px solid #27ae60;color:#58d68d;
            padding:10px 18px;border-radius:6px;font-weight:600;font-size:13px}
.regime-off{background:#3b0d0d;border:1px solid #e74c3c;color:#f1948a;
            padding:10px 18px;border-radius:6px;font-weight:600;font-size:13px}

/* Summary cards */
.cards{display:flex;flex-wrap:wrap;gap:12px;padding:18px 28px}
.card{background:#1a1f2e;border:1px solid #2a2f3f;border-radius:8px;
      padding:14px 18px;min-width:150px;flex:1}
.card .label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px}
.card .val{font-size:1.4rem;font-weight:700;color:#fff;margin-top:4px}
.card .sub{font-size:11px;color:#666;margin-top:2px}

/* Sections */
.sections{padding:0 28px 10px}
.section{margin-bottom:32px}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:8px;
                border-bottom:1px solid #2a2f3f;padding-bottom:8px}
.tag{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:.5px}
.tag-swing  {background:#1a3a4a;color:#5dade2}
.tag-pos    {background:#1a3a2a;color:#4ecf7a}
.tag-port   {background:#2a1a3a;color:#a569bd}
.tag-rank   {background:#3a2a1a;color:#f39c12}
.tag-fii    {background:#3a1a1a;color:#ec7063}
.tag-summary{background:#1a2a3a;color:#85c1e9}
.tag-analysis{background:#2a1a3a;color:#f39c12}
.note{font-size:11px;color:#888;font-style:italic;margin-bottom:8px;
      background:#1a1f2e;border-left:3px solid #4ecf7a;padding:6px 10px;border-radius:0 4px 4px 0}

/* Tables */
.tbl-wrap{overflow-x:auto;border-radius:6px;border:1px solid #2a2f3f}
table{width:100%;border-collapse:collapse;background:#12161f}
thead tr{background:#1f4e79}
thead th{padding:8px 10px;text-align:left;font-size:11px;font-weight:600;
         color:#c9d1d9;white-space:nowrap;cursor:pointer;user-select:none}
thead th:hover{background:#2563a8}
thead th.sorted-asc::after {content:" ▲";font-size:9px}
thead th.sorted-desc::after{content:" ▼";font-size:9px}
tbody tr{border-bottom:1px solid #1e2330}
tbody tr:hover{background:#1e2535}
tbody td{padding:6px 10px;vertical-align:middle;white-space:nowrap}
tbody tr:nth-child(even){background:#141820}
tbody tr:nth-child(even):hover{background:#1e2535}

/* Badges */
.badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700}
.badge.green{background:#1a4a2a;color:#58d68d}
.badge.red  {background:#4a1a1a;color:#f1948a}

/* Score bar */
.bar-wrap{display:flex;align-items:center;gap:6px;min-width:90px}
.bar-fill{height:6px;border-radius:3px;min-width:2px}
.bar-label{font-size:11px;color:#c9d1d9;min-width:30px}

/* FII flow colours */
.pos-flow{color:#58d68d;font-weight:600}
.neg-flow{color:#f1948a;font-weight:600}

/* ── Analysis section ── */
.analysis-wrap{padding:0 28px 40px}
.analysis-block{background:#1a1f2e;border:1px solid #2a2f3f;border-radius:8px;
                margin-bottom:20px;padding:20px 24px}
.analysis-block.regime-off-block{border-color:#e74c3c}
.analysis-block.regime-on-block {border-color:#27ae60}
.analysis-block p{color:#c9d1d9;line-height:1.7;margin-bottom:10px}
.analysis-block ul,.analysis-block ol{color:#c9d1d9;padding-left:22px}
.analysis-block li{margin-bottom:8px;line-height:1.6}
.alert-box{background:#2a1a1a;border-left:4px solid #e74c3c;
           padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0;color:#f1948a}
.info-box {background:#1a2a1a;border-left:4px solid #4ecf7a;
           padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0;color:#c9d1d9}
.warn-box {background:#2a2210;border-left:4px solid #f39c12;
           padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0;color:#f5cba7}

/* Sector cards */
.sector-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:12px}
.sector-card{background:#12161f;border:1px solid #2a2f3f;border-radius:6px;padding:14px}
.sector-card .sc-head{font-size:13px;font-weight:700;color:#fff;margin-bottom:6px}
.sector-card .sc-sub {font-size:11px;color:#888;margin-bottom:10px}
.sector-stocks{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
.stock-chip{background:#1f4e79;color:#85c1e9;padding:3px 9px;border-radius:10px;
            font-size:11px;font-weight:600}
.sector-card p{font-size:12px;color:#aaa;line-height:1.5;margin-top:8px}

/* Swing cards */
.swing-card{background:#12161f;border:1px solid #2a2f3f;border-radius:6px;
            padding:16px;margin-bottom:12px}
.swing-card .sw-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.sw-symbol{font-size:15px;font-weight:700;color:#fff}
.conviction-badge{padding:3px 12px;border-radius:10px;font-size:11px;font-weight:700}
.conviction-high  {background:#1a4a2a;color:#4ecf7a}
.conviction-mid   {background:#3a2a10;color:#f39c12}
.conviction-low   {background:#2a1a1a;color:#e74c3c}
.swing-metrics{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.metric-pill{background:#1a2535;padding:4px 12px;border-radius:10px;font-size:11px;color:#85c1e9}
.metric-pill span{color:#fff;font-weight:600}
.sw-point{font-size:12px;color:#c9d1d9;line-height:1.6;margin:4px 0;padding-left:6px}
.sw-point.ok  {border-left:3px solid #27ae60;padding-left:8px}
.sw-point.warn{border-left:3px solid #f39c12;padding-left:8px}
.sw-point.bad {border-left:3px solid #e74c3c;padding-left:8px}

/* Positional tables */
.tier-label{font-size:12px;font-weight:700;color:#888;text-transform:uppercase;
            letter-spacing:.5px;margin:14px 0 6px}
.tier-table{width:100%;border-collapse:collapse;margin-bottom:10px}
.tier-table th{background:#1f4e79;color:#c9d1d9;padding:7px 10px;
               font-size:11px;text-align:left}
.tier-table td{padding:7px 10px;border-bottom:1px solid #1e2330;color:#c9d1d9;font-size:12px}
.tier-table tbody tr:hover{background:#1e2535}
.avoid-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.avoid-chip{background:#2a1a1a;color:#f1948a;padding:4px 12px;border-radius:10px;font-size:12px}

/* Risk rules */
.risk-rule{display:flex;gap:12px;align-items:flex-start;padding:10px 0;
           border-bottom:1px solid #2a2f3f}
.risk-rule:last-child{border:none}
.risk-icon{font-size:18px;min-width:28px}
.risk-text strong{color:#fff;font-size:13px}
.risk-text p{color:#aaa;font-size:12px;margin-top:3px}

/* Action plan */
.checklist{list-style:none;padding:0}
.checklist li{padding:7px 0;border-bottom:1px solid #1e2330;color:#c9d1d9;font-size:12px;
              display:flex;gap:10px;align-items:flex-start}
.checklist li:last-child{border:none}
.cb{width:16px;height:16px;border:2px solid #4ecf7a;border-radius:3px;
    flex-shrink:0;margin-top:1px}
.trigger-row{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #1e2330;font-size:12px}
.trigger-row:last-child{border:none}
.trigger-cond{color:#f39c12;min-width:260px;font-weight:600}
.trigger-act {color:#c9d1d9}

/* Footer */
footer{text-align:center;padding:18px;font-size:11px;color:#555;border-top:1px solid #2a2f3f}
"""

_JS = """
function sortTable(th){
  var table=th.closest('table');
  var tbody=table.querySelector('tbody');
  var idx=Array.from(th.parentNode.children).indexOf(th);
  var asc=th.classList.contains('sorted-asc');
  table.querySelectorAll('thead th').forEach(function(t){t.classList.remove('sorted-asc','sorted-desc');});
  th.classList.add(asc?'sorted-desc':'sorted-asc');
  var rows=Array.from(tbody.querySelectorAll('tr'));
  rows.sort(function(a,b){
    var av=a.cells[idx].getAttribute('data-v')||a.cells[idx].textContent.trim();
    var bv=b.cells[idx].getAttribute('data-v')||b.cells[idx].textContent.trim();
    var an=parseFloat(av),bn=parseFloat(bv);
    if(!isNaN(an)&&!isNaN(bn)) return asc?(bn-an):(an-bn);
    return asc?bv.localeCompare(av):av.localeCompare(bv);
  });
  rows.forEach(function(r){tbody.appendChild(r);});
}
document.querySelectorAll('thead th').forEach(function(th){
  th.addEventListener('click',function(){sortTable(th);});
});
"""


# ── Sector theme classifier ──────────────────────────────────────────────────

_SECTOR_THEMES = {
    "Capital Goods & Infrastructure": {
        "keywords": ["capital goods", "cables", "electrical", "engineering", "defence",
                     "infrastructure", "power", "cement", "construction", "industrial",
                     "heavy", "machinery", "equipment", "semiconductor", "electronics"],
        "emoji": "🏗️",
        "headline": "PLI + Capex Supercycle",
        "riskoff": (
            "Government spending on power infrastructure, defence electronics, and industrial "
            "automation has compounded for 2-3 years. Genuine earnings momentum behind price "
            "action — not just momentum chasing. <strong>Risk:</strong> any budget/spending "
            "freeze news. In RISK-OFF, these can hold up if government order flows stay intact."
        ),
        "riskon": (
            "Capex supercycle accelerating. Power sector orders, defence indigenisation and PLI "
            "incentives are driving multi-year earnings growth. Strong conviction in RISK-ON."
        ),
    },
    "Healthcare & Pharma": {
        "keywords": ["pharma", "healthcare", "hospital", "medical", "drug", "biotech",
                     "life sciences", "diagnostics", "health"],
        "emoji": "💊",
        "headline": "Defensive-Growth with Export Tailwind",
        "riskoff": (
            "Classic RISK-OFF haven. Pharma exports benefit from a weakening rupee. Hospital "
            "chains have pricing power independent of market cycles. "
            "<strong>Most comfortable sector to hold through turbulence.</strong>"
        ),
        "riskon": (
            "CDMO/API export momentum, hospital capacity expansion, specialty generics in "
            "regulated markets. Sector works in any regime — add on dips."
        ),
    },
    "Financial Services": {
        "keywords": ["bank", "finance", "nbfc", "insurance", "amc", "asset management",
                     "exchange", "brokerage", "housing finance", "microfinance", "wealth"],
        "emoji": "🏦",
        "headline": "Quality Divergence — Be Selective",
        "riskoff": (
            "Exchanges and AMCs (structural SIP beneficiaries) are quality holdings in any "
            "regime. Large private banks are fine. <strong>Smaller private banks carry "
            "balance-sheet risk in downturns — size these smaller.</strong>"
        ),
        "riskon": (
            "Credit growth cycle supports banks broadly. AMCs and exchanges are structural "
            "beneficiaries of India's financialisation. Prefer quality over yield."
        ),
    },
    "Consumer & Retail": {
        "keywords": ["consumer", "retail", "fmcg", "food", "beverage", "textile",
                     "fashion", "beauty", "cosmetics", "footwear", "jewellery"],
        "emoji": "🛒",
        "headline": "Discretionary Faces Headwinds in RISK-OFF",
        "riskoff": (
            "Consumer discretionary struggles when FIIs are selling and sentiment is weak. "
            "FMCG (staples) is defensive but rarely tops momentum screens. "
            "<strong>Size discretionary names smaller.</strong>"
        ),
        "riskon": (
            "Urban consumption, premiumisation and rural recovery are multi-year themes. "
            "Consumer plays run hard in a RISK-ON bull market."
        ),
    },
    "Energy & Renewables": {
        "keywords": ["energy", "renewable", "solar", "wind", "oil", "gas", "refinery",
                     "fuel", "lng", "green hydrogen"],
        "emoji": "⚡",
        "headline": "High-Beta — Handle with Care in RISK-OFF",
        "riskoff": (
            "Renewable energy stocks are high-beta and volatile. Policy/subsidy newsflow "
            "drives sharp moves in either direction. <strong>If held, use very tight stops "
            "and smaller position sizes.</strong>"
        ),
        "riskon": (
            "Energy transition is a decade-long theme. Solar, wind and green hydrogen can "
            "run hard in RISK-ON. Valuation discipline is still essential."
        ),
    },
    "Technology": {
        "keywords": ["technology", "software", "it services", "tech", "digital", "data",
                     "telecom", "internet", "saas", "cloud", "fintech"],
        "emoji": "💻",
        "headline": "Global Demand Sensitive",
        "riskoff": (
            "IT services track global tech spending. Weak US/EU demand creates earnings risk. "
            "Domestic tech (fintech, enterprise SaaS) is more insulated from global cycles."
        ),
        "riskon": (
            "BFSI deal wins, cloud migration and AI adoption are driving deal flows. "
            "Margin recovery adds earnings leverage in a RISK-ON environment."
        ),
    },
}

def _classify_sector(industry_str: str) -> str:
    ind = str(industry_str).lower()
    for theme, cfg in _SECTOR_THEMES.items():
        if any(kw in ind for kw in cfg["keywords"]):
            return theme
    return "Other"


# ── Per-setup commentary generators ─────────────────────────────────────────

def _conviction_badge(composite: float) -> str:
    if composite >= 83:
        return '<span class="conviction-badge conviction-high">Highest Conviction</span>'
    if composite >= 78:
        return '<span class="conviction-badge conviction-mid">High Conviction</span>'
    return '<span class="conviction-badge conviction-low">Moderate — Qualifies</span>'

def _rsi_point(rsi: float) -> str:
    if rsi > 75:
        return (f'<p class="sw-point bad">⚠️ RSI {rsi:.1f} is approaching overbought (&gt;75 is stretched). '
                f'<strong>Do not chase</strong> — wait for a 1-2 day pullback to the 20DMA. '
                f'If it gaps up at the open, skip the trade entirely.</p>')
    if rsi >= 60:
        return (f'<p class="sw-point ok">✅ RSI {rsi:.1f} — healthy momentum, not stretched. '
                f'Entry near last close is valid.</p>')
    if rsi >= 45:
        return (f'<p class="sw-point ok">✅ RSI {rsi:.1f} — pullback-buy zone. '
                f'Excellent risk/reward if the uptrend structure is intact.</p>')
    return (f'<p class="sw-point bad">⚠️ RSI {rsi:.1f} — weak momentum. '
            f'Price may be recovering but conviction is thin. Use smaller size.</p>')

def _delivery_point(d: float) -> str:
    if pd.isna(d):
        return '<p class="sw-point warn">🟡 Delivery data unavailable.</p>'
    if d >= 50:
        return (f'<p class="sw-point ok">✅ Delivery {d:.1f}% — investors taking shares to demat. '
                f'Strong institutional accumulation signal.</p>')
    if d >= 25:
        return (f'<p class="sw-point warn">🟡 Delivery {d:.1f}% — moderate institutional interest. '
                f'Not alarming, but not confirming strong demand either.</p>')
    return (f'<p class="sw-point bad">⚠️ Delivery {d:.1f}% — mostly intraday speculation. '
            f'Breakouts on low delivery fail more often. Keep stop tight.</p>')

def _volume_point(vr: float) -> str:
    if pd.isna(vr):
        return ''
    if vr >= 1.5:
        return (f'<p class="sw-point warn">📢 Volume {vr:.2f}× normal — unusually high, '
                f'possibly news-driven. Check for stock-specific triggers before entering.</p>')
    if vr >= 1.1:
        return (f'<p class="sw-point ok">✅ Volume {vr:.2f}× normal — genuine demand building '
                f'behind the move. Confirms the setup.</p>')
    return (f'<p class="sw-point warn">🟡 Volume {vr:.2f}× — no unusual activity yet. '
            f'Wait for volume to expand before committing full size.</p>')

def _risk_off_trade_note(risk_on: bool) -> str:
    if risk_on:
        return '<p class="sw-point ok">✅ RISK-ON: Trail the position with the 20DMA, target T2.</p>'
    return ('<p class="sw-point warn">⚠️ RISK-OFF: Book full position at T1 — '
            'don\'t trail. Market conditions favour smaller holds.</p>')


# ── Main analysis generator ──────────────────────────────────────────────────

def _get(df, col, default=None):
    """Safe column fetch from a DataFrame row (Series)."""
    return df.get(col, default) if isinstance(df, dict) else getattr(df, col, default)


def generate_analysis_html(
    summary: pd.DataFrame,
    swing_df: pd.DataFrame,
    pos_df: pd.DataFrame,
    port: pd.DataFrame,
    fii_df: Optional[pd.DataFrame],
) -> str:
    """Return an HTML string containing the full analysis section."""

    # ── parse summary ──
    def sv(item, default="—"):
        r = summary[summary["Item"] == item]
        return str(r["Value"].iloc[0]) if len(r) else default

    run_date   = sv("Run date")
    regime_str = sv("Market regime")
    exposure   = sv("Exposure multiplier")
    vol_raw    = sv("Index 21d ann vol")
    risk_on    = regime_str == "RISK-ON"

    try:    vol_pct = f"{float(vol_raw)*100:.1f}%"
    except: vol_pct = vol_raw

    try:    exp_f = float(exposure)
    except: exp_f = 0.5

    # ── FII/DII ──
    fii_net = dii_net = flow_date = None
    if fii_df is not None and len(fii_df):
        for _, row in fii_df.iterrows():
            cat = str(row.get("category", "")).upper()
            v   = row.get("netValue")
            if v is not None:
                try: v = float(v)
                except: v = None
            if ("FII" in cat or "FPI" in cat) and v is not None:
                fii_net = v
            elif "DII" in cat and v is not None:
                dii_net = v
            flow_date = row.get("date", flow_date)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. MARKET CONTEXT
    # ─────────────────────────────────────────────────────────────────────────

    regime_icon  = "🟢" if risk_on else "🔴"
    regime_label = "RISK-ON — Momentum Favoured" if risk_on else "RISK-OFF — Defensive Posture"
    block_cls    = "regime-on-block" if risk_on else "regime-off-block"

    if risk_on:
        context_intro = (
            f"Nifty is <strong>above its 200DMA</strong> with 21-day annualised vol at {vol_pct}. "
            f"The model is deploying <strong>{exp_f*100:.0f}% of capital</strong>. "
            f"Momentum setups have a higher success rate in this environment."
        )
        context_bullets = [
            "Trend is your friend — breakouts complete more often and with less whipsaw.",
            "RSI can stay elevated for longer; don't fade strength prematurely.",
            "Both FII and DII flows tend to be supportive — follow the institutional money.",
            "<strong>Playbook:</strong> normal position sizes, trail winners, target T2.",
        ]
    else:
        context_intro = (
            f"Nifty is <strong>below its 200DMA</strong> with 21-day annualised vol at {vol_pct}. "
            f"The model is correctly cutting exposure to <strong>{exp_f*100:.0f}% of capital</strong>. "
            f"You are in a bear-market or correction phase."
        )
        context_bullets = [
            "Even strong momentum names get dragged down by forced institutional selling.",
            "Breakouts fail at a higher rate — require stronger volume confirmation before entry.",
            "Profits evaporate quickly — book faster than you normally would.",
            "<strong>Playbook:</strong> smaller sizes, tighter holds, no 'buy and forget'.",
        ]

    # FII/DII context line
    flow_lines = []
    if fii_net is not None:
        fd = f" ({flow_date})" if flow_date else ""
        sign = "net bought" if fii_net >= 0 else "net sold"
        c    = "#58d68d" if fii_net >= 0 else "#f1948a"
        flow_lines.append(
            f'<li>FII {sign} <strong style="color:{c}">₹{abs(fii_net):,.0f} cr{fd}</strong> '
            f'— {"Foreign money flowing in: tailwind." if fii_net >= 0 else "Foreign money leaving: structural headwind."}</li>'
        )
    if dii_net is not None:
        sign = "net bought" if dii_net >= 0 else "net sold"
        c    = "#58d68d" if dii_net >= 0 else "#f1948a"
        flow_lines.append(
            f'<li>DII {sign} <strong style="color:{c}">₹{abs(dii_net):,.0f} cr</strong> '
            f'— {"Domestic MFs/insurers absorbing the selling: support, not a rally catalyst." if (fii_net or 0) < 0 and dii_net > 0 else "Domestic institutions also buying: strong support."}</li>'
        )
    if fii_net is not None and dii_net is not None and fii_net < 0 and dii_net > 0:
        flow_lines.append(
            '<li>FII selling absorbed by DII buying = <strong>range-bound market</strong>: '
            'favour pullback entries, not breakout chasing.</li>'
        )

    flow_html = (f'<ul style="margin-top:10px">{"".join(flow_lines)}</ul>'
                 if flow_lines else "")

    bullets_html = "".join(f"<li>{b}</li>" for b in context_bullets)

    s1 = f"""
<div class="analysis-block {block_cls}">
  <h3>{regime_icon} Market Context — {html.escape(regime_label)}</h3>
  <p>{context_intro}</p>
  <ul>{bullets_html}</ul>
  {flow_html}
</div>"""

    # ─────────────────────────────────────────────────────────────────────────
    # 2. SECTOR THEMES
    # ─────────────────────────────────────────────────────────────────────────

    if "Industry" in port.columns and "Symbol" in port.columns:
        port2 = port.copy()
        port2["_theme"] = port2["Industry"].apply(_classify_sector)
        theme_groups = (port2.groupby("_theme")
                            .apply(lambda g: list(zip(g["Symbol"],
                                                      g.get("composite_score", g.get("composite", pd.Series())))))
                            .sort_values(key=lambda s: s.apply(len), ascending=False))

        sector_cards = ""
        for theme, stocks in list(theme_groups.items())[:4]:
            if theme == "Other" and len(stocks) <= 1:
                continue
            cfg = _SECTOR_THEMES.get(theme, {})
            emoji    = cfg.get("emoji", "📦")
            headline = cfg.get("headline", theme)
            body_txt = cfg.get("riskoff" if not risk_on else "riskon", "")

            chips = "".join(
                f'<span class="stock-chip">{html.escape(str(sym))} '
                f'<span style="opacity:.7">({score:.0f})</span></span>'
                for sym, score in stocks
                if not (isinstance(score, float) and pd.isna(score))
            )
            if not chips:
                chips = "".join(f'<span class="stock-chip">{html.escape(str(sym))}</span>'
                                for sym, _ in stocks)

            sector_cards += f"""
<div class="sector-card">
  <div class="sc-head">{emoji} {html.escape(theme)}</div>
  <div class="sc-sub">{html.escape(headline)} · {len(stocks)} stocks in portfolio</div>
  <div class="sector-stocks">{chips}</div>
  <p>{body_txt}</p>
</div>"""

        s2 = f"""
<div class="analysis-block">
  <h3>📊 Sector Themes in the Top 30</h3>
  <p>Your portfolio is concentrated in {len(theme_groups)} sector themes. Understanding <em>why</em>
  these appear is key to conviction — are they earnings-driven or just price momentum?</p>
  <div class="sector-grid">{sector_cards}</div>
</div>"""
    else:
        s2 = ""

    # ─────────────────────────────────────────────────────────────────────────
    # 3. SWING TRADE ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────

    def _get_col(row, *names):
        for n in names:
            v = row.get(n)
            if v is not None and not (isinstance(v, float) and pd.isna(v)):
                return v
        return None

    if len(swing_df):
        swing_cards = ""
        for _, row in swing_df.head(6).iterrows():
            row = row.to_dict()
            sym    = _get_col(row, "Symbol") or "?"
            co     = _get_col(row, "Company") or ""
            ind    = _get_col(row, "Industry") or ""
            comp   = _get_col(row, "composite") or 0.0
            trend  = _get_col(row, "trend")
            rsi    = _get_col(row, "rsi_14")
            hi52   = _get_col(row, "pct_of_52w_high")
            vr     = _get_col(row, "vol_ratio_20_60")
            deliv  = _get_col(row, "delivery_pct")
            setup  = _get_col(row, "setup") or ""
            entry  = _get_col(row, "entry")
            stop   = _get_col(row, "stop_loss")
            t1     = _get_col(row, "target_1")
            t2     = _get_col(row, "target_2")

            metrics = ""
            if comp:   metrics += f'<span class="metric-pill">Composite <span>{comp:.1f}</span></span>'
            if trend:  metrics += f'<span class="metric-pill">Trend <span>{trend:.1f}</span></span>'
            if rsi:    metrics += f'<span class="metric-pill">RSI <span>{rsi:.1f}</span></span>'
            if hi52:   metrics += f'<span class="metric-pill">52w High <span>{hi52:.2f}</span></span>'
            if vr:     metrics += f'<span class="metric-pill">Vol Ratio <span>{vr:.2f}×</span></span>'
            if deliv:  metrics += f'<span class="metric-pill">Delivery <span>{deliv:.1f}%</span></span>'

            trade_detail = ""
            if entry and stop and t1 and t2:
                trade_detail = (
                    f'<div class="info-box" style="margin-top:10px;font-size:12px">'
                    f'<strong>Entry:</strong> ₹{entry:.2f} &nbsp;·&nbsp; '
                    f'<strong>Stop:</strong> ₹{stop:.2f} &nbsp;·&nbsp; '
                    f'<strong>T1:</strong> ₹{t1:.2f} &nbsp;·&nbsp; '
                    f'<strong>T2:</strong> ₹{t2:.2f}'
                    f'</div>'
                )

            rsi_h    = _rsi_point(rsi)    if rsi    is not None else ""
            deliv_h  = _delivery_point(deliv) if deliv is not None else ""
            vol_h    = _volume_point(vr)  if vr     is not None else ""
            riskoff_h= _risk_off_trade_note(risk_on)

            swing_cards += f"""
<div class="swing-card">
  <div class="sw-head">
    <span class="sw-symbol">{html.escape(str(sym))}</span>
    {_conviction_badge(float(comp) if comp else 0)}
    <span style="color:#888;font-size:11px">{html.escape(str(ind))}</span>
    <span style="color:#555;font-size:11px;margin-left:auto">{html.escape(str(setup))}</span>
  </div>
  <div class="swing-metrics">{metrics}</div>
  {rsi_h}
  {deliv_h}
  {vol_h}
  {riskoff_h}
  {trade_detail}
</div>"""

        s3 = f"""
<div class="analysis-block">
  <h3>⚡ Swing Trade Analysis <small style="font-weight:400;color:#888">(5–20 day)</small></h3>
  <p>Your screener identified <strong>{len(swing_df)}</strong> actionable swing setup{"s" if len(swing_df)!=1 else ""}.
  Each card below breaks down the signal quality and what to watch.</p>
  {swing_cards}
</div>"""
    else:
        s3 = """
<div class="analysis-block">
  <h3>⚡ Swing Trade Analysis</h3>
  <div class="warn-box">No swing setups qualified this run. This is common in RISK-OFF — the model's
  filters (composite ≥70, RSI 45-75, volume expanding) protect you from low-quality entries.
  Re-run after the next market session for fresh signals.</div>
</div>"""

    # ─────────────────────────────────────────────────────────────────────────
    # 4. POSITIONAL CANDIDATES
    # ─────────────────────────────────────────────────────────────────────────

    if len(pos_df):
        # Tier 1: top 5 by composite
        scored = pos_df.copy()
        scored["_comp"] = pd.to_numeric(scored.get("composite", scored.get("composite_score", 0)), errors="coerce")
        scored = scored.sort_values("_comp", ascending=False)

        tier1 = scored.head(5)
        tier2 = scored.iloc[5:8]

        def _pos_row(row):
            sym   = row.get("Symbol", "?")
            score = row.get("_comp", row.get("composite", row.get("composite_score", "—")))
            ind   = row.get("Industry", "")
            theme = _classify_sector(str(ind))
            cfg   = _SECTOR_THEMES.get(theme, {})
            why   = cfg.get("riskon" if risk_on else "riskoff", str(ind))[:80] + "…" if len(cfg.get("riskoff","")) > 80 else cfg.get("riskoff" if not risk_on else "riskon", str(ind))
            score_str = f"{float(score):.1f}" if not isinstance(score, str) else score
            return (f'<tr><td style="color:#fff;font-weight:600">{html.escape(str(sym))}</td>'
                    f'<td>{score_str}</td>'
                    f'<td style="color:#888">{html.escape(str(ind))}</td>'
                    f'<td style="color:#aaa;font-size:11px">{html.escape(str(why))}</td></tr>')

        t1_rows = "".join(_pos_row(r) for _, r in tier1.iterrows())
        t2_rows = "".join(_pos_row(r) for _, r in tier2.iterrows()) if len(tier2) else ""

        # Avoid list: stocks in port but NOT in pos_df, with high-beta sectors
        avoid_syms = []
        if "Symbol" in port.columns:
            pos_syms = set(pos_df.get("Symbol", pd.Series()).tolist())
            for _, r in port.iterrows():
                sym = str(r.get("Symbol", ""))
                ind = str(r.get("Industry", ""))
                if sym not in pos_syms:
                    theme = _classify_sector(ind)
                    if theme in ("Energy & Renewables", "Consumer & Retail") or any(
                        kw in ind.lower() for kw in ["turnaround", "micro", "small", "infrastructure trust"]
                    ):
                        avoid_syms.append(sym)
            avoid_syms = avoid_syms[:5]

        avoid_html = ""
        if avoid_syms:
            chips = "".join(f'<span class="avoid-chip">{html.escape(s)}</span>'
                            for s in avoid_syms)
            avoid_html = f"""
<div class="tier-label" style="color:#e74c3c">⚠️ Avoid for Positional in Current Regime</div>
<div class="avoid-list">{chips}</div>
<p style="color:#888;font-size:11px;margin-top:6px">
  These appear in the Top 30 by momentum score but are high-beta or cyclical —
  they fall harder than the market in RISK-OFF. Wait for RISK-ON confirmation.
</p>"""

        riskoff_note = ""
        if not risk_on:
            riskoff_note = """<div class="alert-box">
  <strong>RISK-OFF rule:</strong> Enter only half position size now. Add the second half
  only after Nifty posts a <strong>weekly close above the 200DMA</strong>.
</div>"""

        s4 = f"""
<div class="analysis-block">
  <h3>📈 Positional Trade Candidates <small style="font-weight:400;color:#888">(3–6 month)</small></h3>
  <p>From the {len(pos_df)} positional setups identified, focus on names that combine
  high composite score, ma_aligned = TRUE, and defensive/quality sectors.
  Wider stops survive normal 5-10% pullbacks — exit only on a <strong>weekly</strong> close
  below the 50DMA, not intraday dips.</p>

  {riskoff_note}

  <div class="tier-label">⭐ Tier 1 — Highest Conviction</div>
  <table class="tier-table">
    <thead><tr><th>Stock</th><th>Score</th><th>Industry</th><th>Why</th></tr></thead>
    <tbody>{t1_rows}</tbody>
  </table>

  {"<div class='tier-label'>✅ Tier 2 — Good, Size Smaller</div><table class='tier-table'><thead><tr><th>Stock</th><th>Score</th><th>Industry</th><th>Why</th></tr></thead><tbody>" + t2_rows + "</tbody></table>" if t2_rows else ""}

  {avoid_html}
</div>"""
    else:
        s4 = """
<div class="analysis-block">
  <h3>📈 Positional Candidates</h3>
  <div class="warn-box">No positional setups this run. In RISK-OFF, the model requires
  stocks to be above the 200DMA, MA-aligned, and within 15% of 52-week highs — fewer names
  qualify. This is protective behaviour, not a data issue.</div>
</div>"""

    # ─────────────────────────────────────────────────────────────────────────
    # 5. RISK MANAGEMENT
    # ─────────────────────────────────────────────────────────────────────────

    if risk_on:
        risk_rules = [
            ("📐", "Normal position sizing",
             f"Model uses 1% of capital per trade at risk. Full {exp_f*100:.0f}% equity exposure is appropriate."),
            ("🎯", "Trail winners",
             "In RISK-ON, let positions run to T2 and trail with the 20DMA (swing) or 50DMA (positional)."),
            ("🔄", "Re-run weekly",
             "Markets evolve. Re-run every Thursday/Friday after 3:30pm for fresh signals."),
            ("💧", "Stay liquid",
             "Keep 20-30% cash even in RISK-ON for opportunistic adds when setups pull back."),
        ]
    else:
        risk_rules = [
            ("⚠️", "Halved risk per trade",
             f"Model uses 0.5% of capital per trade in RISK-OFF (1% × {int(exp_f*2)}/2). "
             f"If your capital is ₹10L, risk ₹5,000 per position, not ₹10,000."),
            ("🚫", "No new positional trades until Nifty > 200DMA",
             "Opening full positional positions now means fighting the trend. The exposure "
             "multiplier is 0.5 for a reason — respect it."),
            ("💰", "Cash is a position",
             f"With {100 - exp_f*100:.0f}% capital held back, park it in liquid funds or FD. "
             "Do not deploy into 'other good ideas' outside the model."),
            ("🛑", "Stop losses are mandatory",
             "In bear markets, stop-hits cluster. A stock that gaps through your stop can "
             "lose 15-20% intraday. Use the model's ATR-based stops — not gut levels."),
            ("📉", "FII/DII divergence = range, not trend",
             "FII selling + DII buying = bounces without breakouts. This is a "
             "stock-picker's market. Your screener is most valuable precisely now."),
        ]

    risk_html = "".join(
        f'<div class="risk-rule"><div class="risk-icon">{icon}</div>'
        f'<div class="risk-text"><strong>{html.escape(title)}</strong>'
        f'<p>{html.escape(body)}</p></div></div>'
        for icon, title, body in risk_rules
    )

    s5 = f"""
<div class="analysis-block">
  <h3>🛡️ Risk Management — Critical Rules for This Regime</h3>
  <p>The <strong>{html.escape(regime_str)}</strong> designation is not a suggestion — it drives
  the model's exposure multiplier ({exposure}×) and position sizing. These rules apply right now:</p>
  {risk_html}
</div>"""

    # ─────────────────────────────────────────────────────────────────────────
    # 6. ACTION PLAN
    # ─────────────────────────────────────────────────────────────────────────

    # Weekend checklist: pull top 2 swing names
    swing_syms = []
    if len(swing_df) and "Symbol" in swing_df.columns:
        swing_syms = swing_df["Symbol"].head(3).tolist()

    if swing_syms:
        checklist_items = []
        for i, sym in enumerate(swing_syms):
            row = swing_df[swing_df["Symbol"] == sym].iloc[0].to_dict()
            rsi  = row.get("rsi_14", None)
            vr   = row.get("vol_ratio_20_60", None)
            if rsi and rsi > 72:
                checklist_items.append(
                    f'Set a <strong>limit order 1-2% below Friday close</strong> for {html.escape(str(sym))} '
                    f'— RSI {rsi:.1f} is elevated, don\'t chase the open.'
                )
            elif i == 0:
                checklist_items.append(
                    f'Check if <strong>{html.escape(str(sym))}</strong> has pulled back to its 20DMA '
                    f'— if yes, that\'s your best risk/reward swing entry right now.'
                )
            else:
                checklist_items.append(
                    f'Review <strong>{html.escape(str(sym))}</strong> setup — enter near last close '
                    f'(entry column in Excel), place stop immediately on fill.'
                )
        if not risk_on:
            checklist_items.append(
                'For any positional candidate, enter <strong>half position only</strong>. '
                'Reserve the second half for when Nifty posts a weekly close above the 200DMA.'
            )
        checklist_items.append(
            'Set a price alert on Nifty 50 at the 200DMA level in your broker app.'
        )
    else:
        checklist_items = [
            'No swing setups today — do not force trades.',
            'Review your existing open positions and tighten stops if needed.',
            'Set a Nifty 200DMA alert and wait for regime to flip RISK-ON.',
        ]

    cl_html = "".join(
        f'<li><div class="cb"></div><div>{item}</div></li>'
        for item in checklist_items
    )

    # Weekly triggers
    if risk_on:
        triggers = [
            ("Nifty posts 3 consecutive closes below 200DMA",
             "Model may flip to RISK-OFF next run — cut swing positions, hold only Tier 1 positionals."),
            ("FII flows turn net negative for 3 days",
             "Watch for momentum reversal. Tighten stops on all open positions."),
            ("Re-run screener every Thursday after 3:30pm",
             "Fresh signals for the following week. Stale signals (>5 days old) lose edge."),
        ]
    else:
        triggers = [
            ("Nifty posts a weekly close above 200DMA",
             "Model flips to RISK-ON → can deploy the held-back 50% capital. Add second half of positional positions."),
            ("FII flows turn net positive for 3 consecutive days",
             "Foreign buying returning → reinforce positional conviction, consider adding to winners."),
            ("21-day vol drops below 20%",
             "Volatility normalising → regime transition likely imminent. Watch for RISK-ON flip."),
            ("Re-run screener Thursday/Friday after 3:30pm",
             f"This report was run on {html.escape(run_date)}. Signals refresh daily — run weekly minimum."),
        ]

    trig_html = "".join(
        f'<div class="trigger-row"><div class="trigger-cond">→ {html.escape(c)}</div>'
        f'<div class="trigger-act">{html.escape(a)}</div></div>'
        for c, a in triggers
    )

    s6 = f"""
<div class="analysis-block">
  <h3>🗓️ Suggested Action Plan</h3>

  <div style="margin-bottom:16px">
    <div class="tier-label" style="color:#4ecf7a">This Weekend — Before the Next Open</div>
    <ul class="checklist">{cl_html}</ul>
  </div>

  <div>
    <div class="tier-label" style="color:#f39c12">Weekly Review Triggers</div>
    {trig_html}
  </div>

  <div class="info-box" style="margin-top:14px;font-size:12px">
    ℹ️ Report generated: <strong>{html.escape(run_date)}</strong> — optimal run time is
    Thursday/Friday after 3:30pm IST for swing signals, Saturday morning for positional review.
    Never run during market hours (momentum signals use same-day close prices).
  </div>
</div>"""

    return f"""
<div class="sections">
  <div class="section">
    <div class="section-header">
      <span class="tag tag-analysis">📋 ANALYSIS</span>
      <h2>AI-Generated Analysis &amp; Action Plan
        <small style="font-weight:400;color:#888">— auto-derived from your screener output</small>
      </h2>
    </div>
  </div>
</div>
<div class="analysis-wrap">
  {s1}{s2}{s3}{s4}{s5}{s6}
</div>"""


# ── table builders ───────────────────────────────────────────────────────────

_SCORE_COLS = {"composite","trend","cs","flows","earnings","composite_score",
               "trend_score","trend_percentile","cs_percentile","earnings_score",
               "flow_score","norm_score","weight"}
_RSI_COLS   = {"rsi_14"}
_FLOW_COLS  = {"netValue","buyValue","sellValue","net_value"}
_BOOL_COLS  = {"above_sma20","above_sma50","above_sma200","golden_cross","ma_aligned",
               "near_52w_high","breakout_20d","macd_hist_pos","volume_expanding","high_delivery"}

def _score_cell(v, mode="score") -> str:
    if pd.isna(v):
        return '<td data-v="-1">—</td>'
    if mode == "score":
        return f'<td data-v="{v:.4f}">{_score_bar(v)}</td>'
    if mode == "rsi":
        colour = _rsi_colour(v)
        return f'<td data-v="{v:.2f}" style="color:{colour};font-weight:600">{v:.1f}</td>'
    if mode == "flow":
        cls = "pos-flow" if v >= 0 else "neg-flow"
        return f'<td data-v="{v:.2f}" class="{cls}">{v:,.0f}</td>'
    if mode == "bool":
        return f'<td data-v="{v}">{_bool_badge(v)}</td>'
    return f'<td data-v="{v}">{_fmt(v)}</td>'

def _df_to_html_table(df: pd.DataFrame, table_id: str) -> str:
    cols = list(df.columns)
    head = "<thead><tr>" + "".join(f"<th>{html.escape(c)}</th>" for c in cols) + "</tr></thead>"
    rows = []
    for _, row in df.iterrows():
        cells = []
        for c in cols:
            v  = row[c]
            cl = c.lower()
            if cl in _SCORE_COLS:    cells.append(_score_cell(v, "score"))
            elif cl in _RSI_COLS:    cells.append(_score_cell(v, "rsi"))
            elif cl in _FLOW_COLS:   cells.append(_score_cell(v, "flow"))
            elif cl in _BOOL_COLS:   cells.append(_score_cell(v, "bool"))
            else:
                dv = f' data-v="{v}"' if isinstance(v, (int,float)) and not pd.isna(v) else ""
                cells.append(f"<td{dv}>{_fmt(v)}</td>")
        rows.append("<tr>" + "".join(cells) + "</tr>")
    body = "<tbody>" + "".join(rows) + "</tbody>"
    return f'<table id="{table_id}">{head}{body}</table>'


# ── Section notes ────────────────────────────────────────────────────────────

_NOTES = {
    "swing":
        "READY-MADE 5-20 DAY PLANS. Buy near 'entry' next morning, place stop-loss immediately. "
        "Sell half at target_1, move stop to breakeven. In RISK-OFF: book full at target_1.",
    "positional":
        "3-6 MONTH HOLDS in established uptrends. Wider stops survive 5-10% pullbacks — exit only on a "
        "WEEKLY close below the 50DMA. Book 1/3 at T1, 1/3 at T2, trail rest with 50DMA.",
    "portfolio":
        "MODEL PORTFOLIO: top-30 composite names, inverse-volatility weighted, max 25% per sector, "
        "scaled down in RISK-OFF. Weight sum < 100% = deliberate cash buffer.",
    "composite":
        "FULL RANKING. composite = 45% cross-sectional + 30% trend + 15% earnings + 10% flows. "
        "Above 80 = strong conviction; 60-80 = decent; below 50 = no edge.",
    "fii":
        "MARKET TAILWIND CHECK (₹ crore, cash market). FII selling absorbed by DII = rangebound; "
        "both selling = step aside; both buying = strong uptrend.",
}


# ── Main entry point ─────────────────────────────────────────────────────────

def write_html(
    path: str,
    summary: pd.DataFrame,
    swing_df: pd.DataFrame,
    pos_df: pd.DataFrame,
    port: pd.DataFrame,
    comp: pd.DataFrame,
    fii_df: Optional[pd.DataFrame] = None,
) -> str:
    """Build and write the self-contained HTML report. Returns the path."""

    def _sv(item: str, default="—"):
        row = summary[summary["Item"] == item]
        return str(row["Value"].iloc[0]) if len(row) else default

    run_date  = _sv("Run date")
    universe  = _sv("Universe")
    eligible  = _sv("Eligible after filters")
    regime_str= _sv("Market regime")
    above_200 = _sv("Nifty above 200DMA")
    vol_21d   = _sv("Index 21d ann vol")
    exposure  = _sv("Exposure multiplier")
    port_size = _sv("Portfolio size")
    gross_wt  = _sv("Gross equity weight")

    risk_on    = regime_str == "RISK-ON"
    regime_cls = "regime-on" if risk_on else "regime-off"
    regime_icon= "🟢" if risk_on else "🔴"

    try:    vol_pct = f"{float(vol_21d)*100:.1f}%"
    except: vol_pct = vol_21d

    def card(label, val, sub=""):
        sub_html = f'<div class="sub">{html.escape(sub)}</div>' if sub else ""
        return (f'<div class="card"><div class="label">{html.escape(label)}</div>'
                f'<div class="val">{html.escape(str(val))}</div>{sub_html}</div>')

    cards_html = "".join([
        card("Universe",          universe),
        card("Eligible stocks",   eligible,    "after liquidity+vol filter"),
        card("Portfolio size",    port_size,   "inverse-vol weighted"),
        card("Equity exposure",
             f"{float(gross_wt)*100:.0f}%" if gross_wt != "—" else "—",
             "rest in cash"),
        card("Index 21d Vol",     vol_pct),
        card("Nifty > 200DMA",   above_200),
        card("Exposure mult.",    exposure,    "1.0 = fully deployed"),
        card("Swing setups",      str(len(swing_df))),
        card("Positional setups", str(len(pos_df))),
    ])

    # Data tables
    swing_cols = [c for c in ["Symbol","Company","Industry","setup","entry","stop_loss",
                               "risk_pct","target_1","target_2","rr_target_1","rr_target_2",
                               "suggested_qty","capital_at_risk","holding","exit_rule",
                               "composite","trend","rsi_14","pct_of_52w_high",
                               "vol_ratio_20_60","delivery_pct"]
                  if c in swing_df.columns]
    swing_tbl = (_df_to_html_table(swing_df[swing_cols].round(4), "tbl-swing")
                 if len(swing_df) else "<p style='color:#888'>No swing setups this run.</p>")

    pos_cols = [c for c in ["Symbol","Company","Industry","setup","entry","stop_loss",
                             "risk_pct","target_1","target_2","rr_target_1","rr_target_2",
                             "suggested_qty","capital_at_risk","holding","exit_rule",
                             "composite","trend","above_sma200","ma_aligned","pct_of_52w_high"]
                if c in pos_df.columns]
    pos_tbl = (_df_to_html_table(pos_df[pos_cols].round(4), "tbl-pos")
               if len(pos_df) else "<p style='color:#888'>No positional setups this run.</p>")

    port_cols = [c for c in ["Symbol","Company","Industry","composite_score","weight"]
                 if c in port.columns]
    port_tbl = _df_to_html_table(port[port_cols].round(4), "tbl-port")

    comp_show = comp.head(60)
    comp_cols = [c for c in ["Symbol","Company","Industry","composite","cs","trend","earnings","flows"]
                 if c in comp_show.columns]
    comp_tbl = _df_to_html_table(comp_show[comp_cols].round(2), "tbl-comp")

    fii_html = ""
    if fii_df is not None and len(fii_df):
        fii_html = f"""
<div class="section">
  <div class="section-header">
    <span class="tag tag-fii">FII / DII</span>
    <h2>Market-Level Flows</h2>
  </div>
  <div class="note">{_NOTES['fii']}</div>
  <div class="tbl-wrap">{_df_to_html_table(fii_df, "tbl-fii")}</div>
</div>"""

    # Generate analysis section from live data
    analysis_html = generate_analysis_html(summary, swing_df, pos_df, port, fii_df)

    body = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>India Momentum Screener — {html.escape(run_date)}</title>
<style>{_CSS}</style>
</head>
<body>

<div class="topbar">
  <div>
    <h1>🇮🇳 India Equity <span>Momentum Screener</span></h1>
    <div class="meta">Run: {html.escape(run_date)} &nbsp;|&nbsp; Universe: {html.escape(universe)}</div>
  </div>
  <div class="{regime_cls}">{regime_icon} Market Regime: {html.escape(regime_str)}
    &nbsp;·&nbsp; Exposure {html.escape(exposure)}×
    &nbsp;·&nbsp; 21d Vol {vol_pct}
  </div>
</div>

<div class="cards">{cards_html}</div>

{analysis_html}

<div class="sections">

  <div class="section">
    <div class="section-header">
      <span class="tag tag-swing">SWING</span>
      <h2>Swing Trade Setups — Full Data Table</h2>
    </div>
    <div class="note">{_NOTES['swing']}</div>
    <div class="tbl-wrap">{swing_tbl}</div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="tag tag-pos">POSITIONAL</span>
      <h2>Positional Trade Setups — Full Data Table</h2>
    </div>
    <div class="note">{_NOTES['positional']}</div>
    <div class="tbl-wrap">{pos_tbl}</div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="tag tag-port">PORTFOLIO</span>
      <h2>Model Portfolio — Top {port_size}</h2>
    </div>
    <div class="note">{_NOTES['portfolio']}</div>
    <div class="tbl-wrap">{port_tbl}</div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="tag tag-rank">RANKS</span>
      <h2>Composite Rankings <small style="font-weight:400;color:#888">(top 60 — click headers to sort)</small></h2>
    </div>
    <div class="note">{_NOTES['composite']}</div>
    <div class="tbl-wrap">{comp_tbl}</div>
  </div>

  {fii_html}

</div>

<footer>
  Generated by 08_EquityMomentum Screener &nbsp;·&nbsp; {html.escape(run_date)}
  &nbsp;·&nbsp; For research only — not investment advice.
</footer>

<script>{_JS}</script>
</body>
</html>"""

    with open(path, "w", encoding="utf-8") as f:
        f.write(body)

    return path
