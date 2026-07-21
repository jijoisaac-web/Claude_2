const express = require('express');
const router = express.Router();
const rules = require('../data/compensationRules.json').regimes;
const airlines = require('../data/airlineCountry.json');
const { distanceBetween, airportInfo } = require('../lib/geo');

const EU_EEA = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', 'IS', 'LI', 'NO',
]);

function amountForBand(regime, distanceKm) {
  const band = regime.distanceBands.find((b) => b.maxKm === null || distanceKm <= b.maxKm);
  return band ? band.amount : null;
}

function buildClaimLetter({ passengerName, flightNumber, flightDate, departure, arrival, airlineName, scenario, delayHours, eligibility }) {
  const lines = [];
  lines.push(`Subject: Compensation claim for flight ${flightNumber} on ${flightDate}`, '');
  lines.push(`To: Customer Relations, ${airlineName}`);
  lines.push(`From: ${passengerName || '[Your name]'}`, '');
  lines.push(
    `I am writing to claim compensation for flight ${flightNumber} operated by ${airlineName} from ${departure} to ${arrival} on ${flightDate}.`
  );
  if (scenario === 'delay') {
    lines.push(`This flight arrived at its final destination approximately ${delayHours} hours later than scheduled.`);
  } else if (scenario === 'cancellation') {
    lines.push('This flight was cancelled.');
  } else {
    lines.push('I was denied boarding on this flight despite holding a valid, confirmed reservation.');
  }
  lines.push('');
  eligibility.filter((e) => e.eligible).forEach((e) => {
    lines.push(
      `Under ${e.label}, I believe I am entitled to compensation of approximately ${e.amount} ${e.currency} given the distance of this flight and the length of the delay/disruption.`
    );
  });
  lines.push(
    '',
    'Please could you confirm receipt of this claim and let me know the compensation amount you will be paying, and the expected timeframe for payment.',
    '',
    'I have attached/can provide my booking confirmation and boarding pass on request.',
    '',
    'Booking reference: [Your PNR]',
    'Yours sincerely,',
    passengerName || '[Your name]'
  );
  return lines.join('\n');
}

router.post('/', (req, res) => {
  const {
    departure,
    arrival,
    airlineCode,
    scenario = 'delay',
    delayHours = 0,
    noticeDays = 30,
    altOfferedWithinHour = false,
    passengerName = '',
    flightNumber = '',
    flightDate = '',
    fareAmountINR = 0,
  } = req.body || {};

  if (!departure || !arrival || !airlineCode) {
    return res.status(400).json({ error: 'departure, arrival and airlineCode are required' });
  }

  const depInfo = airportInfo(departure);
  const arrInfo = airportInfo(arrival);
  const airline = airlines[airlineCode.toUpperCase()];
  const distanceKm = distanceBetween(departure, arrival);

  if (!depInfo || !arrInfo) {
    return res.status(400).json({ error: 'Unrecognized airport code(s). Use IATA codes (e.g. DEL, LHR, DXB).' });
  }
  if (!airline) {
    return res.status(400).json({ error: 'Unrecognized airline code. Try AI, 6E, EK, QR, BA, LH, TK, etc.' });
  }

  const depCountry = depInfo.country;
  const arrCountry = arrInfo.country;
  const airlineCountry = airline.country;

  const eligibility = [];

  // EU261
  {
    const applies = EU_EEA.has(depCountry) || (EU_EEA.has(arrCountry) && EU_EEA.has(airlineCountry));
    let eligible = false;
    let amount = null;
    if (applies && scenario !== 'none') {
      const minHours = distanceKm > 3500 ? rules.EU261.minDelayHoursForBand.longHaulOver3500km : rules.EU261.minDelayHoursForBand.default;
      if (scenario === 'delay') eligible = delayHours >= minHours;
      if (scenario === 'cancellation') eligible = noticeDays < 14;
      if (scenario === 'deniedBoarding') eligible = true;
      if (eligible) amount = amountForBand(rules.EU261, distanceKm);
    }
    eligibility.push({ regime: 'EU261', label: rules.EU261.label, applies, eligible, amount, currency: 'EUR' });
  }

  // UK261
  {
    const applies = depCountry === 'GB' || (arrCountry === 'GB' && airlineCountry === 'GB');
    let eligible = false;
    let amount = null;
    if (applies && scenario !== 'none') {
      const minHours = distanceKm > 3500 ? rules.UK261.minDelayHoursForBand.longHaulOver3500km : rules.UK261.minDelayHoursForBand.default;
      if (scenario === 'delay') eligible = delayHours >= minHours;
      if (scenario === 'cancellation') eligible = noticeDays < 14;
      if (scenario === 'deniedBoarding') eligible = true;
      if (eligible) amount = amountForBand(rules.UK261, distanceKm);
    }
    eligibility.push({ regime: 'UK261', label: rules.UK261.label, applies, eligible, amount, currency: 'GBP' });
  }

  // DGCA
  {
    const applies = depCountry === 'IN' || airlineCountry === 'IN';
    let eligible = false;
    let amount = null;
    let note = '';
    if (applies) {
      if (scenario === 'deniedBoarding') {
        eligible = true;
        amount = altOfferedWithinHour ? Math.min(2 * (fareAmountINR || 0), 10000) : Math.min(4 * (fareAmountINR || 0), 20000);
        note = altOfferedWithinHour ? rules.DGCA.deniedBoarding.altWithin1Hour.amount : rules.DGCA.deniedBoarding.altAfter1Hour.amount;
      } else if (scenario === 'cancellation') {
        eligible = noticeDays < 14;
        if (eligible) amount = Math.min(4 * (fareAmountINR || 0), 20000);
        note = 'Refund plus denied-boarding-equivalent compensation if less than 2 weeks notice given.';
      } else if (scenario === 'delay') {
        eligible = delayHours >= 24;
        note = delayHours >= 24
          ? 'No flat cash amount -- entitled to hotel + rebooking or full refund.'
          : delayHours >= 2
          ? 'No cash compensation for delays under 24h -- entitled to meals/refreshments only.'
          : 'Below DGCA delay threshold.';
      }
    }
    eligibility.push({ regime: 'DGCA', label: rules.DGCA.label, applies, eligible, amount, currency: 'INR', note });
  }

  const claimLetter = buildClaimLetter({
    passengerName,
    flightNumber,
    flightDate,
    departure,
    arrival,
    airlineName: airline.name,
    scenario,
    delayHours,
    eligibility,
  });

  res.json({
    departure,
    arrival,
    distanceKm,
    airline: airline.name,
    scenario,
    eligibility,
    claimLetter,
    disclaimer: rules === rules ? 'This is an estimate based on publicly known rules, not legal advice. Extraordinary circumstances (weather, ATC strikes, security incidents) can void EU261/UK261 eligibility. Verify specifics before filing.' : '',
  });
});

module.exports = router;
