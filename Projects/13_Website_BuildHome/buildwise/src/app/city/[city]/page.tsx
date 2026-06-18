import { notFound } from 'next/navigation';
import { CITIES } from '@/data/cities';
import { COUNTRIES } from '@/data/countries';
import Link from 'next/link';
import { MapPin, Building2, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return CITIES.map(c => ({ city: c.slug }));
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const city = CITIES.find(c => c.slug === slug);
  if (!city) notFound();

  const country = COUNTRIES.find(c => c.code === city.countryCode);
  if (!country) notFound();

  const baseCostSqft = country.baseCostUSD * city.costMultiplier;
  const vs = ((city.costMultiplier - 1) * 100).toFixed(0);
  const isAbove = city.costMultiplier > 1;

  const quality = [
    { tier: 'Economy', cost: baseCostSqft * country.economyMultiplier, color: 'text-slate-600' },
    { tier: 'Standard', cost: baseCostSqft, color: 'text-blue-600' },
    { tier: 'Premium', cost: baseCostSqft * country.premiumMultiplier, color: 'text-purple-600' },
    { tier: 'Luxury', cost: baseCostSqft * country.luxuryMultiplier, color: 'text-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="relative pt-16 overflow-hidden" style={{ minHeight: '40vh' }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${city.image})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 to-navy-950/90" />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-16">
          <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href={`/country/${country.code.toLowerCase()}`} className="hover:text-white">{country.name}</Link>
            <span>/</span>
            <span className="text-white">{city.name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Construction Cost in<br />{city.name}
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">{city.description}</p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-2xl">{country.flag}</span>
            <span className="text-white/70 text-sm">{country.name}</span>
            <span className="text-white/30">·</span>
            <MapPin size={14} className="text-white/50" />
            <span className="text-white/70 text-sm">{city.climate}</span>
            <span className={`text-sm font-bold flex items-center gap-1 ${isAbove ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isAbove ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isAbove ? '+' : ''}{vs}% vs {country.name} avg
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Cost grid */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-navy-900 mb-6">Construction Cost Per Sqft in {city.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quality.map(({ tier, cost, color }) => (
              <div key={tier} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className={`text-3xl font-bold ${color}`}>${cost.toFixed(0)}</div>
                <div className="text-sm text-gray-600 mt-1">{tier}</div>
                <div className="text-xs text-gray-400">per sqft · USD</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-navy-950 to-navy-800 rounded-3xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Plan Your Build in {city.name}</h3>
          <p className="text-white/60 mb-6">Get a full detailed estimate with our cost estimator tool</p>
          <Link
            href="/#estimator"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5"
          >
            <Building2 size={18} />
            Get Estimate for {city.name}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
