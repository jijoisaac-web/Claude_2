/* Cloudflare Pages Function: GET /api/search?q=...&country=us
 * Same behavior as the Express route in server.js, adapted for the Workers runtime.
 * API keys come from Cloudflare env vars (Settings → Environment variables):
 *   SERPAPI_KEY, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, BESTBUY_API_KEY */

const COUNTRIES = {
  us: { name: "United States", flag: "🇺🇸", ebay: "EBAY_US", gl: "us", cur: "USD", sym: "$",  bestbuy: true },
  uk: { name: "United Kingdom", flag: "🇬🇧", ebay: "EBAY_GB", gl: "uk", cur: "GBP", sym: "£" },
  ca: { name: "Canada",        flag: "🇨🇦", ebay: "EBAY_CA", gl: "ca", cur: "CAD", sym: "C$" },
  au: { name: "Australia",     flag: "🇦🇺", ebay: "EBAY_AU", gl: "au", cur: "AUD", sym: "A$" },
  in: { name: "India",         flag: "🇮🇳", ebay: "EBAY_IN", gl: "in", cur: "INR", sym: "₹" },
  de: { name: "Germany",       flag: "🇩🇪", ebay: "EBAY_DE", gl: "de", cur: "EUR", sym: "€" },
  fr: { name: "France",        flag: "🇫🇷", ebay: "EBAY_FR", gl: "fr", cur: "EUR", sym: "€" },
  it: { name: "Italy",         flag: "🇮🇹", ebay: "EBAY_IT", gl: "it", cur: "EUR", sym: "€" },
  es: { name: "Spain",         flag: "🇪🇸", ebay: "EBAY_ES", gl: "es", cur: "EUR", sym: "€" },
  jp: { name: "Japan",         flag: "🇯🇵",                  gl: "jp", cur: "JPY", sym: "¥" },
  kr: { name: "South Korea",   flag: "🇰🇷",                  gl: "kr", cur: "KRW", sym: "₩" },
  cn: { name: "China",         flag: "🇨🇳",                  gl: "cn", cur: "CNY", sym: "¥" },
  br: { name: "Brazil",        flag: "🇧🇷",                  gl: "br", cur: "BRL", sym: "R$" },
  mx: { name: "Mexico",        flag: "🇲🇽",                  gl: "mx", cur: "MXN", sym: "MX$" },
  ae: { name: "UAE",           flag: "🇦🇪",                  gl: "ae", cur: "AED", sym: "AED " }
};

const DEMO_FX = { USD: 1, GBP: 0.79, CAD: 1.37, AUD: 1.5, INR: 84, EUR: 0.92, JPY: 155, KRW: 1380, CNY: 7.2, BRL: 5.5, MXN: 18, AED: 3.67 };

/* ---------- eBay ---------- */
let ebayToken = null, ebayTokenExp = 0;
async function getEbayToken(env) {
  if (ebayToken && Date.now() < ebayTokenExp - 60000) return ebayToken;
  const creds = btoa(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`);
  const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${creds}` },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope")
  });
  if (!r.ok) throw new Error("eBay auth failed: " + r.status);
  const j = await r.json();
  ebayToken = j.access_token;
  ebayTokenExp = Date.now() + j.expires_in * 1000;
  return ebayToken;
}

async function searchEbay(env, q, c) {
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET || !c.ebay) return [];
  const token = await getEbayToken(env);
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=8&sort=price&filter=buyingOptions:{FIXED_PRICE}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": c.ebay } });
  if (!r.ok) throw new Error("eBay search failed: " + r.status);
  const j = await r.json();
  return (j.itemSummaries || []).map(it => ({
    source: "eBay", icon: "🔨",
    title: it.title,
    price: parseFloat(it.price?.value),
    currency: it.price?.currency,
    condition: it.condition || "",
    url: it.itemWebUrl,
    image: it.image?.imageUrl || null,
    shipping: it.shippingOptions?.[0]?.shippingCost?.value === "0.00" ? "Free shipping" : ""
  })).filter(x => !isNaN(x.price));
}

