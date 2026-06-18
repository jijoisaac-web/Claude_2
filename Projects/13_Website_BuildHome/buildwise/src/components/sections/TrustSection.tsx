'use client';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import { Globe, Database, TrendingUp, Users, Award, Shield } from 'lucide-react';

const STATS = [
  { value: 120, suffix: '+', label: 'Countries Covered', icon: Globe, color: 'text-blue-500' },
  { value: 5000, suffix: '+', label: 'Cities Supported', icon: Database, color: 'text-emerald-500' },
  { value: 98, suffix: '%', label: 'Accuracy Rate', icon: TrendingUp, color: 'text-purple-500' },
  { value: 250000, suffix: '+', label: 'Estimates Generated', icon: Users, color: 'text-amber-500' },
];

const FEATURES = [
  {
    icon: Globe,
    title: 'Global Coverage',
    description: 'Construction cost data for 120+ countries and 5,000+ cities, updated with real market rates.',
    gradient: 'from-blue-500/10 to-blue-600/5',
    iconBg: 'bg-blue-500/10 text-blue-600'
  },
  {
    icon: TrendingUp,
    title: 'Intelligent Cost Modeling',
    description: 'Our algorithms factor in local labor costs, material prices, climate requirements and permit fees.',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    iconBg: 'bg-emerald-500/10 text-emerald-600'
  },
  {
    icon: Shield,
    title: 'Professional Methodology',
    description: 'Cost models validated by licensed quantity surveyors and construction professionals worldwide.',
    gradient: 'from-purple-500/10 to-purple-600/5',
    iconBg: 'bg-purple-500/10 text-purple-600'
  },
  {
    icon: Award,
    title: 'Local Currency Support',
    description: 'Automatic conversion to 50+ local currencies so you always see costs in your local context.',
    gradient: 'from-amber-500/10 to-amber-600/5',
    iconBg: 'bg-amber-500/10 text-amber-600'
  },
];

export default function TrustSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto" ref={ref}>
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
          {STATS.map(({ value, suffix, label, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div className={`text-4xl md:text-5xl font-bold tracking-tight ${color}`}>
                {inView ? (
                  <CountUp
                    start={0}
                    end={value}
                    duration={2}
                    separator=","
                    suffix={suffix}
                  />
                ) : `0${suffix}`}
              </div>
              <div className="text-gray-500 text-sm mt-2 font-medium">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            <Shield size={14} />
            Why BuildWise Global
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
            Construction Intelligence<br />
            <span className="gradient-text">Built For Precision</span>
          </h2>
          <p className="text-xl text-gray-500 mt-4 max-w-2xl mx-auto leading-relaxed">
            We combine global market data with local expertise to give you the most accurate construction cost estimates available.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, gradient, iconBg }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.6 }}
              className={`premium-card bg-gradient-to-br ${gradient} border border-gray-100 p-6 rounded-2xl`}
            >
              <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-navy-900 text-base mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
