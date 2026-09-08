# ⚡ FreeTokens AI — Multi-Provider Free AI Chat (v2.0.0)

A clean, fast, zero-backend chat interface for **free-tier models** across **OpenRouter**, **Groq Cloud**, and **Google Gemini (AI Studio)**. Runs 100% in the client's browser with no server needed.

Hosted live at: [https://freetokensai.pages.dev/](https://freetokensai.pages.dev/)

---

## 🚀 Free Providers & Getting Your Free Keys

FreeTokens AI supports three leading AI providers with 100% free tiers:

### 1. OpenRouter (20+ Community Models & Auto-Router)
- **Free Quota**: All `:free` models + auto router (`openrouter/free`) are completely $0.
- **Get Free Key**: [https://openrouter.ai/keys](https://openrouter.ai/keys)
- **Top Models**: `openrouter/free` (Auto-load balanced), DeepSeek R1, Llama 3.3 70B, Qwen 2.5 72B, Google Gemma 4.

### 2. Groq Cloud (Ultra-Fast Inference)
- **Free Quota**: Free rate-limited tier on Groq's custom LPU hardware (>500-750 tokens/sec).
- **Get Free Key**: [https://console.groq.com/keys](https://console.groq.com/keys)
- **Top Models**: `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`.

### 3. Google Gemini (1M – 2M Context Window)
- **Free Quota**: 15 requests/min, 1,000,000 tokens/min, 1,500 requests/day completely free on Google AI Studio.
- **Get Free Key**: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Top Models**: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-pro`, `gemini-2.0-flash-thinking-exp`.

---

## 🆓 Free Models Matrix

| Provider | Model | Context | Key Strength |
| :--- | :--- | :--- | :--- |
| **OpenRouter** | `openrouter/free` | 200k | Auto-routes to available free model with zero downtime |
| **OpenRouter** | DeepSeek R1 | 164k | SOTA reasoning, math, and code synthesis |
| **OpenRouter** | DeepSeek V3 Chat | 164k | Fast general purpose coding and assistant chat |
| **OpenRouter** | Llama 3.3 70B Instruct | 131k | High capability open model |
| **OpenRouter** | Google Gemma 4 31B | 262k | Latest open weights Google release |
| **Groq** | Llama 3.3 70B Versatile | 128k | Near-instant generation (>300 tok/s) |
| **Groq** | DeepSeek R1 Distill 70B | 128k | Ultra-fast distilled reasoning |
| **Groq** | Llama 3.1 8B Instant | 128k | Extreme speeds (>750 tok/s) |
| **Google** | Gemini 2.0 Flash | 1,000k | Massive 1M context, next-gen multimodal speed |
| **Google** | Gemini 1.5 Pro | 2,000k | Giant 2M context, complex reasoning |

---

## ✨ Features in v2.0.0

- **Visible Version Badge (`v2.0.0`)** — Displayed in the sidebar logo, topbar, and footer.
- **Multi-Provider Selector** — Effortlessly switch between OpenRouter, Groq, and Google Gemini with independent key persistence in `localStorage`.
- **Auto Model Discovery** — OpenRouter models load dynamically on initial page load without requiring an API key.
- **Collapsible Thinking Process (`<think>`)** — Reasoning chains from DeepSeek R1 and Gemini Thinking models render neatly inside expandable drawers.
- **Streaming Responses** — Real-time Server-Sent Events (SSE) token streaming across all providers.
- **Rate Limit Alerts** — Clear feedback if free-tier rate limits (HTTP 429) are encountered, with advice to switch models or wait.
- **Markdown & Sanitization** — Full Markdown, tables, and code snippets rendered securely via Marked.js and DOMPurify.
- **Session Stats & Markdown Export** — Track message counts, estimated tokens, and export conversations.

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

- Your API key is stored in **browser localStorage** only — never sent to any third-party server, only directly to the AI provider you select (OpenRouter, Groq, or Google)
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
