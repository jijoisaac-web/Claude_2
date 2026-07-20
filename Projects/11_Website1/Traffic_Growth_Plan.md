# NRI Finance Hub — Traffic Growth Plan (Post-X Suspension)

*Replaces X (Twitter) as the primary social channel. Appeal already filed — revisit X once/if the account is reinstated.*

---

## 1. WHY THIS PIVOT MAKES SENSE

The X strategy leaned on cold outbound posts to build an audience from zero. Reddit and LinkedIn work differently for this niche — NRIs are already asking these exact questions in public forums, so the play is answering real questions with a helpful link, not building a following first.

---

## 2. REDDIT — PRIMARY CHANNEL

### Target subreddits
| Subreddit | Why | Notes |
|---|---|---|
| r/NRI | Direct audience match | Check pinned rules — many finance subs require a minimum account age/karma before linking |
| r/IndiaInvestments | High-intent, finance-literate | Mod team is strict about self-promo; answer first, link second |
| r/developeconomies / r/IndiaTax | Tax-specific questions (DTAA, RNOR, TDS) | Good fit for calculator pages |
| Country subs: r/dubai, r/AskMiddleEast, r/AskUK, r/canada | Remittance & return-to-India questions surface here often | Lower NRI-density, so be selective |

### How to post without getting banned
- Search each sub for "remittance," "NRE," "RNOR," "DTAA," "return to India" before posting — reply to existing threads first for 1–2 weeks to build karma and mod trust.
- Never lead with the link. Answer the actual question in 3–5 sentences, then: "I built a free calculator for this if it helps — [link]." Let the tool speak for itself.
- One high-effort post/week beats five drive-by link-drops. Best format: "I compared X so you don't have to" using real numbers pulled from your own calculators (mirrors Thread Idea #2 and #3 from the old X plan — those translate well to Reddit).
- Disclose you built the tool. Undisclosed self-promo is the #1 reason NRI/finance subs remove posts or ban accounts.

### Starter post ideas (adapt from existing content strategy)
1. "I compared 7 NRI remittance services with live data — here's what actually saves money" (r/NRI, r/IndiaInvestments)
2. "The RNOR window most NRIs don't know about — could save you ₹5L+ in tax" (r/IndiaTax, r/NRI)
3. "Georgia Tech vs Stanford MS — same degree, 4.5x cost difference" (r/gradadmissions, r/NRI)
4. AMA-style: "I built a free NRI finance tools site after getting burned by remittance fees — happy to answer questions"

---

## 3. LINKEDIN — SECONDARY CHANNEL

Skews older and higher-income than X/Reddit — better fit for return-to-India planning, tax residency, and estate/PoA content than flight deals or meme-style stat shocks.

### Approach
- Post from your personal profile, not a company page — LinkedIn's algorithm favors personal accounts by a wide margin, and NRI finance advice reads more credibly from a person.
- Repurpose the "stat shock" posts from the old X plan (remittance losses, MBA ROI, RNOR tax savings) but rewrite in LinkedIn's longer-form, first-person style: "Here's a mistake I see NRIs make constantly..." performs well.
- 2 posts/week is enough to start. LinkedIn rewards consistency over volume.
- Comment on posts from NRI community pages, immigration lawyers, and wealth advisors targeting the diaspora — visibility compounds faster there than cold posting.

---

## 4. TECHNICAL SEO — HIGHEST LEVERAGE, LOWEST EFFORT

These affect organic search, which is a channel suspension can't touch. Found while auditing the site:

1. **No analytics installed.** GA4 or Plausible isn't on any page — you can't currently see which pages or channels drive traffic. This should happen before anything else below, so results are measurable.
2. **Thin schema markup.** Only 2 JSON-LD blocks site-wide. Each calculator (SIP, EMI, TDS, ROI, etc.) is a candidate for `FAQPage` or `SoftwareApplication` schema — real rich-result opportunity given how low-competition these exact-match searches are.
3. **Thin internal linking.** Homepage links to ~8 of 38 pages. Calculators and their related guide articles don't cross-link (e.g., the SIP/SWP calculator should link to the mutual funds guide, and vice versa). This is free authority distribution and it's currently unused.
4. **Confirm Google Search Console submission.** Having sitemap.xml isn't the same as being indexed — Search Console submission is what gets pages crawled and gives you query-level data.

I can implement #2–3 directly in the HTML files if you want to move on this now.

---

## 5. 30-DAY PLAN

| Week | Reddit | LinkedIn | Technical |
|---|---|---|---|
| 1 | Build karma: reply to 10+ existing threads, no links yet | Set up personal profile bio, 1 intro post | Install GA4, submit sitemap to Search Console |
| 2 | First value-post in r/IndiaInvestments or r/NRI | 2 posts (remittance stat, RNOR tip) | Add JSON-LD to top 5 calculator pages |
| 3 | Second value-post + reply campaign in country subs | 2 posts | Add internal links between calculators ↔ guides |
| 4 | Review what resonated, double down on best format | 2 posts, start engaging with NRI advisors/creators | Check Search Console for early indexing/query data |

---

*Drafted to replace the X-only strategy in X_Content_Strategy.md while the account suspension appeal is pending.*
