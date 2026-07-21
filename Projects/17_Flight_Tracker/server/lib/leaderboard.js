// Weekly cheapest-corridor leaderboard -- the site's main distribution
// hook. Ranks the tracked diaspora corridors not by raw price (Dubai-Mumbai
// and Toronto-Hyderabad aren't comparable in absolute rupees) but by how
// far each corridor's *current* cheapest cached month is below *that
// corridor's own* 12-month average. That surfaces "which route has an
// unusually good deal on right now" -- a genuinely shareable, changes-
// every-week signal, built entirely on the same live Travelpayouts data
// the Price Calendar tool already uses.

const fs = require('fs');
const path = require('path');
const corridors = require('../data/corridorSeasonality.json').corridors;
const { getTwelveMonthView } = require('./monthlyFares');

const SNAPSHOT_PATH = path.join(__dirname, '..', 'data', 'leaderboardSnapshot.json');
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // weekly

let memoryCache = null;

function shareText({ label, dealScore, cheapestMonth, cheapestPriceUSD }) {
  const dollars = Math.round(cheapestPriceUSD).toLocaleString('en-US');
  return `${label} is ${dealScore}% below its usual fare right now (~$${dollars} in ${cheapestMonth}) -- checked on Farewise.`;
}

async function computeCorridorEntry(corridor) {
  const { months, liveData } = await getTwelveMonthView({
    origin: corridor.origin,
    destination: corridor.destination,
    corridor,
  });
  const avgPriceUSD = months.reduce((s, m) => s + m.priceUSD, 0) / months.length;
  const cheapest = months.reduce((a, b) => (b.priceUSD < a.priceUSD ? b : a), months[0]);
  const dealScore = Math.round(((avgPriceUSD - cheapest.priceUSD) / avgPriceUSD) * 100);

  const entry = {
    id: corridor.id,
    label: corridor.label,
    origin: corridor.origin,
    destination: corridor.destination,
    cheapestPriceUSD: cheapest.priceUSD,
    cheapestMonth: `${cheapest.month} ${cheapest.year}`,
    avgPriceUSD: Math.round(avgPriceUSD),
    dealScore, // % below this corridor's own average -- higher = better relative deal
    liveData,
  };
  entry.shareText = shareText(entry);
  return entry;
}

async function refresh() {
  const entries = await Promise.all(corridors.map(computeCorridorEntry));
  entries.sort((a, b) => b.dealScore - a.dealScore);
  const snapshot = {
    updatedAt: new Date().toISOString(),
    liveData: entries.some((e) => e.liveData),
    corridors: entries,
  };
  memoryCache = snapshot;
  try {
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error('Leaderboard: failed to persist snapshot:', err.message);
  }
  console.log(`Leaderboard refreshed at ${snapshot.updatedAt} (live=${snapshot.liveData})`);
  return snapshot;
}

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getSnapshot() {
  return memoryCache || loadFromDisk();
}

// Runs an immediate refresh at startup (so the leaderboard is never empty),
// then re-runs on a weekly interval for as long as the process stays up --
// no external cron or scheduler service required.
function scheduleWeeklyRefresh() {
  const existing = loadFromDisk();
  const looksCurrentSchema = existing && existing.corridors && existing.corridors[0] && 'cheapestPriceUSD' in existing.corridors[0];
  const isStale = !existing || !looksCurrentSchema || Date.now() - new Date(existing.updatedAt).getTime() > REFRESH_INTERVAL_MS;
  memoryCache = looksCurrentSchema ? existing : null;

  if (isStale) {
    refresh().catch((err) => console.error('Leaderboard: initial refresh failed:', err.message));
  }
  setInterval(() => {
    refresh().catch((err) => console.error('Leaderboard: scheduled refresh failed:', err.message));
  }, REFRESH_INTERVAL_MS);
}

module.exports = { refresh, getSnapshot, scheduleWeeklyRefresh };
