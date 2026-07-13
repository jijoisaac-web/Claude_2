/* JobScout core — real job listings, ranked transparently.
 *
 * Design principles (carried over from lessons learned building ReviewRank):
 *  1. Never show a fabricated number next to a real, verifiable thing. We do
 *     not have real applicant-count/competition data from any free source,
 *     so we do NOT claim "hidden gem / low competition" — only what we can
 *     actually measure: how fresh a posting is, and how well it matches
 *     what you searched for.
 *  2. No sponsored placement, no pay-to-rank. Score is a plain formula,
 *     documented below, applied identically to every listing.
 *  3. Cache the raw pool (Arbeitnow has no server-side search — it's a full
 *     feed), then filter/score per request in memory. Keeps it fast without
 *     re-fetching on every search. */
const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });
const TTL_MS = (parseFloat(process.env.CACHE_TTL_HOURS) || 6) * 3600 * 1000;
const POOL_CACHE_FILE = path.join(CACHE_DIR, "arbeitnow-pool.json");

function cacheReadPool() {
  try { return JSON.parse(fs.readFileSync(POOL_CACHE_FILE, "utf8")); }
  catch (e) { return null; }
}
function cacheWritePool(jobs) {
  try { fs.writeFileSync(POOL_CACHE_FILE, JSON.stringify({ ts: Date.now(), jobs })); }
  catch (e) { /* best-effort */ }
}

/* ---------------- Arbeitnow: public, zero-key, real ATS-sourced listings ----------------
 * Docs: https://www.arbeitnow.com/blog/job-board-api
 * Focused on Germany/Austria/Switzerland + remote-Europe roles. No search
 * params on the API itself, so we pull a handful of pages and filter locally. */
