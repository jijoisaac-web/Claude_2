'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, ChevronDown, Globe, Star, TrendingDown } from 'lucide-react';
import { COUNTRIES } from '@/data/countries';

const HERO_IMAGES: Record<string, string> = {
  default: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80',
  US: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80',
  AU: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  IN: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1920&q=80',
  MY: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1920&q=80',
  AE: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80',
  GB: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=80',
  JP: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80',
  SG: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80',
  DE: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1920&q=80',
  FR: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80',
  CA: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1920&q=80',
  ZA: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1920&q=80',
};

const TRUST_STATS = [
  { icon: '🌍', value: '120+', label: 'Countries' },
  { icon: '🏙️', value: '5,000+', label: 'Cities' },
  { icon: '💰', value: 'Free', label: 'To Use' },
  { icon: '📊', value: 'Live', label: 'Cost Data' },
];

const POPULAR = ['US', 'IN', 'MY', 'AE', 'AU', 'GB', 'SG', 'CA', 'JP', 'DE'];

interface Props {
  onCountrySelect?: (code: string) => void;
}

export default function HeroSection({ onCountrySelect }: Props) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [heroImage, setHeroImage] = useState(HERO_IMAGES.default);
  const [imageLoading, setImageLoading] = useState(false);

  const filteredCountries = search.length > 0
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : COUNTRIES.filter(c => POPULAR.includes(c.code));

  const handleSelect = (code: string) => {
    setSelectedCountry(code);
    setSearch('');
    setShowDropdown(false);
    const country = COUNTRIES.find(c => c.code === code);
    if (country) {
      setImageLoading(true);
      const newImage = HERO_IMAGES[code] || country.heroImage;
      const img = new Image();
      img.onload = () => {
        setHeroImage(newImage);
        setImageLoading(false);
      };
      img.src = newImage;
    }
    onCountrySelect?.(code);
  };

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);

  const scrollToEstimator = () => {
    document.getElementById('estimator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image with transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={heroImage}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
      </AnimatePresence>

      {/* Overlay */}
      <div className="absolute inset-0 hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1929]/80 via-transparent to-[#0a1929]/30" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 pt-32 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="inline-flex items-center gap-2 glass text-white/90 text-sm font-medium px-4 py-2 rounded-full mb-8"
        >
          <Globe size={14} className="text-emerald-400" />
          <span>Construction Cost Intelligence Platform</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6"
        >
          Know Exactly What<br />
          <span className="gradient-text-light">Your Dream Home</span><br />
          Will Cost
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-xl text-white/65 max-w-2xl mx-auto leading-relaxed mb-12"
        >
          Estimate construction costs across countries, cities and property types
          with intelligent cost modeling and local market insights.
        </motion.p>

        {/* Country Search */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="max-w-xl mx-auto mb-8"
        >
          <div className="relative">
            <div
              className="flex items-center gap-3 bg-white rounded-2xl p-2 pl-5 shadow-2xl shadow-black/30 cursor-text"
              onClick={() => setShowDropdown(true)}
            >
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              {selectedCountryData ? (
                <button
                  className="flex-1 flex items-center gap-2 text-left"
                  onClick={(e) => { e.stopPropagation(); setSelectedCountry(''); setShowDropdown(true); }}
                >
                  <span className="text-xl">{selectedCountryData.flag}</span>
                  <span className="font-semibold text-navy-900">{selectedCountryData.name}</span>
                  <span className="text-gray-400 text-sm ml-1">— click to change</span>
                </button>
              ) : (
                <input
                  type="text"
                  placeholder="Where are you planning to build?"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="flex-1 text-gray-800 bg-transparent border-none outline-none text-base font-medium placeholder:text-gray-400"
                />
              )}
              <button
                onClick={scrollToEstimator}
                className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2"
              >
                Estimate Cost
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  onMouseLeave={() => !search && setShowDropdown(false)}
                >
                  <div className="p-3">
                    {!search && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">
                        Popular Countries
                      </p>
                    )}
                    <div className="space-y-0.5 max-h-72 overflow-y-auto">
                      {filteredCountries.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => handleSelect(country.code)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                        >
                          <span className="text-2xl">{country.flag}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-sm">{country.name}</div>
                            <div className="text-xs text-gray-400">{country.region} · {country.currencyCode}</div>
                          </div>
                          <div className="text-xs text-gray-400 bg-gray-50 group-hover:bg-white px-2 py-1 rounded-lg">
                            ~${country.baseCostUSD}/sqft
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-16"
        >
          <button onClick={scrollToEstimator} className="btn-primary">
            Start Estimating
            <ArrowRight size={16} />
          </button>
          <a href="/global-index" className="btn-secondary">
            <TrendingDown size={16} />
            Explore Global Cost Rankings
          </a>
        </motion.div>

        {/* Trust stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-8"
        >
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 text-white/80">
              <span className="text-lg">{stat.icon}</span>
              <span className="font-bold text-white">{stat.value}</span>
              <span className="text-white/55 text-sm">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 text-white/40 cursor-pointer hover:text-white/60 transition-colors"
          onClick={scrollToEstimator}
        >
          <span className="text-xs font-medium tracking-widest uppercase">Explore</span>
          <ChevronDown size={18} />
        </motion.div>
      </motion.div>

      {/* Close dropdown on outside click */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </section>
  );
}
