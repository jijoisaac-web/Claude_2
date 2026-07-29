"""
One-time Token Helper
======================
Run this once to get your Splitwise access token.
Paste the token into Cloudflare using:
  wrangler secret put SPLITWISE_TOKEN
"""

import webbrowser
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

CONSUMER_KEY    = "2N61qBp6YFaKUIO1ksnIQkNhuvqjCOzYykwReofR"
CONSUMER_SECRET = "IUurkcgCRyVroPdbptAJvAF5xsXDkT9Hssj6eHch"
REDIRECT_URI    = "http://localhost:8080/callback"

auth_code = None

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        params = parse_qs(urlparse(self.path).query)
        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"<h2 style='font-family:sans-serif;color:green'>Done! Copy the token from your terminal.</h2>")
    def log_message(self, *args):
        pass

auth_url = (
    f"https://secure.splitwise.com/oauth/authorize"
    f"?client_id={CONSUMER_KEY}&response_type=code&redirect_uri={REDIRECT_URI}"
)
print("\n🔐 Opening Splitwise authorization page...")
webbrowser.open(auth_url)
HTTPServer(("localhost", 8080), CallbackHandler).handle_request()

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
token = resp.json().get("access_token")
if not token:
    print(f"❌ Failed to get token: {resp.json()}")
    exit(1)

# Verify it works
test = requests.get(
    "https://secure.splitwise.com/api/v3.0/get_current_user",
    headers={"Authorization": f"Bearer {token}"}
).json()

if "user" not in test:
    print(f"❌ Token test failed: {test}")
    exit(1)

print(f"\n✅ Token verified! Logged in as: {test['user'].get('first_name')} ({test['user'].get('email')})")
print(f"\n📋 Your Splitwise Access Token (copy everything between the lines):")
print("-" * 60)
print(token)
print("-" * 60)
print("\nNow run:  wrangler secret put SPLITWISE_TOKEN")
print("Paste ONLY the token above (no spaces, no quotes) when prompted.\n")