async function fetchArbeitnowPage(page) {
  const url = `https://www.arbeitnow.com/api/job-board-api${page > 1 ? `?page=${page}` : ""}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Arbeitnow fetch failed: " + r.status);
  const j = await r.json();
  return Array.isArray(j.data) ? j.data : [];
}

function normalizeArbeitnow(raw) {
  return {
    id: "an_" + raw.slug,
    source: "Arbeitnow",
    title: raw.title || "Untitled role",
    company: raw.company_name || "Unknown company",
    location: raw.location || (raw.remote ? "Remote" : ""),
    remote: !!raw.remote,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    jobTypes: Array.isArray(raw.job_types) ? raw.job_types : [],
    postedAt: raw.created_at ? raw.created_at * 1000 : Date.now(),
    url: raw.url || "https://www.arbeitnow.com/",
    description: (raw.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)
  };
}

async function fetchArbeitnowPool() {
  const pages = await Promise.allSettled([1, 2, 3].map(fetchArbeitnowPage));
  const byId = new Map();
  for (const p of pages) {
    if (p.status !== "fulfilled") continue;
    for (const raw of p.value) {
      const job = normalizeArbeitnow(raw);
      if (!byId.has(job.id)) byId.set(job.id, job);
    }
  }
  return [...byId.values()];
}

/* ---------------- Adzuna: optional, broadens coverage beyond DACH/remote-EU ----------------
 * Free signup (email only) at https://developer.adzuna.com/signup — no phone/card.
 * Returns [] until ADZUNA_APP_ID / ADZUNA_APP_KEY are set, so the app runs fully
 * live on Arbeitnow alone with zero configuration. */
async function fetchAdzunaResults(q, country, location) {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const cc = (country || "us").toLowerCase();
  const params = new URLSearchParams({
    app_id: id, app_key: key, results_per_page: "20",
    what: q || "", where: location || "", "content-type": "application/json"
  });
  const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?${params.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Adzuna fetch failed: " + r.status);
  const j = await r.json();
  return (j.results || []).map(d => ({
    id: "az_" + d.id,
    source: "Adzuna",
    title: d.title ? d.title.replace(/<[^>]+>/g, "") : "Untitled role",
    company: d.company?.display_name || "Unknown company",
    location: d.location?.display_name || "",
    remote: /remote/i.test(d.title || "") || /remote/i.test(d.location?.display_name || ""),
    tags: d.category?.label ? [d.category.label] : [],
    jobTypes: d.contract_time ? [d.contract_time] : [],
    postedAt: d.created ? new Date(d.created).getTime() : Date.now(),
    url: d.redirect_url || "#",
    description: (d.description || "").replace(/\s+/g, " ").trim().slice(0, 400),
    salaryMin: d.salary_min || null,
    salaryMax: d.salary_max || null
  }));
}

async function getPool(force = false) {
  const cached = cacheReadPool();
  const fresh = cached && (Date.now() - cached.ts) < TTL_MS;
  if (fresh && !force) return { jobs: cached.jobs, cached: true, updatedAt: cached.ts };
  try {
    const jobs = await fetchArbeitnowPool();
    if (jobs.length > 0) {
      cacheWritePool(jobs);
      return { jobs, cached: false, updatedAt: Date.now() };
    }
    throw new Error("empty pool");
  } catch (e) {
    if (cached) return { jobs: cached.jobs, cached: true, stale: true, updatedAt: cached.ts };
    return { jobs: [], cached: false, updatedAt: Date.now() };
  }
}

/* ---------------- scoring (documented, applied identically to every listing) ----------------
 * opportunityScore = 0.55 * freshness + 0.45 * relevance
 *   freshness: 100 at 0 days old, decays linearly to 0 at 21 days old
 *   relevance: 100 if the query matches the title, 70 if it matches a tag,
 *              40 if it matches the description, 0 otherwise. If no query
 *              was given (browsing), relevance is neutral (100) for everyone. */
function scoreJob(job, q) {
  const daysOld = Math.max(0, (Date.now() - job.postedAt) / 86400000);
  const freshness = Math.max(0, Math.round(100 - daysOld * (100 / 21)));
  let relevance = 100;
  if (q) {
    const needle = q.toLowerCase();
    const inTitle = job.title.toLowerCase().includes(needle);
    const inTags = job.tags.some(t => t.toLowerCase().includes(needle));
    const inDesc = job.description.toLowerCase().includes(needle);
    relevance = inTitle ? 100 : inTags ? 70 : inDesc ? 40 : 0;
  }
  return Math.round(freshness * 0.55 + relevance * 0.45);
}

async function performSearch({ q = "", location = "", remoteOnly = false, country = "de", force = false }) {
  q = (q || "").trim();
  location = (location || "").trim();

  const pool = await getPool(force);
  let live = pool.jobs;

  // Optionally widen coverage with Adzuna if keys are configured.
  let adzunaResults = [], adzunaError = null;
  try { adzunaResults = await fetchAdzunaResults(q, country, location); }
  catch (e) { adzunaError = String(e.message || e); }

  const combined = [...live, ...adzunaResults];

  const needle = location.toLowerCase();
  let filtered = combined.filter(job => {
    if (remoteOnly && !job.remote) return false;
    if (needle && !job.remote && !job.location.toLowerCase().includes(needle)) return false;
    if (q) {
      const ql = q.toLowerCase();
      const matches = job.title.toLowerCase().includes(ql)
        || job.tags.some(t => t.toLowerCase().includes(ql))
        || job.description.toLowerCase().includes(ql);
      if (!matches) return false;
    }
    return true;
  });

  filtered.forEach(job => { job.score = scoreJob(job, q); });
  filtered.sort((a, b) => b.score - a.score || b.postedAt - a.postedAt);
  filtered = filtered.slice(0, 24).map(job => {
    const hoursOld = (Date.now() - job.postedAt) / 3600000;
    return { ...job, isNew: hoursOld < 48 };
  });

  return {
    query: q, location, remoteOnly,
    results: filtered,
    poolSize: combined.length,
    cached: !!pool.cached,
    stale: !!pool.stale,
    updatedAt: pool.updatedAt,
    adzunaEnabled: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    adzunaError
  };
}

module.exports = { performSearch, getPool, TTL_MS };
