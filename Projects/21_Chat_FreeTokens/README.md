# ⚡ FreeChat — OpenRouter Free Models

A clean, fast chat interface for all **free-tier models** on OpenRouter. No backend required — runs entirely in the browser.

---

## 🚀 Deploy in 5 Minutes (GitHub + Cloudflare Pages)

### Step 1 — Get your OpenRouter API key

1. Go to [https://openrouter.ai](https://openrouter.ai) and create a free account
2. Navigate to **Keys** → **Create Key**
3. Copy your key (starts with `sk-or-v1-…`)
4. Free-tier usage is completely $0 on all models marked `:free`

---

### Step 2 — Push to GitHub

```bash
# Navigate to project folder
cd C:\Users\Ansa\Claude\Projects\21_Chat_FreeTokens

# Initialize git repo
git init
git add .
git commit -m "Initial commit — FreeChat OpenRouter"

# Create a repo on GitHub (github.com → New repository → name it e.g. freechat)
# Then link and push:
git remote add origin https://github.com/YOUR_USERNAME/freechat.git
git branch -M main
git push -u origin main
```

---

### Step 3 — Deploy on Cloudflare Pages

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) and log in (or sign up free)
2. Click **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Authorize Cloudflare to access your GitHub account
4. Select your **freechat** repository
5. Configure build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (or leave blank)
6. Click **Save and Deploy**

Cloudflare will deploy your site in ~30 seconds. You'll get a free URL like:
```
https://freechat-abc.pages.dev
```

---

### Step 4 — (Optional) Custom Domain

1. In Cloudflare Pages → your project → **Custom Domains**
2. Add your domain (e.g. `chat.yourdomain.com`)
3. Cloudflare handles SSL automatically

---

## 🔄 Update the Site

Every push to `main` triggers an automatic re-deploy:

```bash
git add .
git commit -m "Update"
git push
```

---

## 🆓 Free Models Included

| Model | Context | Best For |
|-------|---------|----------|
| DeepSeek R1 | 163k | Reasoning, math, code |
| DeepSeek V3 Chat | 163k | General chat, writing |
| Llama 3.3 70B | 131k | General purpose |
| QwQ 32B | 131k | Reasoning, analysis |
| Qwen 2.5 72B | 131k | Multilingual, code |
| Gemma 3 27B | 131k | Instruction following |
| Devstral Small | 131k | Code generation |
| Mistral 7B | 32k | Fast, lightweight |
| Phi-4 Reasoning | 32k | Structured reasoning |
| Hermes 3 405B | 131k | Long context tasks |

Full live list is fetched from the OpenRouter API when you enter your key.

---

## ✨ Features

- **Streaming responses** — text appears word by word in real time
- **20+ free models** — fetched live from OpenRouter, with local fallback list
- **Editable system prompt** — customize the assistant's personality/role
- **Temperature & max tokens** — tune per-request
- **Session stats** — message count, estimated token usage
- **Export chat** — save conversation as Markdown
- **Regenerate** — re-run the last assistant response
- **Mobile responsive** — works on phone with slide-out sidebar
- **No backend** — pure static site, API key stored in browser localStorage

---

## 🏗️ Project Structure

```
21_Chat_FreeTokens/
├── index.html      ← Full app (HTML + CSS + JS, single file)
├── _headers        ← Cloudflare Pages security headers
├── _redirects      ← SPA routing fallback
├── .gitignore      ← Git ignore
└── README.md       ← This file
```

---

## 🔐 Security Notes

- Your API key is stored in **browser localStorage** only — never sent anywhere except OpenRouter
- The `_headers` file sets strict CSP, X-Frame-Options, and other security headers via Cloudflare
- For a team setup, consider using Cloudflare Workers to proxy API calls and keep the key server-side

---

## 🛠️ Local Development

No build step needed. Just open the file:

```bash
# Windows
start index.html

# Or use any local server
npx serve .
```

---

## 📄 License

MIT — do whatever you want with it.
