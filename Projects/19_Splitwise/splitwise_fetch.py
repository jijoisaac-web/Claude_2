"""
Splitwise Data Fetcher
======================
This script authenticates with Splitwise via OAuth 2.0 and fetches:
  - Your profile info
  - Groups and balances
  - Recent expenses

Usage:
  python splitwise_fetch.py
"""

import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
import requests

# ── Your credentials ──────────────────────────────────────────────────────────
CONSUMER_KEY    = "2N61qBp6YFaKUIO1ksnIQkNhuvqjCOzYykwReofR"
CONSUMER_SECRET = "IUurkcgCRyVroPdbptAJvAF5xsXDkT9Hssj6eHch"
REDIRECT_URI    = "http://localhost:8080/callback"
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
            self.wfile.write(b"<h2>Authorization successful! You can close this tab.</h2>")
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"<h2>No code received.</h2>")

    def log_message(self, format, *args):
        pass  # suppress server logs


def get_access_token():
    # Step 1: Open browser for authorization
    auth_url = (
        f"https://secure.splitwise.com/oauth/authorize"
        f"?client_id={CONSUMER_KEY}&response_type=code&redirect_uri={REDIRECT_URI}"
    )
    print("\n📂 Opening Splitwise authorization page in your browser...")
    print(f"   If it doesn't open, go to:\n   {auth_url}\n")
    webbrowser.open(auth_url)

    # Step 2: Start local server to capture the callback
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    print("⏳ Waiting for authorization (approve in browser)...")
    server.handle_request()

    if not auth_code:
        print("❌ Authorization failed. No code received.")
        return None

    # Step 3: Exchange code for access token
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
        print(f"❌ Token exchange failed: {token_data}")
        return None

    access_token = token_data["access_token"]
    print(f"✅ Access token obtained!\n")
    return access_token


def splitwise_get(endpoint, token):
    resp = requests.get(
        f"https://secure.splitwise.com/api/v3.0/{endpoint}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return resp.json()


def clean_name(first, last):
    parts = [p for p in [first, last] if p and p.lower() != "none"]
    return " ".join(parts) or "Unknown"


def fetch_expenses_last_90_days(token):
    dated_after = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%dT00:00:00Z")
    all_expenses = []
    offset = 0
    limit  = 100
    print(f"\n📥 Fetching expenses from last 1 year", end="", flush=True)
    while True:
        data = splitwise_get(
            f"get_expenses?limit={limit}&offset={offset}&dated_after={dated_after}", token
        )
        batch = data.get("expenses", [])
        if not batch:
            break
        all_expenses.extend(batch)
        offset += limit
        print(".", end="", flush=True)
        if len(batch) < limit:
            break
    print(f" {len(all_expenses)} found")
    return all_expenses


def fetch_and_display(token):
    # ── Current User ──────────────────────────────────────────────────────────
    me = splitwise_get("get_current_user", token).get("user", {})
    print(f"👤 Logged in as: {clean_name(me.get('first_name'), me.get('last_name'))} ({me.get('email')})\n")

    # ── Groups & Balances ─────────────────────────────────────────────────────
    groups = splitwise_get("get_groups", token).get("groups", [])
    # Build group id → name map
    group_map = {str(g.get("id")): g.get("name", "Unknown") for g in groups}

    print(f"📁 Your Groups ({len(groups)} total):")
    for g in groups:
        members = g.get("members", [])
        debt_str = ""
        for m in members:
            if str(m.get("id")) == str(me.get("id")):
                balances = m.get("balance", [])
                for b in balances:
                    amt = float(b.get("amount", 0))
                    cur = b.get("currency_code", "")
                    if amt > 0:
                        debt_str = f"  → you are owed {cur} {amt:.2f}"
                    elif amt < 0:
                        debt_str = f"  → you owe {cur} {abs(amt):.2f}"
                    else:
                        debt_str = "  → settled up"
        print(f"  • {g.get('name')}{debt_str}")

    # ── Friends & Balances ────────────────────────────────────────────────────
    friends = splitwise_get("get_friends", token).get("friends", [])
    print(f"\n👥 Friends ({len(friends)} total):")
    for f in friends:
        name = clean_name(f.get("first_name", ""), f.get("last_name", ""))
        balances = f.get("balance", [])
        if balances:
            for b in balances:
                amt = float(b.get("amount", 0))
                cur = b.get("currency_code", "")
                if amt > 0:
                    print(f"  • {name}: owes you {cur} {amt:.2f}")
                elif amt < 0:
                    print(f"  • {name}: you owe {cur} {abs(amt):.2f}")
                else:
                    print(f"  • {name}: settled up")
        else:
            print(f"  • {name}: no balance")

    # ── Last 1 Year Expenses ──────────────────────────────────────────────────
    expenses = fetch_expenses_last_90_days(token)
    active   = [e for e in expenses if not e.get("deleted_at")]
    print(f"\n💳 Expenses — Last 1 Year ({len(active)} transactions):\n")
    print(f"  {'Date':<12} {'Type':<12} {'Description':<35} {'Amount':>10}  {'Paid By'}")
    print(f"  {'-'*12} {'-'*12} {'-'*35} {'-'*10}  {'-'*20}")
    for e in active:
        date      = e.get("date", "")[:10]
        desc      = e.get("description", "N/A")
        cost      = e.get("cost", "0")
        cur       = e.get("currency_code", "")
        is_payment = e.get("payment", False)
        txn_type  = "💸 Payment" if is_payment else "🧾 Expense"
        group_id  = str(e.get("group_id") or "")
        group_name = group_map.get(group_id, "Non-group")

        users = e.get("users", [{}])
        payer_name = ""
        for u in users:
            u_info = u.get("user", {})
            if u_info and float(u.get("paid_share", 0)) > 0:
                payer_name = clean_name(u_info.get("first_name", ""), u_info.get("last_name", ""))
                break

        print(f"  {date:<12} {txn_type:<12} {desc[:34]:<35} {cur} {float(cost):>8.2f}  {payer_name}")


if __name__ == "__main__":
    token = get_access_token()
    if token:
        fetch_and_display(token)
