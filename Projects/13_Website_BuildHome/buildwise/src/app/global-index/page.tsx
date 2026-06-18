'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, TrendingDown, TrendingUp, Globe, ArrowRight, Filter } from 'lucide-react';
import { GLOBAL_COST_INDEX } from '@/data/costEngine';
import { COUNTRIES } from '@/data/countries';

const REGIONS = ['All Regions', 'Asia', 'Europe', 'North America', 'Middle East', 'Oceania', 'Africa', 'South America', 'Europe/Asia'];

export default function GlobalIndexPage() {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All Regions');
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    let data = [...GLOBAL_COST_INDEX];
    if (search) data = data.filter(c => c.countryName.toLowerCase().includes(search.toLowerCase()));
    if (region !== 'All Regions') data = data.filter(c => c.region === region);
    data.sort((a, b) => sortBy === 'asc' ? a.costPerSqftUSD - b.costPerSqftUSD : b.costPerSqftUSD - a.costPerSqftUSD);
    return data;
  }, [search, region, sortBy]);

  const maxCost = Math.max(...GLOBAL_COST_INDEX.map(c => c.costPerSqftUSD));

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Hero */}
      <div className="bg-navy-950 pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/[0.06] text-white/70 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <Globe size={14} className="text-emerald-400" />
              Global Construction Cost Index 2024
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              Construction Costs<br />
              <span className="gradient-text-light">By Country</span>
            </h1>
            <p className="text-white/50 text-lg max-w-xl">
              Standard quality construction cost per square foot across {GLOBAL_COST_INDEX.length} countries, ranked from most affordable to most expensive.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm text-gray-700 border-none outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-gray-400" />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400"
            >
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button
            onClick={() => setSortBy(s => s === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {sortBy === 'asc' ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
            {sortBy === 'asc' ? 'Cheapest First' : 'Expensive First'}
          </button>
          <span className="text-sm text-gray-400">{filtered.length} countries</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Country</div>
            <div className="col-span-2">Region</div>
            <div className="col-span-2 text-right">$/sqft (Std)</div>
            <div className="col-span-2 text-right">$/sqft (Luxury)</div>
            <div className="col-span-2 text-right">Build Time</div>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map((country, i) => (
              <motion.div
                key={country.countryCode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors items-center group"
              >
                <div className="col-span-1 text-gray-300 font-bold text-sm">
                  {sortBy === 'asc' ? i + 1 : filtered.length - i}
                </div>
                <div className="col-span-3">
                  <Link
                    href={`/country/${country.countryCode.toLowerCase()}`}
                    className="flex items-center gap-2.5 group-hover:text-emerald-600 transition-colors"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-emerald-600">{country.countryName}</div>
                      <div className="text-xs text-gray-400">{country.currency}</div>
                    </div>
                  </Link>
                </div>
                <div className="col-span-2 text-xs text-gray-400">{country.region}</div>
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-16 ml-auto">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${(country.costPerSqftUSD / maxCost) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-900 text-sm w-12 text-right">${country.costPerSqftUSD}</span>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-semibold text-amber-600">${Math.round(country.luxuryCostPerSqftUSD)}</span>
                </div>
                <div className="col-span-2 text-right text-sm text-gray-500">
                  {country.avgBuildTimeMonths} mo
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footnote */}
        <p className="text-center text-gray-400 text-xs mt-6">
          Costs are indicative estimates for standard residential construction. Actual costs vary by site conditions, specifications, and local market conditions.
        </p>
      </div>
    </div>
  );
}
