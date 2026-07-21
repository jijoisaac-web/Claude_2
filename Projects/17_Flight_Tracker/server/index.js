require('dotenv').config();
const path = require('path');
const express = require('express');
const travelpayouts = require('./lib/travelpayouts');
const leaderboard = require('./lib/leaderboard');
const currency = require('./lib/currency');

const trueCostRoute = require('./routes/trueCost');
const priceCalendarRoute = require('./routes/priceCalendar');
const compensationRoute = require('./routes/compensation');
const stopoverRoute = require('./routes/stopover');
const groupConvergenceRoute = require('./routes/groupConvergence');
const leaderboardRoute = require('./routes/leaderboard');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/status', (req, res) => {
  res.json({ liveDataConfigured: travelpayouts.hasCredentials() });
});

app.get('/api/currencies', (req, res) => {
  res.json({ base: currency.fx.base, rates: currency.fx.rates, currencies: currency.listCurrencies() });
});

app.use('/api/true-cost', trueCostRoute);
app.use('/api/price-calendar', priceCalendarRoute);
app.use('/api/compensation', compensationRoute);
app.use('/api/stopover', stopoverRoute);
app.use('/api/group-convergence', groupConvergenceRoute);
app.use('/api/leaderboard', leaderboardRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Farewise running on http://localhost:${PORT}`);
  console.log(
    travelpayouts.hasCredentials()
      ? 'Live mode: Travelpayouts token detected.'
      : 'Demo mode: no TRAVELPAYOUTS_TOKEN found in .env -- using realistic sample data.'
  );
  leaderboard.scheduleWeeklyRefresh();
});
