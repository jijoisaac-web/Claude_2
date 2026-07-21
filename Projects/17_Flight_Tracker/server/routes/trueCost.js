const express = require('express');
const router = express.Router();
const travelpayouts = require('../lib/travelpayouts');
const feesData = require('../data/globalAirlineFees.json');
const airlineNames = require('../data/airlineCountry.json'); // secondary name lookup for real anchors we don't have fees for
const { region } = require('../lib/region');
const { airportInfo } = require('../lib/geo');
const { rngFor } = require('../lib/demo');

const feeByCode = Object.fromEntries(feesData.airlines.map((a) => [a.code, a]));

// Cap on how many *estimated* rows we add for comparison. Kept small and
// separated from the real anchors in the API response (see below) so the
// tool never looks like it's presenting guesses as if they were confirmed
// prices -- padding a table with 7 "est." rows next to 1 real one reads as
// untrustworthy even though the 1 real row is genuinely real.
const MAX_ESTIMATED_WITH_LIVE_DATA = 3;
const MAX_ESTIMATED_DEMO_ONLY = 5;

function feesFor(code, fallbackName) {
  if (feeByCode[code]) return feeByCode[code];
  const knownName = (airlineNames[code] && airlineNames[code].name) || fallbackName || code;
  return { code, name: knownName, ...feesData.genericFallback };
}

// Picks a plausible comparison set of airlines for this route when we
// don't have (or don't need to rely solely on) real anchors -- based on
// which broad regions the origin/destination sit in. This replaces an
// earlier version of this tool that always compared against a fixed list
// of Indian carriers regardless of the route, which was wrong for routes
// that have nothing to do with India.
function candidateCarriersForRoute(origin, destination) {
  const originInfo = airportInfo(origin);
  const destInfo = airportInfo(destination);
  const originRegion = originInfo ? region(originInfo.country) : 'other';
  const destRegion = destInfo ? region(destInfo.country) : 'other';

  let candidates = feesData.airlines.filter(
    (a) => a.regions.includes(originRegion) || a.regions.includes(destRegion)
  );
  if (candidates.length < 3) {
    // Route doesn't match our region tags well enough -- fall back to a
    // deterministic sample across the whole roster rather than showing
    // nothing.
    const rng = rngFor(`truecost-candidates:${origin}:${destination}`);
    candidates = [...feesData.airlines].sort(() => rng() - 0.5).slice(0, 6);
  }
  return candidates;
}

function computeTotal({ baseFareUSD, fees, bags, seatPref, meal }) {
  let addOnsUSD = 0;
  const breakdown = [];
  if (bags > 0 && !fees.includedByDefault.bag) {
    const perBag = fees.checkedBagUSD;
    const bagTotal = perBag * bags;
    addOnsUSD += bagTotal;
    breakdown.push({ item: `${bags} checked bag(s)`, amountUSD: bagTotal });
  } else if (bags > 0) {
    breakdown.push({ item: `${bags} checked bag(s) - included in fare`, amountUSD: 0 });
  }
  if (seatPref && seatPref !== 'none') {
    const seatFee = fees.includedByDefault.seat ? 0 : seatPref === 'xl' ? fees.seatXLUSD : fees.seatStandardUSD;
    addOnsUSD += seatFee;
    breakdown.push({ item: `Seat selection (${seatPref})`, amountUSD: seatFee });
  }
  if (meal) {
    const mealFee = fees.includedByDefault.meal ? 0 : fees.mealUSD;
    addOnsUSD += mealFee;
    breakdown.push({ item: 'Meal', amountUSD: mealFee });
  }
  return { totalUSD: Math.round(baseFareUSD + addOnsUSD), addOnsUSD: Math.round(addOnsUSD), breakdown };
}

function buildRow(code, baseFareUSD, extra, bags, seatPref, meal) {
  const fees = feesFor(code);
  const cost = computeTotal({ baseFareUSD, fees, bags, seatPref, meal });
  return { airline: fees.name, carrierCode: fees.code, baseFareUSD, ...extra, ...cost };
}

router.post('/', async (req, res) => {
  const { origin, destination, date, bags = 1, seatPref = 'standard', meal = false } = req.body || {};
  if (!origin || !destination || !date) {
    return res.status(400).json({ error: 'origin, destination and date are required' });
  }
  const bagsNum = Number(bags);

  let realAnchors = null;
  if (travelpayouts.hasCredentials()) {
    realAnchors = await travelpayouts.getCheapest({ origin, destination, date });
  }
  const liveData = Boolean(realAnchors && realAnchors.length);
  const anchorCodes = new Set((realAnchors || []).map((a) => a.airline));
  const anchorAvg = liveData ? realAnchors.reduce((s, a) => s + a.priceUSD, 0) / realAnchors.length : null;

  // Confirmed rows: exactly what Travelpayouts actually returned for this
  // route/date -- never padded, never guessed.
  const confirmed = (realAnchors || []).map((a) =>
    buildRow(a.airline, a.priceUSD, { live: true, monthApprox: a.monthApprox }, bagsNum, seatPref, !!meal)
  );

  // Estimated rows: a small, clearly-separate set of region-appropriate
  // carriers for context, capped low on purpose (see constants above).
  const rng = rngFor(`truecost:${origin}:${destination}:${date}`);
  const basePrice = anchorAvg || 250 + Math.round(rng() * 500);
  const cap = liveData ? MAX_ESTIMATED_WITH_LIVE_DATA : MAX_ESTIMATED_DEMO_ONLY;
  const estimatedCandidates = candidateCarriersForRoute(origin, destination).filter((c) => !anchorCodes.has(c.code));

  const estimated = estimatedCandidates.slice(0, cap).map((fees, i) => {
    const jitter = 1 + (rng() - 0.5) * 0.5;
    const styleAdj = fees.style === 'full-service' ? 1.25 : fees.style === 'ultra-low-cost' ? 0.85 : 1;
    const baseFareUSD = Math.round(basePrice * jitter * styleAdj * (1 - i * 0.02));
    return buildRow(fees.code, baseFareUSD, { live: false }, bagsNum, seatPref, !!meal);
  });

  confirmed.sort((a, b) => a.totalUSD - b.totalUSD);
  estimated.sort((a, b) => a.totalUSD - b.totalUSD);

  res.json({
    origin,
    destination,
    date,
    bags: bagsNum,
    seatPref,
    meal: !!meal,
    liveData,
    confirmed,
    estimated,
  });
});

module.exports = router;
