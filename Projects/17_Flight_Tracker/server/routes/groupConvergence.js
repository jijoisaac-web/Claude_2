const express = require('express');
const router = express.Router();
const travelpayouts = require('../lib/travelpayouts');
const { distanceBetween } = require('../lib/geo');
const { rngFor } = require('../lib/demo');

// Travelpayouts gives us a real price + departure time, but not arrival
// time or flight duration -- so we estimate arrival from great-circle
// distance at a typical airliner cruise pace, plus a fixed ground buffer
// for taxi/takeoff/landing/climb. It's an approximation, not a live
// schedule, and is labeled as such in the UI.
const AVG_CRUISE_KMH = 830;
const GROUND_BUFFER_MIN = 45;

function estimateArrival(departureAt, originCode, destCode) {
  const distanceKm = distanceBetween(originCode, destCode);
  const flightMinutes = distanceKm
    ? Math.round((distanceKm / AVG_CRUISE_KMH) * 60) + GROUND_BUFFER_MIN
    : 6 * 60; // fallback guess if either airport isn't in our coordinate table
  const dep = new Date(departureAt);
  return new Date(dep.getTime() + flightMinutes * 60000).toISOString();
}

function demoOffersForOrigin(origin, destination, date) {
  const rng = rngFor(`group:${origin}:${destination}:${date}`);
  const count = 4;
  const basePriceUSD = 280 + Math.round(rng() * 650);
  const offers = [];
  for (let i = 0; i < count; i++) {
    const priceJitter = 1 + (rng() - 0.5) * 0.6 + i * 0.08; // later-looking options cost more on average
    const arrivalHour = Math.floor(rng() * 24);
    const arrivalMinute = Math.floor(rng() * 60);
    const arrival = new Date(`${date}T00:00:00Z`);
    arrival.setUTCHours(arrivalHour, arrivalMinute, 0, 0);
    // some flights arrive "next day" -- reflect that in the data occasionally
    if (rng() > 0.7) arrival.setUTCDate(arrival.getUTCDate() + 1);
    offers.push({
      priceUSD: Math.round(basePriceUSD * priceJitter),
      arrival: arrival.toISOString(),
      carrier: ['EK', 'QR', 'TK', 'AI', 'BA', 'LH', 'SQ'][i % 7],
      demo: true,
    });
  }
  return offers.sort((a, b) => a.priceUSD - b.priceUSD);
}

async function liveOffersForOrigin(origin, destination, date) {
  const anchors = await travelpayouts.getCheapest({ origin, destination, date });
  if (!anchors || !anchors.length) return null;
  return anchors.map((a) => ({
    priceUSD: a.priceUSD,
    arrival: estimateArrival(a.departureAt, origin, destination),
    carrier: a.airline,
    demo: false,
    arrivalEstimated: true,
  }));
}

function cartesianCombos(lists) {
  return lists.reduce(
    (acc, list) => acc.flatMap((combo) => list.map((item) => [...combo, item])),
    [[]]
  );
}

router.post('/', async (req, res) => {
  const { destination, date, windowHours = 6, origins = [] } = req.body || {};
  if (!destination || !date || !Array.isArray(origins) || origins.length < 2) {
    return res.status(400).json({ error: 'destination, date, and at least 2 origins are required' });
  }
  if (origins.length > 6) {
    return res.status(400).json({ error: 'Max 6 origins supported per search.' });
  }

  let anyLive = false;
  const perOrigin = [];
  for (const o of origins) {
    const code = (o.code || o).toUpperCase();
    let offers = travelpayouts.hasCredentials() ? await liveOffersForOrigin(code, destination, date) : null;
    if (offers) anyLive = true;
    else offers = demoOffersForOrigin(code, destination, date);
    perOrigin.push({ code, offers: offers.slice(0, 5).map((of) => ({ ...of, originCode: code })) });
  }

  const combos = cartesianCombos(perOrigin.map((p) => p.offers));

  const scored = combos.map((combo) => {
    const arrivals = combo.map((c) => new Date(c.arrival).getTime());
    const spreadHours = (Math.max(...arrivals) - Math.min(...arrivals)) / 3600000;
    const totalCostUSD = combo.reduce((sum, c) => sum + c.priceUSD, 0);
    return { combo, spreadHours: Math.round(spreadHours * 10) / 10, totalCostUSD };
  });

  const withinWindow = scored.filter((s) => s.spreadHours <= Number(windowHours)).sort((a, b) => a.totalCostUSD - b.totalCostUSD);
  const best = (withinWindow.length ? withinWindow : scored.sort((a, b) => a.spreadHours - b.spreadHours)).slice(0, 5);

  res.json({
    destination,
    date,
    windowHours: Number(windowHours),
    liveData: anyLive,
    matchedWithinWindow: withinWindow.length > 0,
    topCombinations: best,
  });
});

module.exports = router;
