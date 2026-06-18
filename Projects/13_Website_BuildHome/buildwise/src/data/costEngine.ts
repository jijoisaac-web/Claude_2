import { COUNTRIES, EXCHANGE_RATES, formatCurrencyFull } from './countries';
import { CITIES } from './cities';

export type PropertyType = 'single-storey' | 'double-storey' | 'villa' | 'luxury' | 'apartment' | 'duplex' | 'townhouse';
export type QualityTier = 'economy' | 'standard' | 'premium' | 'luxury';
export type AreaUnit = 'sqft' | 'sqm';
export type GarageType = 'none' | 'single' | 'double' | 'triple';

export interface EstimateInput {
  countryCode: string;
  cityName?: string;
  propertyType: PropertyType;
  qualityTier: QualityTier;
  area: number;
  areaUnit: AreaUnit;
  bedrooms: number;
  bathrooms: number;
  garage: GarageType;
  includePool?: boolean;
  includeSolar?: boolean;
  includeSmartHome?: boolean;
  includeLandscaping?: boolean;
}

export interface CostBreakdown {
  category: string;
  percentage: number;
  costUSD: number;
  description: string;
  color: string;
}

export interface EstimateResult {
  totalCostUSD: number;
  totalCostLocal: string;
  costPerSqftUSD: number;
  costPerSqmUSD: number;
  costPerSqftLocal: string;
  costPerSqmLocal: string;
  monthlyLoanEstimate: string;
  projectTimeline: string;
  breakdown: CostBreakdown[];
  currencyCode: string;
  currencySymbol: string;
  areaSqft: number;
  areaSqm: number;
  qualityLabel: string;
  countryName: string;
  cityName: string;
  minCostUSD: number;
  maxCostUSD: number;
}

const PROPERTY_TYPE_MULTIPLIERS: Record<PropertyType, number> = {
  'apartment': 0.85,
  'single-storey': 1.0,
  'townhouse': 1.05,
  'duplex': 1.08,
  'double-storey': 1.15,
  'villa': 1.35,
  'luxury': 1.8,
};

const QUALITY_LABELS: Record<QualityTier, string> = {
  economy: 'Economy',
  standard: 'Standard',
  premium: 'Premium',
  luxury: 'Ultra-Luxury',
};

const GARAGE_COSTS_USD: Record<GarageType, number> = {
  none: 0,
  single: 8000,
  double: 14000,
  triple: 20000,
};

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const country = COUNTRIES.find(c => c.code === input.countryCode);
  if (!country) throw new Error('Country not found');

  const city = CITIES.find(c => c.countryCode === input.countryCode && c.name === input.cityName);
  const cityMultiplier = city?.costMultiplier ?? 1.0;

  // Convert area to sqft
  const areaSqft = input.areaUnit === 'sqm' ? input.area * 10.764 : input.area;
  const areaSqm = input.areaUnit === 'sqft' ? input.area / 10.764 : input.area;

  // Base cost per sqft in USD
  let baseCostPerSqft = country.baseCostUSD;

  // Apply quality multiplier
  const qualityMultiplier =
    input.qualityTier === 'economy' ? country.economyMultiplier :
    input.qualityTier === 'premium' ? country.premiumMultiplier :
    input.qualityTier === 'luxury' ? country.luxuryMultiplier : 1.0;

  baseCostPerSqft *= qualityMultiplier;

  // Apply property type multiplier
  baseCostPerSqft *= PROPERTY_TYPE_MULTIPLIERS[input.propertyType];

  // Apply city multiplier
  baseCostPerSqft *= cityMultiplier;

  // Bedroom/bathroom adjustment
  const extraBedrooms = Math.max(0, input.bedrooms - 3);
  const extraBathrooms = Math.max(0, input.bathrooms - 2);
  const bedroomAdj = extraBedrooms * 0.015 + extraBathrooms * 0.02;
  baseCostPerSqft *= (1 + bedroomAdj);

  let totalCostUSD = baseCostPerSqft * areaSqft;

  // Add garage
  totalCostUSD += GARAGE_COSTS_USD[input.garage] * qualityMultiplier;

  // Add optional features
  if (input.includePool) totalCostUSD += 25000 * qualityMultiplier * cityMultiplier;
  if (input.includeSolar) totalCostUSD += 15000 * qualityMultiplier;
  if (input.includeSmartHome) totalCostUSD += 12000 * qualityMultiplier;
  if (input.includeLandscaping) totalCostUSD += 8000 * qualityMultiplier * cityMultiplier;

  // Breakdown percentages based on quality
  const breakdownConfig = getBreakdownConfig(input.qualityTier, input.propertyType);
  const breakdown: CostBreakdown[] = breakdownConfig.map(item => ({
    ...item,
    costUSD: totalCostUSD * (item.percentage / 100),
  }));

  // Loan estimate (30-year, 5.5% interest, 20% down)
  const loanAmount = totalCostUSD * 0.8;
  const monthlyRate = 0.055 / 12;
  const payments = 360;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1);

  const exchangeRate = EXCHANGE_RATES[country.currencyCode] || 1;
  const costPerSqftUSD = totalCostUSD / areaSqft;
  const costPerSqmUSD = totalCostUSD / areaSqm;

  const formatLocal = (usd: number) => {
    const local = usd * exchangeRate;
    return `${country.currencySymbol}${Math.round(local).toLocaleString()}`;
  };

  const timeline = calculateTimeline(areaSqft, input.qualityTier, country.avgBuildTimeMonths);

  return {
    totalCostUSD,
    totalCostLocal: formatLocal(totalCostUSD),
    costPerSqftUSD,
    costPerSqmUSD,
    costPerSqftLocal: formatLocal(costPerSqftUSD),
    costPerSqmLocal: formatLocal(costPerSqmUSD),
    monthlyLoanEstimate: formatLocal(monthlyPayment),
    projectTimeline: timeline,
    breakdown,
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    areaSqft,
    areaSqm,
    qualityLabel: QUALITY_LABELS[input.qualityTier],
    countryName: country.name,
    cityName: input.cityName || country.name,
    minCostUSD: totalCostUSD * 0.85,
    maxCostUSD: totalCostUSD * 1.15,
  };
}

