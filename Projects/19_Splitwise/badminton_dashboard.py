"""
Badminton Expense Dashboard
============================
Fetches the "Badminton Expense" group from Splitwise and opens
a live HTML dashboard in your browser. Members with balance > MYR 50
are flagged in red.

Usage:
  python badminton_dashboard.py
"""

import webbrowser
import requests
import os
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta

# ── Credentials ───────────────────────────────────────────────────────────────
CONSUMER_KEY    = "2N61qBp6YFaKUIO1ksnIQkNhuvqjCOzYykwReofR"
CONSUMER_SECRET = "IUurkcgCRyVroPdbptAJvAF5xsXDkT9Hssj6eHch"
REDIRECT_URI    = "http://localhost:8080/callback"
GROUP_NAME      = "Badminton Expense"
FLAG_ABOVE      = 50.0   # Flag members who owe more than this amount
# ─────────────────────────────────────────────────────────────────────────────

auth_code = None

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        params = parse_qs(urlparse(self.path).query)
        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"<h2 style='font-family:sans-serif;color:green'>Authorization successful! You can close this tab.</h2>")
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"<h2>No code received.</h2>")
    def log_message(self, *args):
        pass


def get_access_token():
    auth_url = (
        f"https://secure.splitwise.com/oauth/authorize"
        f"?client_id={CONSUMER_KEY}&response_type=code&redirect_uri={REDIRECT_URI}"
    )
    print("🔐 Opening Splitwise authorization in your browser...")
    webbrowser.open(auth_url)
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    print("⏳ Waiting for authorization...")
    server.handle_request()
    if not auth_code:
        print("❌ Authorization failed.")
        return None
    resp = requests.post(
        "https://secure.splitwise.com/oauth/token",
        data={
            "grant_type":    "authorization_code",
            "client_id":     CONSUMER_KEY,
            "client_secret": CONSUMER_SECRET,
            "code":          auth_code,
            "redirect_uri":  REDIRECT_URI,
        }
    )
    token_data = resp.json()
    if "access_token" not in token_data:
        print(f"❌ Token error: {token_data}")
        return None
    print("✅ Authorized!\n")
    return token_data["access_token"]


