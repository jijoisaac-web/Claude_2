#!/usr/bin/env python3
"""Recent headlines + today's move for Indian tickers. Usage: news.py SYMBOL [SYMBOL...] [--hours 24]"""
import argparse, os, re, sys, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
import inmkt as m

TAGS = {
    "earnings": r"\b(results?|q[1-4]|earnings|net profit|revenue|quarterly|guidance)\b",
    "regulatory": r"\b(sebi|rbi|ed raid|probe|penalty|show[- ]cause|fraud|notice|ban|ncl[at]t?)\b",
    "deal": r"\b(block deal|bulk deal|stake|acquisition|merger|buyout|open offer|promoter)\b",
    "rating": r"\b(upgrade|downgrade|target price|initiates coverage|brokerage)\b",
    "corporate": r"\b(dividend|bonus|stock split|buyback|rights issue|fund ?raise|qip)\b",
}


def headlines(query, hours):
    q = '%s when:%dh' % (query, max(1, hours))
    url = "https://news.google.com/rss/search?q=%s&hl=en-IN&gl=IN&ceid=IN:en" % urllib.parse.quote(q)
    xml = urllib.request.urlopen(urllib.request.Request(url, headers=m.UA), timeout=20).read()
    items = []
    for it in ET.fromstring(xml).iter("item"):
        title = (it.findtext("title") or "").strip()
        try:
            when = parsedate_to_datetime(it.findtext("pubDate")).astimezone(m.IST)
        except Exception:
            when = None
        tags = [t for t, rx in TAGS.items() if re.search(rx, title, re.I)]
        items.append({"title": title, "link": it.findtext("link"),
                      "time_ist": when.isoformat() if when else None, "tags": tags})
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("symbols", nargs="+"); ap.add_argument("--hours", type=int, default=24)
    ap.add_argument("--query", help="override search text (default: SYMBOL NSE stock)")
    ap.add_argument("--max", type=int, default=8)
    a = ap.parse_args()
    result = {}
    for s in a.symbols:
        entry = {}
        try:
            _, meta = m.fetch_chart(s, "5m", "1d", cache_minutes=2)
            px, prev = meta.get("regularMarketPrice"), meta.get("chartPreviousClose")
            if px and prev:
                entry["last"], entry["day_change_pct"] = px, round((px - prev) / prev * 100, 2)
        except Exception as e:
            entry["price_error"] = str(e)[:100]
        try:
            items = headlines(a.query or "%s NSE stock" % s.replace(".NS", ""), a.hours)[:a.max]
            entry["headlines"] = items
            alltags = sorted({t for i in items for t in i["tags"]})
            entry["tags"] = alltags
            entry["event_risk"] = bool({"earnings", "regulatory"} & set(alltags))
        except Exception as e:
            entry["news_error"] = str(e)[:100]
        result[s.upper()] = entry
    m.save_json("news.json", {"ts": m.now_ist().isoformat(), "symbols": result})
    m.out(result)


if __name__ == "__main__":
    main()
