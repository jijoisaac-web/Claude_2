// --- tab switching -----------------------------------------------------
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// --- data mode pill ------------------------------------------------------
fetch('/api/status')
  .then((r) => r.json())
  .then((d) => {
    const pill = document.getElementById('modePill');
    if (d.liveDataConfigured) {
      pill.textContent = 'Live data (Travelpayouts)';
      pill.classList.add('live');
    } else {
      pill.textContent = 'Demo mode (sample data)';
      pill.classList.add('demo');
    }
  })
  .catch(() => {});

// --- currency selector ----------------------------------------------------
// Backend amounts for the True Cost / Price Calendar / Leaderboard / Group
// Convergence tools are all canonical USD; we convert to whichever currency
// the visitor picks, purely on the client, using the same fx table the
// server uses (fetched once from /api/currencies). Compensation amounts are
// NOT converted -- EU261/UK261/DGCA payouts are fixed by law in EUR/GBP/INR,
// so showing them in a different currency would be misleading.
let fxRates = { USD: 1 };
let fxSymbols = { USD: '$' };
let selectedCurrency = localStorage.getItem('farewiseCurrency') || 'USD';
const rerenderCallbacks = [];

async function loadCurrencies() {
  try {
    const res = await fetch('/api/currencies');
    const data = await res.json();
    fxRates = data.rates || fxRates;
    const select = document.getElementById('currencySelect');
    const labelFor = (c) => `${c.symbol.trim()} ${c.code}`;
    select.innerHTML = data.currencies.map((c) => `<option value="${c.code}">${labelFor(c)}</option>`).join('');
    fxSymbols = Object.fromEntries(data.currencies.map((c) => [c.code, c.symbol]));
    select.value = selectedCurrency;
    select.addEventListener('change', () => {
      selectedCurrency = select.value;
      localStorage.setItem('farewiseCurrency', selectedCurrency);
      rerenderCallbacks.forEach((fn) => fn());
    });
  } catch {
    // fetch failed -- USD-only fallback is fine, dropdown just won't populate
  }
}
loadCurrencies();

// Converts a USD amount to the selected display currency and formats it.
function moneyFX(amountUSD) {
  if (amountUSD === null || amountUSD === undefined) return '—';
  const rate = fxRates[selectedCurrency] || 1;
  const symbol = fxSymbols[selectedCurrency] || selectedCurrency + ' ';
  const converted = amountUSD * rate;
  const rounded = converted >= 100 ? Math.round(converted) : Math.round(converted * 100) / 100;
  return symbol + Number(rounded).toLocaleString('en-US');
}

// For amounts that are already in a fixed, non-convertible currency (e.g.
// EU261/UK261/DGCA compensation amounts, which are set by regulation).
function moneyFixed(amount, currencyCode) {
  if (amount === null || amount === undefined) return '—';
  const symbols = { INR: '₹', EUR: '€', GBP: '£', USD: '$' };
  const s = symbols[currencyCode] || currencyCode + ' ';
  return s + Number(amount).toLocaleString('en-IN');
}

function showError(containerId, message) {
  document.getElementById(containerId).innerHTML = `<div class="error-box">${message}</div>`;
}

async function postJSON(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// --- 0. LEADERBOARD --------------------------------------------------------
function timeAgo(iso) {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function copyShareText(btn, text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = original), 1800);
    })
    .catch(() => showError('result-leaderboard', 'Could not copy to clipboard — select and copy the text manually.'));
}

let lastLeaderboardData = null;
function renderLeaderboard() {
  const data = lastLeaderboardData;
  const el = document.getElementById('result-leaderboard');
  if (!data || !data.corridors || !data.corridors.length) {
    el.innerHTML = '<p class="hint">Leaderboard is still building — check back in a moment.</p>';
    return;
  }
  const rows = data.corridors
    .map((c, i) => {
      const shareId = `share-${c.id}`;
      return `<div class="card-row ${i === 0 ? 'recommended' : ''}">
        <h3>#${i + 1} · ${c.label} <span class="badge ${c.dealScore > 0 ? 'good' : 'neutral'}">${c.dealScore > 0 ? `${c.dealScore}% below usual` : 'at/above usual'}</span></h3>
        <div class="meta">Cheapest cached fare: <strong>${moneyFX(c.cheapestPriceUSD)}</strong> (${c.cheapestMonth}) · Typical fare: ${moneyFX(c.avgPriceUSD)} ${c.liveData ? '' : '· demo estimate'}</div>
        <button type="button" class="secondary" id="${shareId}" style="margin-top:8px;">Copy share text</button>
      </div>`;
    })
    .join('');
  el.innerHTML = `
    <p class="hint">Updated ${timeAgo(data.updatedAt)}${data.liveData ? ' · based on live Travelpayouts data' : ' · demo data (set TRAVELPAYOUTS_TOKEN in .env for live rankings)'}. Refreshes weekly. Share text is always in USD.</p>
    ${rows}`;
  data.corridors.forEach((c) => {
    const btn = document.getElementById(`share-${c.id}`);
    if (btn) btn.addEventListener('click', () => copyShareText(btn, c.shareText));
  });
}
rerenderCallbacks.push(renderLeaderboard);