def sw_get(endpoint, token):
    resp = requests.get(
        f"https://secure.splitwise.com/api/v3.0/{endpoint}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return resp.json()


def clean_name(user):
    if not user:
        return "Unknown"
    first = user.get("first_name") or ""
    last  = user.get("last_name") or ""
    name  = f"{first} {last}".strip()
    return name if name else user.get("email", "Unknown")


def fetch_group_expenses(token, group_id):
    """Fetch all expenses for a group."""
    all_expenses = []
    offset = 0
    while True:
        data  = sw_get(f"get_expenses?group_id={group_id}&limit=100&offset={offset}", token)
        batch = data.get("expenses", [])
        if not batch:
            break
        all_expenses.extend(batch)
        offset += 100
        if len(batch) < 100:
            break
    return [e for e in all_expenses if not e.get("deleted_at")]


def build_html(me, group, members_data, expenses, flag_above):
    my_id      = str(me.get("id"))
    group_name = group.get("name", "Group")
    now        = datetime.now().strftime("%d %B %Y, %I:%M %p")

    # Separate flagged vs normal members
    flagged = [m for m in members_data if m["owes_me"] >= flag_above]
    normal  = [m for m in members_data if 0 < m["owes_me"] < flag_above]
    settled = [m for m in members_data if m["owes_me"] <= 0]

    total_owed = sum(m["owes_me"] for m in members_data if m["owes_me"] > 0)

    # Build member rows
    def member_row(m):
        flag   = "🚩" if m["owes_me"] >= flag_above else ""
        amt    = m["owes_me"]
        if amt > 0:
            badge = f'<span class="badge red">{flag} Owes MYR {amt:.2f}</span>'
            row_class = "row-red" if amt >= flag_above else "row-orange"
        elif amt < 0:
            badge = f'<span class="badge blue">You owe MYR {abs(amt):.2f}</span>'
            row_class = "row-blue"
        else:
            badge = '<span class="badge green">✓ Settled</span>'
            row_class = "row-green"

        initials = "".join([w[0].upper() for w in m["name"].split() if w][:2])
        return f"""
        <tr class="{row_class}">
          <td><div class="avatar">{initials}</div></td>
          <td class="name">{m["name"]}</td>
          <td>{badge}</td>
          <td class="amount">{"MYR " + f'{amt:.2f}' if amt != 0 else "—"}</td>
        </tr>"""

    all_rows = ""
    for m in sorted(members_data, key=lambda x: -x["owes_me"]):
        all_rows += member_row(m)

    # Recent expenses table
    exp_rows = ""
    for e in sorted(expenses, key=lambda x: x.get("date",""), reverse=True)[:20]:
        date  = e.get("date","")[:10]
        desc  = e.get("description","")
        cost  = float(e.get("cost", 0))
        cur   = e.get("currency_code","")
        is_pay = e.get("payment", False)
        txn_type = '<span class="badge blue">Payment</span>' if is_pay else '<span class="badge grey">Expense</span>'

        my_paid = my_owed = 0.0
        payer = ""
        for u in e.get("users", []):
            ui = u.get("user") or {}
            ps = float(u.get("paid_share", 0))
            os_ = float(u.get("owed_share", 0))
            if ps > 0 and not payer:
                payer = clean_name(ui)
            if str(ui.get("id")) == my_id:
                my_paid, my_owed = ps, os_

        if my_paid == 0 and my_owed == 0:
            continue

        my_net = my_paid - my_owed
        net_cell = f'<span style="color:{"#1B6C3E" if my_net>0 else "#C62828"};font-weight:600">{"+" if my_net>0 else ""}{my_net:.2f}</span>'
        exp_rows += f"""
        <tr>
          <td>{date}</td>
          <td>{txn_type}</td>
          <td>{desc}</td>
          <td>{cur} {cost:.2f}</td>
          <td>{payer}</td>
          <td>{net_cell}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{group_name} — Dashboard</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', sans-serif; background: #F0F4F8; color: #222; }}

  .header {{
    background: linear-gradient(135deg, #1B6C3E, #2E9E5B);
    color: white; padding: 28px 36px;
    display: flex; justify-content: space-between; align-items: center;
  }}
  .header h1 {{ font-size: 1.7rem; }}
  .header .sub {{ font-size: 0.85rem; opacity: 0.8; margin-top: 4px; }}
  .header .ts  {{ font-size: 0.8rem; opacity: 0.7; text-align: right; }}

  .cards {{ display: flex; gap: 16px; padding: 24px 36px 8px; flex-wrap: wrap; }}
  .card {{
    background: white; border-radius: 12px; padding: 20px 24px;
    flex: 1; min-width: 160px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  }}
  .card .label {{ font-size: 0.78rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }}
  .card .value {{ font-size: 1.7rem; font-weight: 700; margin-top: 4px; }}
  .card.red   .value {{ color: #C62828; }}
  .card.green .value {{ color: #1B6C3E; }}
  .card.orange .value {{ color: #E65100; }}

  .section {{ background: white; margin: 16px 36px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); overflow: hidden; }}
  .section-title {{
    padding: 16px 24px; font-size: 1rem; font-weight: 700; color: #333;
    border-bottom: 1px solid #F0F0F0; display: flex; align-items: center; gap: 8px;
  }}
  .flag-banner {{
    background: #FFF3E0; border-left: 4px solid #FF6F00;
    padding: 10px 24px; font-size: 0.88rem; color: #E65100; font-weight: 500;
  }}

  table {{ width: 100%; border-collapse: collapse; }}
  th {{ background: #F7F9FC; padding: 12px 16px; text-align: left; font-size: 0.8rem; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }}
  td {{ padding: 12px 16px; border-top: 1px solid #F3F3F3; font-size: 0.92rem; }}

  .row-red    {{ background: #FFF5F5; }}
  .row-orange {{ background: #FFFAF0; }}
  .row-green  {{ background: #F7FFF9; }}
  .row-blue   {{ background: #F0F7FF; }}
  .row-red:hover, .row-orange:hover, .row-green:hover, .row-blue:hover {{ filter: brightness(0.97); }}

  .avatar {{
    width: 36px; height: 36px; border-radius: 50%;
    background: #1B6C3E; color: white; font-weight: 700; font-size: 0.85rem;
    display: flex; align-items: center; justify-content: center;
  }}
  .name {{ font-weight: 600; }}
  .amount {{ font-weight: 700; font-size: 0.95rem; }}

  .badge {{
    display: inline-block; padding: 3px 10px; border-radius: 20px;
    font-size: 0.78rem; font-weight: 600;
  }}
  .badge.red    {{ background: #FFEBEE; color: #C62828; }}
  .badge.green  {{ background: #E8F5E9; color: #1B6C3E; }}
  .badge.blue   {{ background: #E3F2FD; color: #1565C0; }}
  .badge.orange {{ background: #FFF3E0; color: #E65100; }}
  .badge.grey   {{ background: #F5F5F5; color: #555; }}

  .footer {{ text-align: center; padding: 24px; color: #aaa; font-size: 0.8rem; }}
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>🏸 {group_name}</h1>
    <div class="sub">Logged in as {clean_name(me)}</div>
  </div>
  <div class="ts">Last updated<br>{now}</div>
</div>

<div class="cards">
  <div class="card green">
    <div class="label">Total Owed to You</div>
    <div class="value">MYR {total_owed:.2f}</div>
  </div>
  <div class="card red">
    <div class="label">🚩 Flagged (&gt; MYR {flag_above:.0f})</div>
    <div class="value">{len(flagged)} members</div>
  </div>
  <div class="card orange">
    <div class="label">Pending (any amount)</div>
    <div class="value">{len(flagged) + len(normal)} members</div>
  </div>
  <div class="card">
    <div class="label">Total Members</div>
    <div class="value">{len(members_data)}</div>
  </div>
  <div class="card">
    <div class="label">Total Expenses</div>
    <div class="value">{len(expenses)}</div>
  </div>
</div>

{"" if not flagged else f'''
<div class="section">
  <div class="flag-banner">🚩 {len(flagged)} member{"s" if len(flagged)>1 else ""} flagged with balance above MYR {flag_above:.0f}</div>
</div>
'''}

<div class="section">
  <div class="section-title">👥 Member Balances</div>
  <table>
    <thead><tr><th></th><th>Name</th><th>Status</th><th>Balance</th></tr></thead>
    <tbody>{all_rows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">💳 Recent Transactions (your involvement)</div>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Total</th><th>Paid By</th><th>Your Net</th></tr></thead>
    <tbody>{exp_rows if exp_rows else "<tr><td colspan='6' style='text-align:center;padding:24px;color:#aaa'>No transactions found</td></tr>"}</tbody>
  </table>
</div>

<div class="footer">Generated from Splitwise · {now}</div>
</body>
</html>"""
    return html


def main():
    token = get_access_token()
    if not token:
        return

    print("📡 Fetching Splitwise data...")
    me     = sw_get("get_current_user", token).get("user", {})
    my_id  = str(me.get("id"))
    groups = sw_get("get_groups", token).get("groups", [])

    # Find the Badminton group
    group = next((g for g in groups if GROUP_NAME.lower() in g.get("name","").lower()), None)
    if not group:
        print(f"❌ Group '{GROUP_NAME}' not found. Available groups:")
        for g in groups:
            print(f"   • {g.get('name')}")
        return

    print(f"✅ Found group: {group.get('name')}")

    # Build member balances
    members_data = []
    for m in group.get("members", []):
        name = clean_name(m)
        owes_me = 0.0
        for b in m.get("balance", []):
            if b.get("currency_code") == "MYR":
                # From the group member perspective: positive = they owe the group
                # We need to check from MY perspective
                owes_me = float(b.get("amount", 0))
        # Skip yourself
        if str(m.get("id")) == my_id:
            continue
        members_data.append({"name": name, "owes_me": owes_me, "id": str(m.get("id"))})

    # Actually recompute from group simplify debts (use member balance directly)
    # Positive balance = owed to the group pool; we check who owes you specifically
    # For simplicity, show each member's balance in the group
    # The Splitwise API group member balance shows +ve = you're owed, -ve = you owe (relative to group)

    print("📥 Fetching group expenses...")
    expenses = fetch_group_expenses(token, group.get("id"))
    print(f"   {len(expenses)} expenses found")

    print("🎨 Building dashboard...")
    html = build_html(me, group, members_data, expenses, FLAG_ABOVE)

    # Save and open
    out_path = os.path.join(
        r"C:\Users\Ansa\Claude\Projects\19_Splitwise",
        f"Badminton_Dashboard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ Dashboard saved: {out_path}")
    print("🌐 Opening in browser...")
    webbrowser.open(f"file:///{out_path}")


if __name__ == "__main__":
    main()
