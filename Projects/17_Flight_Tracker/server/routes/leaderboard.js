const express = require('express');
const router = express.Router();
const leaderboard = require('../lib/leaderboard');

router.get('/', (req, res) => {
  const snapshot = leaderboard.getSnapshot();
  if (!snapshot) {
    return res.status(202).json({ updatedAt: null, liveData: false, corridors: [], message: 'Leaderboard is still building -- try again in a moment.' });
  }
  res.json(snapshot);
});

// Manual trigger, handy for testing or for wiring to an external cron if
// you'd rather not rely on the in-process weekly timer.
router.post('/refresh', async (req, res) => {
  try {
    const snapshot = await leaderboard.refresh();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
