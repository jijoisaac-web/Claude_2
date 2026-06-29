# Malaysia Budget Tracker

A single-file web app for tracking monthly income vs expenses, with paid/unpaid status and MYR→INR conversion. Data is saved in your browser's localStorage.

## Features
- Expected vs Actual amounts per category per month
- Paid checkbox — green highlights when marked paid
- Live summary: Total Income, Expenses, Cash Balance, Paid, Pending
- MYR → INR conversion with adjustable rate
- Add / delete categories
- Export to CSV
- Multi-year support
- Works offline — no backend, no database

---

## Deploy to Cloudflare Pages via GitHub

### Step 1 — Push to GitHub

```bash
# In this folder:
git init
git add .
git commit -m "Initial budget tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/malaysia-budget.git
git push -u origin main
```

### Step 2 — Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **Create** → **Pages** → **Connect to Git**
3. Select your GitHub repo
4. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave blank)*
   - **Build output directory**: `/` (or leave blank)
5. Click **Save and Deploy**

Cloudflare will give you a `*.pages.dev` URL in ~30 seconds.

### Step 3 — Auto-deploy on updates

Every `git push` to `main` automatically redeploys. Just push and your live site updates.

---

## Local development

Open `index.html` directly in your browser — no server needed.
