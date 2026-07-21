const express = require('express');
const router = express.Router();
const corridors = require('../data/corridorSeasonality.json').corridors;
const { getTwelveMonthView } = require('../lib/monthlyFares');

router.get('/corridors', (req, res) => {
  res.json({ corridors });
});

router.get('/', async (req, res) => {
  const { origin, destination, corridorId } = req.query;
  if (!origin || !destination) return res.status(400).json({ error: 'origin and destination are required' });

  const corridor = corridors.find((c) => c.id === corridorId) || corridors.find(
    (c) => c.label.toLowerCase().includes(origin.toLowerCase()) || c.id.startsWith(origin.toUpperCase())
  );

  const { months, liveData } = await getTwelveMonthView({ origin, destination, corridor });
  const cheapestMonth = months.reduce((a, b) => (b.priceUSD < a.priceUSD ? b : a), months[0]);

  res.json({
    origin,
    destination,
    liveData,
    seasonality: corridor || null,
    months,
    cheapestMonth,
  });
});

module.exports = router;
