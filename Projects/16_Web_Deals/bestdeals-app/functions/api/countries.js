/* Cloudflare Pages Function: GET /api/countries */
const COUNTRIES = {
  us: { name: "United States", flag: "🇺🇸" }, uk: { name: "United Kingdom", flag: "🇬🇧" },
  ca: { name: "Canada", flag: "🇨🇦" }, au: { name: "Australia", flag: "🇦🇺" },
  in: { name: "India", flag: "🇮🇳" }, de: { name: "Germany", flag: "🇩🇪" },
  fr: { name: "France", flag: "🇫🇷" }, it: { name: "Italy", flag: "🇮🇹" },
  es: { name: "Spain", flag: "🇪🇸" }, jp: { name: "Japan", flag: "🇯🇵" },
  kr: { name: "South Korea", flag: "🇰🇷" }, cn: { name: "China", flag: "🇨🇳" },
  br: { name: "Brazil", flag: "🇧🇷" }, mx: { name: "Mexico", flag: "🇲🇽" },
  ae: { name: "UAE", flag: "🇦🇪" }
};

export async function onRequestGet() {
  return new Response(JSON.stringify(COUNTRIES), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=86400" }
  });
}
