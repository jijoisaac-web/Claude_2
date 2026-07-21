// Shared "12-month fare view" builder, used by both the Price Calendar
// tool and the corridor leaderboard so they stay perfectly consistent --
// real Travelpayouts data where available, seasonality-shaped estimates
// filling any gaps. All prices are USD internally; convert at render time.

const travelpayouts = require('./travelpayouts');
const { rngFor } = require('./demo');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthDateStrings(startFrom = new Date()) {
  const out = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(startFrom.getFullYear(), startFrom.getMonth() + i, 15);
    out.push({ monthLabel: MONTHS[d.getMonth()], year: d.getFullYear(), dateStr: d.toISOString().slice(0, 10) });
  }
  return out;
}

function demoMonthlyPrices({ origin, destination, corridor, anchorPriceUSD }) {
  const rng = rngFor(`calendar:${origin}:${destination}`);
  const base = anchorPriceUSD || 300 + Math.round(rng() * 250);
  const cheap = new Set((corridor && corridor.cheapestMonths) || []);
  const pricey = new Set((corridor && corridor.priciestMonths) || []);
  return monthDateStrings().map(({ monthLabel, year, dateStr }) => {
    let mult = 1 + (rng() - 0.5) * 0.15;
    if (cheap.has(monthLabel)) mult *= 0.72;
    if (pricey.has(monthLabel)) mult *= 1.55;
    return { month: monthLabel, year, date: dateStr, priceUSD: Math.round(base * mult), live: false };
  });
}

// Returns { months: [{month, year, date, priceUSD, live}] x12, liveData: bool }
async function getTwelveMonthView({ origin, destination, corridor }) {
  let months = [];
  let liveData = false;

  if (travelpayouts.hasCredentials()) {
    const real = await travelpayouts.getMonthly({ origin, destination });
    if (real && real.length) {
      liveData = true;
      const realByKey = Object.fromEntries(
        real.map((r) => {
          const [y, m] = r.monthKey.split('-').map(Number);
          return [r.monthKey, { month: MONTHS[m - 1], year: y, date: `${r.monthKey}-15`, priceUSD: r.priceUSD, live: true }];
        })
      );
      const anchorAvg = real.reduce((s, r) => s + r.priceUSD, 0) / real.length;
      const demoFallback = demoMonthlyPrices({ origin, destination, corridor, anchorPriceUSD: anchorAvg });
      months = monthDateStrings().map(({ monthLabel, year, dateStr }) => {
        const key = dateStr.slice(0, 7);
        return realByKey[key] || demoFallback.find((d) => d.month === monthLabel && d.year === year);
      });
    }
  }

  if (!months.length) {
    months = demoMonthlyPrices({ origin, destination, corridor });
  }

  return { months, liveData };
}

module.exports = { getTwelveMonthView, monthDateStrings, demoMonthlyPrices, MONTHS };
