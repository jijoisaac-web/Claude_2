'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, TrendingDown, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { COUNTRIES, formatCurrencyFull } from '@/data/countries';
import { calculateEstimate } from '@/data/costEngine';
import Link from 'next/link';

type QT = 'economy' | 'standard' | 'premium' | 'luxury';

export default function ComparePage() {
  const [countryA, setCountryA] = useState('US');
  const [countryB, setCountryB] = useState('MY');
  const [quality, setQuality] = useState<QT>('standard');
  const [area, setArea] = useState(2000);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCompare = () => {
    setComparing(true);
    setTimeout(() => {
      const estA = calculateEstimate({ countryCode: countryA, propertyType: 'single-storey', qualityTier: quality, area, areaUnit: 'sqft', bedrooms: 3, bathrooms: 2, garage: 'single' });
      const estB = calculateEstimate({ countryCode: countryB, propertyType: 'single-storey', qualityTier: quality, area, areaUnit: 'sqft', bedrooms: 3, bathrooms: 2, garage: 'single' });
      setResult({ a: estA, b: estB });
      setComparing(false);
    }, 800);
  };

  const cA = COUNTRIES.find(c => c.code === countryA);
  const cB = COUNTRIES.find(c => c.code === countryB);
  const savings = result ? Math.abs(result.a.totalCostUSD - result.b.totalCostUSD) : 0;
  const cheaperCountry = result ? (result.a.totalCostUSD < result.b.totalCostUSD ? cA : cB) : null;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="bg-navy-950 pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/[0.06] text-white/70 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <ArrowLeftRight size={14} />
              Country Cost Comparison
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              Compare Construction<br />
              <span className="gradient-text-light">Costs Worldwide</span>
            </h1>
            <p className="text-white/50 text-lg">See exactly how much you save building in one country vs another</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Comparison form */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
          <div className="grid md:grid-cols-3 gap-6 items-end">
            {/* Country A */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Build Location A</label>
              <select
                value={countryA}
                onChange={(e) => setCountryA(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-emerald-400 text-sm font-medium"
              >
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <ArrowLeftRight size={18} className="text-gray-500" />
              </div>
            </div>
            {/* Country B */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Build Location B</label>
              <select
                value={countryB}
                onChange={(e) => setCountryB(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-emerald-400 text-sm font-medium"
              >
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Floor Area (sqft)</label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-emerald-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quality Tier</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as QT)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-emerald-400 text-sm"
              >
                <option value="economy">Economy</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="luxury">Ultra-Luxury</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={comparing}
            className="mt-6 w-full bg-gradient-to-r from-navy-950 to-navy-800 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {comparing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Comparing...</>
            ) : (
              <><ArrowLeftRight size={18} /> Compare Countries</>
            )}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Savings highlight */}
              {cheaperCountry && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white text-center">
                  <div className="text-white/80 text-sm mb-1">Potential Savings</div>
                  <div className="text-4xl font-bold mb-1">${Math.round(savings).toLocaleString()} USD</div>
                  <div className="text-white/80">
                    Building in <span className="font-bold">{cheaperCountry.name}</span> is cheaper by {((savings / Math.max(result.a.totalCostUSD, result.b.totalCostUSD)) * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {/* Side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                {[{ label: 'A', data: result.a, country: cA }, { label: 'B', data: result.b, country: cB }].map(({ label, data, country: c }) => (
                  <div key={label} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-3xl">{c?.flag}</span>
                      <div>
                        <div className="font-bold text-navy-900">{c?.name}</div>
                        <div className="text-gray-400 text-xs">{c?.currencyCode} · {quality} quality</div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-navy-900 mb-4">{data.totalCostLocal}</div>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'USD Equivalent', value: `$${Math.round(data.totalCostUSD).toLocaleString()}` },
                        { label: 'Per sqft (local)', value: data.costPerSqftLocal },
                        { label: 'Monthly Loan Est.', value: data.monthlyLoanEstimate },
                        { label: 'Build Timeline', value: data.projectTimeline },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-semibold text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={`/country/${c?.code.toLowerCase()}`} className="mt-4 flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
                      Full {c?.name} Report <ArrowRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link href="/#estimator" className="inline-flex items-center gap-2 bg-navy-950 text-white font-semibold px-8 py-4 rounded-xl hover:bg-navy-800 transition-all hover:-translate-y-0.5">
                  <Building2 size={16} />
                  Get Detailed Estimate
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
