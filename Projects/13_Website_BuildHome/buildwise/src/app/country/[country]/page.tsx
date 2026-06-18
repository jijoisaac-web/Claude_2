import { notFound } from 'next/navigation';
import { COUNTRIES } from '@/data/countries';
import { getCitiesByCountry } from '@/data/cities';
import { GLOBAL_COST_INDEX } from '@/data/costEngine';
import Link from 'next/link';
import { MapPin, Clock, DollarSign, Building2, ArrowRight, TrendingDown } from 'lucide-react';

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return COUNTRIES.map(c => ({ country: c.code.toLowerCase() }));
}

export async function generateMetadata({ params }: Props) {
  const { country: code } = await params;
  const country = COUNTRIES.find(c => c.code.toLowerCase() === code);
  if (!country) return { title: 'Country Not Found' };
  return {
    title: `Construction Cost in ${country.name} 2024 | BuildWise Global`,
    description: `How much does it cost to build a house in ${country.name}? Get accurate construction cost estimates in ${country.currencyCode} for ${country.popularCities.slice(0, 3).join(', ')} and more.`,
  };
}

export default async function CountryPage({ params }: Props) {
  const { country: code } = await params;
  const country = COUNTRIES.find(c => c.code.toLowerCase() === code);
  if (!country) notFound();

  const cities = getCitiesByCountry(country.code);
  const globalRank = GLOBAL_COST_INDEX.findIndex(c => c.countryCode === country.code) + 1;
  const costData = GLOBAL_COST_INDEX.find(c => c.countryCode === country.code);

  const qualityCosts = [
    { tier: 'Economy', costPerSqft: country.baseCostUSD * country.economyMultiplier, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
    { tier: 'Standard', costPerSqft: country.baseCostUSD, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { tier: 'Premium', costPerSqft: country.baseCostUSD * country.premiumMultiplier, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    { tier: 'Luxury', costPerSqft: country.baseCostUSD * country.luxuryMultiplier, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  ];

  const sampleHomeSizes = [
    { label: 'Small Home (1,200 sqft)', area: 1200 },
    { label: 'Family Home (2,200 sqft)', area: 2200 },
    { label: 'Large Home (3,500 sqft)', area: 3500 },
    { label: 'Luxury Villa (6,000 sqft)', area: 6000 },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Hero */}
      <div className="relative pt-16 pb-20 overflow-hidden" style={{ minHeight: '50vh' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${country.heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/50 to-navy-950/90" />
        <div className="relative max-w-7xl mx-auto px-6 pt-12">
          <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/global-index" className="hover:text-white transition-colors">Global Index</Link>
            <span>/</span>
            <span className="text-white">{country.name}</span>
          </div>
          <div className="flex items-start gap-4 mb-6">
            <span className="text-6xl">{country.flag}</span>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Construction Cost in {country.name}
              </h1>
              <p className="text-white/60 mt-2 text-lg max-w-2xl">{country.description}</p>
            </div>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Avg Cost/sqft (Std)', value: `$${country.baseCostUSD}`, sub: 'USD Standard Quality' },
              { label: 'Currency', value: country.currencyCode, sub: country.currency },
              { label: 'Avg Build Time', value: `${country.avgBuildTimeMonths} months`, sub: 'Standard home' },
              { label: 'Global Rank', value: `#${globalRank}`, sub: `of ${GLOBAL_COST_INDEX.length} countries` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white/[0.08] backdrop-blur-sm rounded-2xl p-4 border border-white/[0.08]">
                <div className="text-white/50 text-xs mb-1">{label}</div>
                <div className="text-white font-bold text-lg">{value}</div>
                <div className="text-white/40 text-xs">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Quality tiers */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-navy-900 mb-6">Construction Cost Per Sqft in {country.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {qualityCosts.map(({ tier, costPerSqft, color, bg }) => (
              <div key={tier} className={`p-5 rounded-2xl border-2 ${bg}`}>
                <div className={`text-3xl font-bold ${color}`}>${costPerSqft.toFixed(0)}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">{tier} Quality</div>
                <div className="text-xs text-gray-400 mt-1">per sq ft · USD</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample estimates */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-navy-900 mb-6">Sample Construction Estimates for {country.name}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-gray-500 font-semibold">Property Size</th>
                  <th className="text-right py-3 text-gray-500 font-semibold">Economy</th>
                  <th className="text-right py-3 text-gray-500 font-semibold">Standard</th>
                  <th className="text-right py-3 text-gray-500 font-semibold">Premium</th>
                  <th className="text-right py-3 text-gray-500 font-semibold">Luxury</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sampleHomeSizes.map(({ label, area }) => (
                  <tr key={label}>
                    <td className="py-4 font-medium text-gray-900">{label}</td>
                    {qualityCosts.map(({ tier, costPerSqft, color }) => (
                      <td key={tier} className={`py-4 text-right font-bold ${color}`}>
                        ${(area * costPerSqft / 1000).toFixed(0)}K
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-4">* Estimates in USD. Excludes land cost. Consult local professionals for precise quotes.</p>
        </div>

        {/* Cities */}
        {cities.length > 0 && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-navy-900 mb-6">Construction Costs by City in {country.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cities.map((city) => (
                <Link
                  key={city.name}
                  href={`/city/${city.slug}`}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0 bg-gray-100"
                    style={{ backgroundImage: `url(${city.image})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">{city.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} />
                      {city.climate}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-emerald-600 text-sm">
                      ${(country.baseCostUSD * city.costMultiplier).toFixed(0)}/sqft
                    </div>
                    <div className="text-xs text-gray-400">{city.costMultiplier > 1 ? '+' : ''}{Math.round((city.costMultiplier - 1) * 100)}% vs national avg</div>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-navy-950 to-navy-800 rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #10b981 0%, transparent 70%)' }}
          />
          <div className="relative">
            <h3 className="text-2xl font-bold text-white mb-2">Get Your {country.name} Build Estimate</h3>
            <p className="text-white/60 mb-6">Enter your specific requirements for a personalized cost estimate in {country.currencyCode}</p>
            <Link
              href="/#estimator"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/25"
            >
              <Building2 size={18} />
              Start Estimating
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
