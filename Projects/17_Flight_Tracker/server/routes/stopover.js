const express = require('express');
const router = express.Router();
const programs = require('../data/stopoverPrograms.json').programs;
const { airportInfo } = require('../lib/geo');
const { region } = require('../lib/region');

function relevantHubs(originRegion, destRegion) {
  // Between the West and South Asia: Gulf hubs (Doha/Dubai/Abu Dhabi) and Istanbul all make sense.
  if ((originRegion === 'west' && destRegion === 'south_asia') || (originRegion === 'south_asia' && destRegion === 'west')) {
    return ['Qatar Airways', 'Turkish Airlines', 'Emirates', 'Etihad Airways'];
  }
  // Between Oceania and the West/South Asia: Singapore and Gulf carriers are the classic stopovers.
  if (originRegion === 'oceania' || destRegion === 'oceania') {
    return ['Singapore Airlines', 'Emirates', 'Qatar Airways', 'Etihad Airways'];
  }
  if (originRegion === 'east_asia' || destRegion === 'east_asia') {
    return ['Singapore Airlines'];
  }
  // Default: show all, let the user judge.
  return programs.map((p) => p.airline);
}

function layoverBucket(layoverHours) {
  if (layoverHours <= 10) return 'shortLayover';
  if (layoverHours <= 30) return 'midLayover';
  return 'longLayover';
}

router.get('/', (req, res) => {
  const { origin, destination, layoverHours = 24 } = req.query;
  if (!origin || !destination) return res.status(400).json({ error: 'origin and destination are required' });

  const originInfo = airportInfo(origin);
  const destInfo = airportInfo(destination);
  const originRegion = originInfo ? region(originInfo.country) : 'other';
  const destRegion = destInfo ? region(destInfo.country) : 'other';

  const suggestedAirlines = new Set(relevantHubs(originRegion, destRegion));
  const bucket = layoverBucket(Number(layoverHours));

  const results = programs.map((p) => ({
    ...p,
    recommended: suggestedAirlines.has(p.airline),
    itineraryForYourLayover: p[bucket],
  }));

  results.sort((a, b) => (b.recommended === a.recommended ? 0 : b.recommended ? 1 : -1));

  res.json({ origin, destination, layoverHours: Number(layoverHours), results });
});

module.exports = router;