async function loadLeaderboard() {
  try {
    lastLeaderboardData = await getJSON('/api/leaderboard');
    renderLeaderboard();
  } catch (err) {
    showError('result-leaderboard', err.message);
  }
}
loadLeaderboard();

// --- 1. TRUE COST --------------------------------------------------------
let lastTrueCostData = null;

function trueCostRows(list) {
  return list
    .map(
      (r, i) => `<tr class="${i === 0 ? 'best' : ''}">
        <td>${r.airline}</td>
        <td>${moneyFX(r.baseFareUSD)}</td>
        <td>${moneyFX(r.addOnsUSD)}</td>
        <td>${moneyFX(r.totalUSD)}</td>
      </tr>`
    )
    .join('');
}

function renderTrueCost() {
  const data = lastTrueCostData;
  const el = document.getElementById('result-true-cost');
  if (!data) return;
  const suffix = `with ${data.bags} bag(s), ${data.seatPref} seat, ${data.meal ? '' : 'no '}meal.`;

  let confirmedHtml = '';
  if (data.confirmed && data.confirmed.length) {
    confirmedHtml = `
      <h3>Confirmed real fares <span class="badge good">live</span></h3>
      <p class="hint">Exactly what Travelpayouts has cached for this route${data.confirmed.some((r) => r.monthApprox) ? ' (some anchored to the cheapest day found this month, since the exact date had no cache hit)' : ''} — ${suffix}</p>
      <table>
        <thead><tr><th>Airline</th><th>Base fare</th><th>Add-ons</th><th>True total</th></tr></thead>
        <tbody>${trueCostRows(data.confirmed)}</tbody>
      </table>`;
  }

  let estimatedHtml = '';
  if (data.estimated && data.estimated.length) {
    estimatedHtml = `
      <h3 style="margin-top:${confirmedHtml ? '28px' : '0'};">${confirmedHtml ? 'Other carriers on this route' : 'Estimated fares'} <span class="badge neutral">est.</span></h3>
      <p class="hint">${confirmedHtml ? 'Not confirmed by live data — ballpark estimates for comparison, anchored to the real fare above. Always verify before booking.' : `Demo estimates (sample data) — set TRAVELPAYOUTS_TOKEN in .env for live pricing. ${suffix}`}</p>
      <table>
        <thead><tr><th>Airline</th><th>Base fare</th><th>Add-ons</th><th>True total</th></tr></thead>
        <tbody>${trueCostRows(data.estimated)}</tbody>
      </table>`;
  }

  el.innerHTML = confirmedHtml + estimatedHtml || '<p class="hint">No results.</p>';
}
rerenderCallbacks.push(renderTrueCost);

document.getElementById('form-true-cost').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = {
    origin: f.origin.value.toUpperCase(),
    destination: f.destination.value.toUpperCase(),
    date: f.date.value,
    bags: Number(f.bags.value),
    seatPref: f.seatPref.value,
    meal: f.meal.checked,
  };
  const el = document.getElementById('result-true-cost');
  el.innerHTML = '<p class="hint">Calculating…</p>';
  try {
    lastTrueCostData = await postJSON('/api/true-cost', body);
    renderTrueCost();
  } catch (err) {
    showError('result-true-cost', err.message);
  }
});

// --- 2. PRICE CALENDAR ----------------------------------------------------
const corridorDefaults = {
  'DXB-BOM': ['DXB', 'BOM'],
  'LON-DEL': ['LHR', 'DEL'],
  'SIN-MAA': ['SIN', 'MAA'],
  'YYZ-HYD': ['YYZ', 'HYD'],
};
document.getElementById('corridorSelect').addEventListener('change', (e) => {
  const pair = corridorDefaults[e.target.value];
  if (pair) {
    document.getElementById('calOrigin').value = pair[0];
    document.getElementById('calDestination').value = pair[1];
  }
});
document.getElementById('corridorSelect').dispatchEvent(new Event('change'));

