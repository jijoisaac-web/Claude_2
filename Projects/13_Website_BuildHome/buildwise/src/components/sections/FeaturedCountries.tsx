'use client';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { COUNTRIES } from '@/data/countries';

const FEATURED_CODES = ['US', 'IN', 'MY', 'AE', 'AU', 'SG', 'GB', 'DE', 'JP', 'ZA', 'BR', 'CA'];
const FEATURED = COUNTRIES.filter(c => FEATURED_CODES.includes(c.code));

export default function FeaturedCountries() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="section-padding bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 tracking-tight">
            Popular Destinations
          </h2>
          <p className="text-gray-500 text-lg mt-4">
            Explore construction costs in the world's most sought-after building markets
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {FEATURED.map((country, i) => (
            <motion.div
              key={country.code}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.06, duration: 0.5 }}
            >
              <Link
                href={`/country/${country.code.toLowerCase()}`}
                className="group relative block rounded-2xl overflow-hidden aspect-[4/3]"
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${country.heroImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{country.flag}</span>
                    <span className="text-white font-bold text-sm">{country.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-white/70 text-xs flex items-center gap-1">
                      <MapPin size={10} />
                      {country.popularCities.slice(0, 2).join(', ')}
                    </div>
                    <div className="text-emerald-400 font-bold text-xs">
                      ${country.baseCostUSD}/sqft
                    </div>
                  </div>
                </div>

                {/* Hover arrow */}
                <div className="absolute top-3 right-3 w-7 h-7 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ArrowRight size={13} className="text-white" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <Link
            href="/global-index"
            className="inline-flex items-center gap-2 text-navy-900 font-semibold hover:text-emerald-600 transition-colors"
          >
            View all 120+ countries
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
