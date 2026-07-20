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
| r/NRI | Direct audience match | Read the sidebar/rules wiki on the sub itself before posting — rules aren't reliably searchable from outside and change over time |
| r/IndiaInvestments | High-intent, finance-literate | Same — check current rules directly; large finance subs often restrict or ban outright promotional links regardless of quality |
| r/IndiaTax | Tax-specific questions (DTAA, RNOR, TDS) | Good fit for calculator pages |
| Country subs: r/dubai, r/AskMiddleEast, r/AskUK, r/canada | Remittance & return-to-India questions surface here occasionally | These are general Q&A subs, not finance-focused — treat as lower priority and higher risk for unsolicited links; only drop a link when directly and obviously responsive to the question asked |

*Correction: r/developeconomies (previously listed) doesn't appear to exist — dropped from this table.*

### How to post without getting banned
- Reddit retired its old official "90/10" self-promotion guideline; enforcement is now entirely per-subreddit. Read each target sub's rules/wiki directly before posting — don't rely on general Reddit advice or on this document.
- Search each sub for "remittance," "NRE," "RNOR," "DTAA," "return to India" before posting — reply to existing threads first for 1–2 weeks to build karma and mod trust.
- Never lead with the link. Answer the actual question in 3–5 sentences, then: "I built a free calculator for this if it helps — [link]." Let the tool speak for itself.
- One high-effort post/week beats five drive-by link-drops. Best format: "I compared X so you don't have to" using real numbers pulled from your own calculators (mirrors Thread Idea #2 and #3 from the old X plan — those translate well to Reddit).
- Disclose you built the tool. Undisclosed self-promo is the top reason finance subs remove posts or ban accounts — and you can't afford a second platform suspension right now.

### Day-by-day starter checklist

**Day 1 — Account setup**
- If you have any existing Reddit account with real history, use it — brand-new accounts trigger Reddit's spam filter far more aggressively, and links from them get auto-removed even in subs that otherwise allow self-promo.
- If starting fresh: fill in a profile picture and a couple of genuine comments in unrelated subs first (e.g. r/india, r/personalfinance) before touching your target subs. Don't put the site link in your username or bio yet — that alone reads as spam signal to some subs' automod.

**Days 1–3 — Recon**
- Join r/NRI, r/IndiaInvestments, r/IndiaTax, and the country subs. Read each sub's rules (sidebar + "wiki" link if present) and note anything about minimum karma/account age to post — this is set per-sub and automod will simply remove your post silently if you're under it, so check rather than assume.

**Days 1–14 — Warm-up (no links yet)**
- Comment genuinely on ~15–20 existing threads across your target subs and adjacent ones (r/india, r/personalfinanceindia). Answer questions you actually know the answer to — RNOR, NRE vs NRO, remittance timing, DTAA. This builds karma and, more importantly, account age with activity, which is what automod actually checks.
- Skip the link entirely during this phase, even in replies. The payoff is trust, not clicks.

**First post (end of week 2)**
- Pick the lowest-friction sub first — r/IndiaTax or r/NRI tend to be smaller and less strict than r/IndiaInvestments.
- Use the "I compared X so you don't have to" format with real numbers pulled from your calculators.
- If the sub's culture is link-averse, put the tool link in your first reply to your own post rather than the post body — check how other posts in that sub handle outbound links before copying the pattern.
- Don't post the same content to multiple subs on the same day — identical cross-posting reads as bot behavior and can get a new account site-wide shadow-limited, not just removed from one sub.
- Stay active in the comments for the first couple of hours after posting — early replies signal a real person, not a drop-and-run.

**After posting**
- Once GA4 is installed (see Technical SEO section), tag the Reddit link with a UTM (`?utm_source=reddit&utm_medium=social`) so you can see which subreddit and post actually sent traffic, not just upvotes.

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
