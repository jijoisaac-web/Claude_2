// Shared currency helper -- canonical internal amounts are USD everywhere
// in the backend; this converts to whatever display currency the client
// asks for. Same fxRates.json backs both the /api/currencies endpoint
// (frontend dropdown) and any server-side conversion.

const fx = require('../data/fxRates.json');

function listCurrencies() {
  return Object.keys(fx.rates).map((code) => ({
    code,
    symbol: fx.symbols[code] || code + ' ',
    label: fx.labels[code] || code,
  }));
}

function convertFromUSD(amountUSD, toCurrency) {
  const rate = fx.rates[toCurrency] || 1;
  return amountUSD * rate;
}

function formatMoney(amountUSD, toCurrency) {
  const converted = convertFromUSD(amountUSD, toCurrency);
  const symbol = fx.symbols[toCurrency] || toCurrency + ' ';
  const rounded = converted >= 100 ? Math.round(converted) : Math.round(converted * 100) / 100;
  return `${symbol}${rounded.toLocaleString('en-US')}`;
}

module.exports = { fx, listCurrencies, convertFromUSD, formatMoney };
