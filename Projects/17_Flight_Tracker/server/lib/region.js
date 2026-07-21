// Rough region classification used to guess which airlines are plausible
// for a given route when we don't have (or can't get) real live pricing.
// Deliberately coarse -- broad buckets, not real routing/alliance data.

const WEST = new Set(['US', 'CA', 'GB', 'FR', 'DE', 'NL', 'ES', 'IT', 'CH', 'AT', 'DK', 'IE', 'SE', 'NO', 'BE', 'PT']);
const SOUTH_ASIA = new Set(['IN', 'PK', 'BD', 'LK', 'NP']);
const OCEANIA = new Set(['AU', 'NZ']);
const EAST_ASIA = new Set(['SG', 'MY', 'HK', 'CN', 'JP', 'KR', 'TH', 'VN', 'ID', 'PH']);
const MIDDLE_EAST = new Set(['AE', 'QA', 'SA', 'BH', 'KW', 'OM', 'TR']);

function region(countryCode) {
  if (WEST.has(countryCode)) return 'west';
  if (SOUTH_ASIA.has(countryCode)) return 'south_asia';
  if (OCEANIA.has(countryCode)) return 'oceania';
  if (EAST_ASIA.has(countryCode)) return 'east_asia';
  if (MIDDLE_EAST.has(countryCode)) return 'middle_east';
  return 'other';
}

module.exports = { region };
