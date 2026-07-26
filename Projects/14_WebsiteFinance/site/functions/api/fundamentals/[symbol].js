// GET /api/fundamentals/:symbol — Yahoo quoteSummary (needs cookie + crumb handshake)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// *Quarterly modules add ~last 4 quarters, *History (annual) modules add ~last 4 years, of income
// statement + balance sheet line items — used by the Investor Presentations tab's financial-trend
// section (multi-quarter/multi-year ratio trend with good/bad flags) and the profit-consistency /
// debt-reduction cross-reference checks. Coverage for NSE-listed names on Yahoo can be sparse —
// callers must treat empty arrays as "not enough data", not as a real trend of zero.
const MODULES = "price,summaryDetail,defaultKeyStatistics,financialData,assetProfile,incomeStatementHistoryQuarterly,balanceSheetHistoryQuarterly,incomeStatementHistory,balanceSheetHistory";

let session = { cookie: null, crumb: null, ts: 0 };

async function getSession() {
  if (session.crumb && Date.now() - session.ts < 30 * 60 * 1000) return session;
  const r1 = await fetch("https://fc.yahoo.com/", { redirect: "manual", headers: { "user-agent": UA } });
  const cookie = (r1.headers.get("set-cookie") || "").split(";")[0];
  const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "user-agent": UA, cookie },
  });
  const crumb = (await r2.text()).trim();
  if (!crumb || crumb.includes("{")) throw new Error("crumb handshake failed");
  session = { cookie, crumb, ts: Date.now() };
  return session;
}

const raw = (v) => (v && typeof v === "object" ? v.raw ?? null : v ?? null);

export async function onRequestGet({ request, params }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const symbol = encodeURIComponent(decodeURIComponent(params.symbol));
  try {
    const { cookie, crumb } = await getSession();
    const yUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${MODULES}&crumb=${encodeURIComponent(crumb)}`;
    const y = await fetch(yUrl, { headers: { "user-agent": UA, cookie } });
    if (!y.ok) throw new Error(`yahoo ${y.status}`);
    const j = await y.json();
    const r = j.quoteSummary?.result?.[0];
    if (!r) throw new Error("no data");
    const sd = r.summaryDetail || {}, ks = r.defaultKeyStatistics || {},
          fd = r.financialData || {}, ap = r.assetProfile || {}, pr = r.price || {};

    // Income-statement periods (oldest → newest): revenue/netIncome for the profit-consistency read,
    // plus grossProfit/operatingIncome so the financial-trend UI can show margin trends, not just
    // a single net-income line.
    const parseIncomeHistory = list => (list || [])
      .map(q => ({ end: raw(q.endDate), revenue: raw(q.totalRevenue), grossProfit: raw(q.grossProfit),
                   operatingIncome: raw(q.operatingIncome), netIncome: raw(q.netIncome) }))
      .filter(q => q.end != null)
      .sort((a, b) => a.end - b.end);
    // Balance-sheet periods (oldest → newest): debt (long-term + short/current portion) for the
    // debt-reduction read, plus totalAssets/totalStockholderEquity so the financial-trend UI can
    // derive ROE and Debt/Equity per period. Falls back to null (not 0) when Yahoo doesn't carry a
    // line item — never guess a real trend out of missing data.
    const parseBalanceHistory = list => (list || [])
      .map(q => {
        const ltd = raw(q.longTermDebt), sltd = raw(q.shortLongTermDebt);
        const debt = (ltd != null || sltd != null) ? (ltd || 0) + (sltd || 0) : null;
        return { end: raw(q.endDate), debt, totalLiab: raw(q.totalLiab),
                 totalAssets: raw(q.totalAssets), totalStockholderEquity: raw(q.totalStockholderEquity) };
      })
      .filter(q => q.end != null)
      .sort((a, b) => a.end - b.end);

    // Last ~4 quarters and last ~4 years — Yahoo's *Quarterly vs annual (no suffix) history modules.
    const quarterlyIncome = parseIncomeHistory((r.incomeStatementHistoryQuarterly || {}).incomeStatementHistory);
    const quarterlyDebt = parseBalanceHistory((r.balanceSheetHistoryQuarterly || {}).balanceSheetStatements);
    const yearlyIncome = parseIncomeHistory((r.incomeStatementHistory || {}).incomeStatementHistory);
    const yearlyDebt = parseBalanceHistory((r.balanceSheetHistory || {}).balanceSheetStatements);

    const out = {
      symbol: decodeURIComponent(params.symbol),
      name: pr.longName || pr.shortName || null,
      sector: ap.sector || null,
      industry: ap.industry || null,
      price: raw(fd.currentPrice) ?? raw(pr.regularMarketPrice),
      market_cap: raw(pr.marketCap) ?? raw(sd.marketCap),
      pe: raw(sd.trailingPE),
      forward_pe: raw(ks.forwardPE) ?? raw(sd.forwardPE),
      pb: raw(ks.priceToBook),
      eps: raw(ks.trailingEps),
      book_value: raw(ks.bookValue),
      dividend_yield: raw(sd.dividendYield) != null ? raw(sd.dividendYield) * 100 : null,
      roe: raw(fd.returnOnEquity),
      debt_to_equity: raw(fd.debtToEquity),
      profit_margin: raw(fd.profitMargins),
      revenue: raw(fd.totalRevenue),
      revenue_growth: raw(fd.revenueGrowth),
      earnings_growth: raw(fd.earningsGrowth),
      beta: raw(sd.beta),
      high_52w: raw(sd.fiftyTwoWeekHigh),
      low_52w: raw(sd.fiftyTwoWeekLow),
      recommendation: fd.recommendationKey || null,
      target_price: raw(fd.targetMeanPrice),
      // extended fields for the fundamental screener
      ps: raw(sd.priceToSalesTrailing12Months),
      peg: raw(ks.trailingPegRatio) ?? raw(ks.pegRatio),
      ev_ebitda: raw(ks.enterpriseToEbitda),
      enterprise_value: raw(ks.enterpriseValue),
      current_ratio: raw(fd.currentRatio),
      quick_ratio: raw(fd.quickRatio),
      gross_margin: raw(fd.grossMargins),
      operating_margin: raw(fd.operatingMargins),
      roa: raw(fd.returnOnAssets),
      ocf: raw(fd.operatingCashflow),
      fcf: raw(fd.freeCashflow),
      quarterlyIncome,
      quarterlyDebt,
      yearlyIncome,
      yearlyDebt,
    };
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=3600, max-age=600",
        "access-control-allow-origin": "*",
      },
    });
    await cache.put(cacheKey, res.clone());
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}
