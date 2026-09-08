# ⚡ FreeTokens Studio — Prompt-to-Shorts & YouTube AI Suite (v2.2.0)

A dedicated, zero-backend **YouTube Video Studio and Instagram Reels AI Director** powered by **100% free AI tokens** across **OpenRouter**, **Groq Cloud**, and **Google Gemini (AI Studio)**.

Hosted live at: [https://freetokensai.pages.dev/](https://freetokensai.pages.dev/)

---

## 🎬 Dedicated Creator Tools

FreeTokens Studio turns free token quotas into production-ready content:

| Tool | Input | Output & Superpower |
| :--- | :--- | :--- |
| **⚡ Prompt-to-Shorts Creator** *(Flagship)* | Single topic/idea prompt + art style + duration | **Complete 9:16 viral Short video package**: 3s dopamine hook, scene-by-scene visual prompts formatted for **Midjourney/Kling/Runway/Sora**, spoken voiceover for **ElevenLabs**, on-screen captions for CapCut, sound FX cues, and an infinite loop ending. |
| **🎬 Script Generator** | Niche + Topic + Tone + Target Duration | Full-length structured YouTube script with 3 hook variations, retention anchor, dual-column scene breakdown (`[Visual Cue]` & `[Voiceover]`), and conversion CTA. |
| **✂️ Shorts Splitter** | Long script, transcript, or article | Cuts long-form content into **5 standalone viral 30–60s Shorts/Reels** with visual hooks, voiceovers, on-screen text, and loop endings. |
| **🚀 SEO Package** | Video topic / summary + keyword | Generates 5 High-CTR title variations (Search, Curiosity gap, Contrarian, Step-by-Step, Short hook), SEO description with chapters, 15–20 YouTube Studio tags, and viral hashtags. |
| **📅 Batch 30-Day Ideas** | Niche + Audience avatar + Goal | Instant 30-day content calendar structured into 4 weekly content pillars (Discovery, Authority, Debates, Conversion) with daily titles and 3s hook angles. |
| **💬 Free Chat Assistant** | Free-form prompt | Conversational AI companion for brainstorming, script refinement, and research. |

---

## 🚀 Free Providers & Getting Your Free Keys

FreeTokens Studio connects directly to three leading providers with 100% free developer tiers:

### 1. OpenRouter (20+ Community Models & Auto-Router)
- **Free Quota**: All `:free` models + auto router (`openrouter/free`) are completely $0.
- **Get Free Key**: [https://openrouter.ai/keys](https://openrouter.ai/keys)
- **Notable Models**: `openrouter/free` (Auto-load balanced), DeepSeek R1, Llama 3.3 70B, Google Gemma 4.

### 2. Groq Cloud (Ultra-Fast Inference)
- **Free Quota**: Free rate-limited tier on Groq's custom LPU hardware (>500-750 tokens/sec).
- **Get Free Key**: [https://console.groq.com/keys](https://console.groq.com/keys)
- **Notable Models**: `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`, `llama-3.1-8b-instant`.

### 3. Google Gemini (1M – 2M Context Window)
- **Free Quota**: 15 requests/min, 1,000,000 tokens/min, 1,500 requests/day completely free on Google AI Studio.
- **Get Free Key**: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Notable Models**: `gemini-2.0-flash`, `gemini-1.5-pro` (Ideal for splitting massive transcripts in Shorts Splitter).

---

## 🆓 Free Models Matrix

| Provider | Model | Context Window | Best Use Case in Studio |
| :--- | :--- | :--- | :--- |
| **Groq** | `llama-3.3-70b-versatile` | 128k | Blazing-fast Short creation & hook generation |
| **Groq** | `deepseek-r1-distill-llama-70b` | 128k | High-reasoning content calendar & SEO logic |
| **Google** | `gemini-2.0-flash` | 1,000k | Massive transcripts & multi-hour podcast splitting |
| **Google** | `gemini-1.5-pro` | 2,000k | Giant 2M context deep-dive masterclass scripts |
| **OpenRouter** | `openrouter/free` | 200k | Auto-routes to active free models with zero downtime |
| **OpenRouter** | `deepseek/deepseek-r1:free` | 164k | SOTA reasoning with collapsible `<think>` accordions |

---

## ✨ Studio Features in v2.2.0

- **Prompt-to-Shorts AI Director** — Turns any idea into an end-to-end 9:16 Short production pack.
- **AI Visual Prompt Extractor** — Instant one-click copy of scene image/video prompts ready for Midjourney, Runway, Kling, or Sora.
- **Voiceover Extractor** — Instant one-click copy of clean unbroken voiceover lines ready for ElevenLabs.
- **Dedicated Tool Views** — Fast tab navigation between Prompt-to-Shorts, Script Generator, Shorts Splitter, SEO Package, 30-Day Calendar, and Free Chat.
- **Live SSE Token Streaming** — Responses stream live with collapsible `<think>` accordions for reasoning models.
- **Client-Side Security** — Strict Content Security Policy (CSP) set via `_headers` for Cloudflare Pages.
- **Zero Cost, Zero Backend** — Pure static HTML/CSS/JS deployed automatically via GitHub to Cloudflare Pages.

---

## 🏗️ Project Structure

```
21_Chat_FreeTokens/
├── index.html      ← FreeTokens Studio (HTML + CSS + JS, single file)
├── _headers        ← Cloudflare Pages security headers (CSP for OpenRouter, Groq, Gemini)
├── _redirects      ← SPA routing fallback
├── .gitignore      ← Git ignore
└── README.md       ← Studio documentation
```

---

## 🔐 Security Notes

- Your API keys are stored in **browser localStorage** only — never sent to any third-party server, only directly to the AI provider you select (OpenRouter, Groq, or Google).
- The `_headers` file sets strict CSP, X-Frame-Options, and other security headers via Cloudflare.

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

MIT — Free and open source.