/* ---------- Best Buy ---------- */
async function searchBestBuy(env, q, c) {
  if (!env.BESTBUY_API_KEY || !c.bestbuy) return [];
  const terms = q.trim().split(/\s+/).map(w => `search=${encodeURIComponent(w)}`).join("&");
  const url = `https://api.bestbuy.com/v1/products(${terms})?apiKey=${env.BESTBUY_API_KEY}&format=json&sort=salePrice.asc&pageSize=8&show=name,salePrice,regularPrice,url,image,onSale`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Best Buy search failed: " + r.status);
  const j = await r.json();
  return (j.products || []).map(p => ({
    source: "Best Buy", icon: "🔌",
    title: p.name,
    price: p.salePrice,
    originalPrice: p.regularPrice > p.salePrice ? p.regularPrice : null,
    currency: "USD",
    condition: "New",
    url: p.url,
    image: p.image || null,
    shipping: p.onSale ? "On sale" : ""
  })).filter(x => !isNaN(x.price));
}

/* ---------- SerpAPI Google Shopping ---------- */
async function searchSerpApi(env, q, c) {
  if (!env.SERPAPI_KEY) return [];
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q)}&gl=${c.gl}&api_key=${env.SERPAPI_KEY}&num=15`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("SerpAPI failed: " + r.status);
  const j = await r.json();
  return (j.shopping_results || []).map(p => ({
    source: p.source || "Google Shopping", icon: "🛒",
    title: p.title,
    price: p.extracted_price,
    originalPrice: p.extracted_old_price || null,
    currency: c.cur,
    condition: p.second_hand_condition ? "Used" : "New",
    url: p.product_link || p.link,
    image: p.thumbnail || null,
    shipping: p.delivery || ""
  })).filter(x => !isNaN(x.price));
}

/* ---------- demo data ---------- */
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); }

function demoResults(q, c) {
  const h = hashCode(q.toLowerCase());
  const baseUSD = 20 + (h % 980);
  const fx = DEMO_FX[c.cur] || 1;
  const enc = encodeURIComponent(q);
  const stores = [
    { source: "Amazon",    icon: "📦", mult: 1.00, url: `https://www.amazon.com/s?k=${enc}`, ship: "Free with Prime" },
    { source: "eBay",      icon: "🔨", mult: 0.82, url: `https://www.ebay.com/sch/i.html?_nkw=${enc}&_sop=15`, ship: "Free shipping", cond: "Refurbished" },
    { source: "Walmart",   icon: "🏪", mult: 0.94, url: `https://www.walmart.com/search?q=${enc}`, ship: "Free 90-day returns" },
    { source: "Best Buy",  icon: "🔌", mult: 0.97, url: `https://www.bestbuy.com/site/searchpage.jsp?st=${enc}`, ship: "Store pickup" },
    { source: "Target",    icon: "🎯", mult: 1.04, url: `https://www.target.com/s?searchTerm=${enc}`, ship: "Circle 5% off" },
    { source: "AliExpress",icon: "🌏", mult: 0.71, url: `https://www.aliexpress.com/wholesale?SearchText=${enc}`, ship: "Ships in 2–4 weeks" }
  ];
  return stores.map((s, i) => {
    const jitter = 1 + (((h >> (i * 3)) % 13) - 6) / 100;
    const price = Math.round(baseUSD * s.mult * jitter * fx * 100) / 100;
    const orig = i % 2 === 0 ? Math.round(price * 1.25 * 100) / 100 : null;
    return {
      source: s.source, icon: s.icon,
      title: `${q} — best match at ${s.source}`,
      price, originalPrice: orig, currency: c.cur,
      condition: s.cond || "New",
      url: s.url, image: null, shipping: s.ship
    };
  });
}

/* ---------- handler ---------- */
export async function onRequestGet(context) {
  const { request, env } = context;
  const u = new URL(request.url);
  const q = (u.searchParams.get("q") || "").trim();
  const country = COUNTRIES[u.searchParams.get("country")] ? u.searchParams.get("country") : "us";
  const c = COUNTRIES[country];
  if (!q) return json({ error: "Missing query ?q=" }, 400);

  const hasKeys = !!(env.SERPAPI_KEY || env.EBAY_CLIENT_ID || env.BESTBUY_API_KEY);
  let results = [], errors = [];

  if (hasKeys) {
    const settled = await Promise.allSettled([searchSerpApi(env, q, c), searchEbay(env, q, c), searchBestBuy(env, q, c)]);
    settled.forEach(s => s.status === "fulfilled" ? results.push(...s.value) : errors.push(String(s.reason?.message || s.reason)));
  }

  const demo = results.length === 0;
  if (demo) results = demoResults(q, c);

  results.sort((a, b) => a.price - b.price);
  const worst = Math.max(...results.map(r => r.price));
  results.forEach(r => { r.savingsPct = worst > r.price ? Math.round((1 - r.price / worst) * 100) : 0; });

  return json({ query: q, country, currencySymbol: c.sym, demo, errors, best: results[0], results });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