let lastCalendarData = null;
function renderCalendar() {
  const data = lastCalendarData;
  const el = document.getElementById('result-price-calendar');
  if (!data) return;
  const months = data.months
    .map((m) => `<div class="cal-month ${m.month === data.cheapestMonth.month ? 'cheapest' : ''}">
        <div class="m">${m.month.slice(0, 3)} '${String(m.year).slice(2)}</div>
        <div class="p">${moneyFX(m.priceUSD)}</div>
      </div>`)
    .join('');
  let seasonalityHtml = '';
  if (data.seasonality) {
    const s = data.seasonality;
    seasonalityHtml = `
      <div class="card-row">
        <h3>${s.label} — seasonality notes</h3>
        <div class="meta">Cheapest months: ${s.cheapestMonths.join(', ')} · Priciest: ${s.priciestMonths.join(', ')}</div>
        <div class="meta">Cheapest days to fly: ${s.cheapestDaysOfWeek.join(', ')}</div>
        <div class="meta"><strong>Booking window:</strong> ${s.bookingWindow}</div>
        <p>${s.notes}</p>
      </div>`;
  }
  el.innerHTML = `
    <p class="hint">${data.liveData ? 'Real cached monthly-lowest fares from Travelpayouts where available, filled in with seasonality-based estimates for any uncovered months' : 'Demo calendar (sample data) — set TRAVELPAYOUTS_TOKEN in .env for live pricing'}. Cheapest month: <strong>${data.cheapestMonth.month} (${moneyFX(data.cheapestMonth.priceUSD)})</strong>.</p>
    <div class="calendar-grid">${months}</div>
    ${seasonalityHtml}`;
}
rerenderCallbacks.push(renderCalendar);

document.getElementById('form-price-calendar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const origin = document.getElementById('calOrigin').value.toUpperCase();
  const destination = document.getElementById('calDestination').value.toUpperCase();
  const corridorId = document.getElementById('corridorSelect').value;
  const el = document.getElementById('result-price-calendar');
  if (!origin || !destination) { showError('result-price-calendar', 'Enter both origin and destination airport codes.'); return; }
  el.innerHTML = '<p class="hint">Building calendar…</p>';
  try {
    lastCalendarData = await getJSON(`/api/price-calendar?origin=${origin}&destination=${destination}&corridorId=${corridorId}`);
    renderCalendar();
  } catch (err) {
    showError('result-price-calendar', err.message);
  }
});

// --- 3. COMPENSATION -------------------------------------------------------
// Note: compensation amounts are fixed by regulation in EUR/GBP/INR and are
// intentionally NOT run through the currency selector -- see moneyFixed().
const scenarioSelect = document.getElementById('scenarioSelect');
function toggleCompensationFields() {
  const v = scenarioSelect.value;
  document.getElementById('delayHoursLabel').style.display = v === 'delay' ? '' : 'none';
  document.getElementById('noticeDaysLabel').style.display = v === 'cancellation' ? '' : 'none';
  document.getElementById('altOfferedLabel').style.display = v === 'deniedBoarding' ? '' : 'none';
  document.getElementById('fareLabel').style.display = v === 'deniedBoarding' || v === 'cancellation' ? '' : 'none';
}
scenarioSelect.addEventListener('change', toggleCompensationFields);
toggleCompensationFields();

document.getElementById('form-compensation').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = {
    departure: f.departure.value.toUpperCase(),
    arrival: f.arrival.value.toUpperCase(),
    airlineCode: f.airlineCode.value.toUpperCase(),
    scenario: f.scenario.value,
    delayHours: Number(f.delayHours.value || 0),
    noticeDays: Number(f.noticeDays.value || 30),
    altOfferedWithinHour: f.altOfferedWithinHour.checked,
    fareAmountINR: Number(f.fareAmountINR.value || 0),
    passengerName: f.passengerName.value,
    flightNumber: f.flightNumber.value,
    flightDate: f.flightDate.value,
  };
  const el = document.getElementById('result-compensation');
  el.innerHTML = '<p class="hint">Checking eligibility…</p>';
  try {
    const data = await postJSON('/api/compensation', body);
    const rows = data.eligibility
      .filter((r) => r.applies)
      .map(
        (r) => `<tr>
          <td>${r.label}</td>
          <td><span class="badge ${r.eligible ? 'good' : 'bad'}">${r.eligible ? 'Eligible' : 'Not eligible'}</span></td>
          <td>${r.eligible ? moneyFixed(r.amount, r.currency) : '—'}</td>
        </tr>`
      )
      .join('') || '<tr><td colspan="3">No regime applies to this route/airline combination.</td></tr>';
    el.innerHTML = `
      <p class="hint">Distance: ~${data.distanceKm ?? '—'} km · Airline: ${data.airline}</p>
      <table>
        <thead><tr><th>Regulation</th><th>Status</th><th>Estimated amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h3 style="margin-top:22px;">Draft claim letter</h3>
      <pre class="claim-letter">${data.claimLetter}</pre>
      <p class="disclaimer">${data.disclaimer}</p>`;
  } catch (err) {
    showError('result-compensation', err.message);
  }
});

