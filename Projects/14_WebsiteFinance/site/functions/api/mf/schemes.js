// GET /api/mf/schemes — full AMFI-registered mutual fund scheme list (via mfapi.in),
// tagged with a fund house so the frontend can offer a vendor → scheme cascading picker.
// mfapi.in mirrors AMFI's daily NAVAll.txt as JSON; this endpoint just adds the house tag
// and edge-caches the (fairly large, ~28k scheme) result for a day — NAVs change daily but
// the scheme list itself barely does.

// Curated list of current AMC display names with the schemeName prefixes (including legacy/
// pre-merger brand names) that map to them. Not exhaustive — anything unmatched falls into
// "Other fund houses" so no scheme is silently dropped.
const AMC_LIST = [
  { name: "SBI Mutual Fund", prefixes: ["SBI"] },
  { name: "HDFC Mutual Fund", prefixes: ["HDFC"] },
  { name: "ICICI Prudential Mutual Fund", prefixes: ["ICICI Prudential"] },
  { name: "Nippon India Mutual Fund", prefixes: ["Nippon India", "Reliance"] },
  { name: "Aditya Birla Sun Life Mutual Fund", prefixes: ["Aditya Birla Sun Life", "Birla Sun Life"] },
  { name: "Kotak Mahindra Mutual Fund", prefixes: ["Kotak"] },
  { name: "Axis Mutual Fund", prefixes: ["Axis"] },
  { name: "UTI Mutual Fund", prefixes: ["UTI"] },
  { name: "Mirae Asset Mutual Fund", prefixes: ["Mirae Asset"] },
  { name: "Bandhan Mutual Fund", prefixes: ["Bandhan", "IDFC"] },
  { name: "Franklin Templeton Mutual Fund", prefixes: ["Franklin Templeton", "Franklin India"] },
  { name: "DSP Mutual Fund", prefixes: ["DSP BlackRock", "DSP"] },
  { name: "Tata Mutual Fund", prefixes: ["Tata"] },
  { name: "Sundaram Mutual Fund", prefixes: ["Sundaram"] },
  { name: "Invesco Mutual Fund", prefixes: ["Invesco"] },
  { name: "Edelweiss Mutual Fund", prefixes: ["Edelweiss"] },
  { name: "Canara Robeco Mutual Fund", prefixes: ["Canara Robeco"] },
  { name: "LIC Mutual Fund", prefixes: ["LIC"] },
  { name: "PGIM India Mutual Fund", prefixes: ["PGIM India", "DHFL Pramerica"] },
  { name: "HSBC Mutual Fund", prefixes: ["HSBC", "L&T"] },
  { name: "Motilal Oswal Mutual Fund", prefixes: ["Motilal Oswal"] },
  { name: "PPFAS Mutual Fund", prefixes: ["Parag Parikh", "PPFAS"] },
  { name: "quant Mutual Fund", prefixes: ["quant Mutual", "quant "] },
  { name: "Union Mutual Fund", prefixes: ["Union"] },
  { name: "JM Financial Mutual Fund", prefixes: ["JM Financial"] },
  { name: "Baroda BNP Paribas Mutual Fund", prefixes: ["Baroda BNP Paribas", "Baroda Pioneer", "BNP Paribas", "Baroda"] },
  { name: "IIFL Mutual Fund", prefixes: ["IIFL"] },
  { name: "Groww Mutual Fund", prefixes: ["Groww"] },
  { name: "Navi Mutual Fund", prefixes: ["Navi", "Essel"] },
  { name: "WhiteOak Capital Mutual Fund", prefixes: ["WhiteOak"] },
  { name: "Bank of India Mutual Fund", prefixes: ["Bank of India", "BOI AXA"] },
  { name: "Shriram Mutual Fund", prefixes: ["Shriram"] },
  { name: "Trust Mutual Fund", prefixes: ["Trust"] },
  { name: "Samco Mutual Fund", prefixes: ["Samco"] },
  { name: "Taurus Mutual Fund", prefixes: ["Taurus"] },
  { name: "Quantum Mutual Fund", prefixes: ["Quantum"] },
  { name: "ITI Mutual Fund", prefixes: ["ITI"] },
  { name: "360 ONE Mutual Fund", prefixes: ["360 ONE", "IIFL Wealth"] },
  { name: "Old Bridge Mutual Fund", prefixes: ["Old Bridge"] },
  { name: "Zerodha Mutual Fund", prefixes: ["Zerodha"] },
  { name: "Angel One Mutual Fund", prefixes: ["Angel One"] },
  { name: "Helios Mutual Fund", prefixes: ["Helios"] },
  { name: "Unifi Mutual Fund", prefixes: ["Unifi"] },
  { name: "NJ Mutual Fund", prefixes: ["NJ Mutual"] },
];
// Flatten + sort longest-prefix-first so overlapping prefixes (e.g. "DSP" vs "DSP BlackRock")
// resolve to the more specific match.
const PREFIX_MAP = AMC_LIST.flatMap(a => a.prefixes.map(p => ({ p: p.toLowerCase(), name: a.name })))
  .sort((a, b) => b.p.length - a.p.length);

function fundHouseOf(schemeName) {
  const n = (schemeName || "").toLowerCase();
  for (const { p, name } of PREFIX_MAP) if (n.startsWith(p)) return name;
  return "Other fund houses";
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  try {
    const r = await fetch("https://api.mfapi.in/mf");
    if (!r.ok) throw new Error(`mfapi ${r.status}`);
    const list = await r.json();
    if (!Array.isArray(list) || !list.length) throw new Error("empty scheme list");
    const out = list.map(s => ({
      code: s.schemeCode,
      name: s.schemeName,
      house: fundHouseOf(s.schemeName),
    }));
    const res = new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=86400, max-age=21600",
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