function calculateTimeline(areaSqft: number, quality: QualityTier, baseMonths: number): string {
  let months = baseMonths;
  if (areaSqft > 5000) months += 6;
  else if (areaSqft > 3000) months += 3;
  if (quality === 'luxury') months += 6;
  else if (quality === 'premium') months += 3;
  const min = months - 2;
  const max = months + 4;
  return `${min}–${max} months`;
}

function getBreakdownConfig(quality: QualityTier, type: PropertyType): Omit<CostBreakdown, 'costUSD'>[] {
  const isLuxury = quality === 'luxury' || quality === 'premium';
  return [
    { category: 'Foundation & Site', percentage: 12, description: 'Excavation, footings, slab or basement', color: '#1e3a5f' },
    { category: 'Structural Frame', percentage: isLuxury ? 20 : 22, description: 'Steel, concrete or timber framing', color: '#2d5986' },
    { category: 'Roofing', percentage: isLuxury ? 8 : 7, description: 'Roof structure, tiles or metal sheet', color: '#10b981' },
    { category: 'External Walls', percentage: 10, description: 'Brickwork, cladding or rendered walls', color: '#059669' },
    { category: 'Windows & Doors', percentage: isLuxury ? 7 : 5, description: 'Double-glazed windows, premium entry doors', color: '#0d9488' },
    { category: 'Electrical', percentage: 8, description: 'Wiring, switchboard, lighting, outlets', color: '#f59e0b' },
    { category: 'Plumbing', percentage: 7, description: 'Pipes, fixtures, hot water system', color: '#d97706' },
    { category: 'Flooring', percentage: isLuxury ? 6 : 4, description: 'Tiles, timber, carpet or stone', color: '#6d28d9' },
    { category: 'Kitchen & Bathrooms', percentage: isLuxury ? 10 : 8, description: 'Cabinetry, benchtops, fixtures', color: '#7c3aed' },
    { category: 'Painting & Finishing', percentage: 5, description: 'Interior and exterior painting', color: '#db2777' },
    { category: 'Professional Fees', percentage: isLuxury ? 4 : 3, description: 'Architect, engineer, permits', color: '#be185d' },
    { category: 'Contingency', percentage: isLuxury ? 3 : 4, description: 'Unexpected costs buffer', color: '#64748b' },
  ];
}

export const GLOBAL_COST_INDEX = COUNTRIES.map(country => ({
  countryCode: country.code,
  countryName: country.name,
  flag: country.flag,
  region: country.region,
  costPerSqftUSD: country.baseCostUSD,
  costPerSqmUSD: country.baseCostUSD * 10.764,
  currency: country.currencyCode,
  luxuryCostPerSqftUSD: country.baseCostUSD * country.luxuryMultiplier,
  economyCostPerSqftUSD: country.baseCostUSD * country.economyMultiplier,
  avgBuildTimeMonths: country.avgBuildTimeMonths,
})).sort((a, b) => a.costPerSqftUSD - b.costPerSqftUSD);
