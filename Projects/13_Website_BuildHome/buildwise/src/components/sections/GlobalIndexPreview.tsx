'use client';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Link from 'next/link';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { GLOBAL_COST_INDEX } from '@/data/costEngine';

const CHEAPEST = GLOBAL_COST_INDEX.slice(0, 6);
const MOST_EXPENSIVE = [...GLOBAL_COST_INDEX].reverse().slice(0, 6);

export default function GlobalIndexPreview() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section className="section-padding bg-[#f7f8fa]" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-navy-950/5 text-navy-900 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            Global Construction Cost Index
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 tracking-tight">
            Construction Costs<br />
            <span className="gradient-text">Around The World</span>
          </h2>
          <p className="text-gray-500 text-lg mt-4 max-w-xl mx-auto">
            Compare standard construction cost per square foot across every country we track.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Cheapest */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-2 text-emerald-600 font-bold mb-5">
              <TrendingDown size={18} />
              Most Affordable Countries
            </div>
            <div className="space-y-3">
              {CHEAPEST.map((country, i) => (
                <Link
                  key={country.countryCode}
                  href={`/country/${country.countryCode.toLowerCase()}`}
                  className="flex items-center gap-3 group hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors"
                >
                  <span className="text-gray-300 text-xs font-bold w-4">{i + 1}</span>
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">
                      {country.countryName}
                    </div>
                    <div className="text-xs text-gray-400">{country.region}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 text-sm">${country.costPerSqftUSD}/sqft</div>
                    <div className="text-xs text-gray-400">${Math.round(country.costPerSqmUSD)}/sqm</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Most expensive */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-2 text-amber-600 font-bold mb-5">
              <TrendingUp size={18} />
              Premium Build Markets
            </div>
            <div className="space-y-3">
              {MOST_EXPENSIVE.map((country, i) => (
                <Link
                  key={country.countryCode}
                  href={`/country/${country.countryCode.toLowerCase()}`}
                  className="flex items-center gap-3 group hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors"
                >
                  <span className="text-gray-300 text-xs font-bold w-4">{i + 1}</span>
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm group-hover:text-amber-600 transition-colors">
                      {country.countryName}
                    </div>
                    <div className="text-xs text-gray-400">{country.region}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-600 text-sm">${country.costPerSqftUSD}/sqft</div>
                    <div className="text-xs text-gray-400">${Math.round(country.costPerSqmUSD)}/sqm</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="text-center">
          <Link
            href="/global-index"
            className="inline-flex items-center gap-2 bg-navy-950 text-white font-semibold px-8 py-4 rounded-xl hover:bg-navy-800 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-navy-900/20"
          >
            View Full Global Cost Index
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
