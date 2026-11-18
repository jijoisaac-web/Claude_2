---
name: trader-news
description: Pull recent headlines (Google News India) and today's price change for NSE tickers, tagging results/earnings, SEBI/RBI/regulatory, block/bulk deals, rating changes and corporate actions. Use before taking any trade in an Indian stock, when the user asks why a stock is moving, or asks about news or results for an NSE/BSE company.
---

# trader-news

```
python3 <this-folder>/news.py RELIANCE TCS --hours 24
```

- Writes `trader/news.json`; the risk gate reads its `event_risk` flag (earnings or regulatory tags).
- Headlines are search results, not verified facts. Summarise in your own words, name the outlet, and say when headlines are thin, old or conflicting. Do not infer a direction from a headline alone.
- Always check: is there a results announcement or board meeting today? If yes, tell the user plainly; gap risk makes stops unreliable.
- For key facts (results dates, corporate actions) point the user to the company's exchange filings on nseindia.com / bseindia.com.