// --- 4. STOPOVER ------------------------------------------------------------
document.getElementById('form-stopover').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const origin = f.origin.value.toUpperCase();
  const destination = f.destination.value.toUpperCase();
  const layoverHours = f.layoverHours.value;
  const el = document.getElementById('result-stopover');
  el.innerHTML = '<p class="hint">Finding stopover options…</p>';
  try {
    const data = await getJSON(`/api/stopover?origin=${origin}&destination=${destination}&layoverHours=${layoverHours}`);
    const cards = data.results
      .map(
        (p) => `<div class="card-row ${p.recommended ? 'recommended' : ''}">
          <h3>${p.airline} — ${p.hub}${p.recommended ? ' <span class="badge good">Recommended for your route</span>' : ''}</h3>
          <div class="meta">${p.programName}</div>
          <p><strong>Free/discounted hotel:</strong> ${p.freeHotelHours}</p>
          <p><strong>Visa note:</strong> ${p.visaNote}</p>
          <p><strong>For your ~${data.layoverHours}h layover:</strong> ${p.itineraryForYourLayover}</p>
          <p><strong>Airport → city:</strong> ${p.airportTransport}</p>
        </div>`
      )
      .join('');
    el.innerHTML = cards;
  } catch (err) {
    showError('result-stopover', err.message);
  }
});

// --- 5. GROUP CONVERGENCE ----------------------------------------------------
document.getElementById('addOriginBtn').addEventListener('click', () => {
  const rows = document.getElementById('originRows');
  if (rows.children.length >= 6) return;
  const row = document.createElement('div');
  row.className = 'origin-row';
  row.innerHTML = '<input maxlength="3" placeholder="e.g. SYD" class="origin-input">';
  rows.appendChild(row);
});

let lastGroupData = null;
let lastGroupDestination = '';
function renderGroup() {
  const data = lastGroupData;
  const el = document.getElementById('result-group');
  if (!data) return;
  const cards = data.topCombinations
    .map((combo, i) => {
      const legs = combo.combo
        .map((c) => `<li>${c.originCode} → ${lastGroupDestination}: ${moneyFX(c.priceUSD)}, arrives ${new Date(c.arrival).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (${c.carrier})</li>`)
        .join('');
      return `<div class="card-row ${i === 0 ? 'recommended' : ''}">
        <h3>Combination ${i + 1} — total ${moneyFX(combo.totalCostUSD)} · arrival spread ${combo.spreadHours}h</h3>
        <ul>${legs}</ul>
      </div>`;
    })
    .join('');
  el.innerHTML = `
    <p class="hint">${data.liveData ? 'Real fares from Travelpayouts (arrival times are estimated from distance, not live schedules)' : 'Demo fares (sample data) — set TRAVELPAYOUTS_TOKEN in .env for live pricing'}. ${data.matchedWithinWindow ? `Combinations within your ${data.windowHours}h window:` : `No combination fit within ${data.windowHours}h — showing the tightest options instead:`}</p>
    ${cards}`;
}
rerenderCallbacks.push(renderGroup);

document.getElementById('form-group').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const origins = Array.from(document.querySelectorAll('.origin-input'))
    .map((i) => i.value.trim().toUpperCase())
    .filter(Boolean)
    .map((code) => ({ code }));
  const body = {
    destination: f.destination.value.toUpperCase(),
    date: f.date.value,
    windowHours: Number(f.windowHours.value),
    origins,
  };
  const el = document.getElementById('result-group');
  if (origins.length < 2) { showError('result-group', 'Add at least 2 traveler origins.'); return; }
  el.innerHTML = '<p class="hint">Searching combinations…</p>';
  try {
    lastGroupData = await postJSON('/api/group-convergence', body);
    lastGroupDestination = body.destination;
    renderGroup();
  } catch (err) {
    showError('result-group', err.message);
  }
});
