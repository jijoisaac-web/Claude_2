'use client';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { MapPin, SlidersHorizontal, BarChart3, FileDown } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: MapPin,
    title: 'Choose Your Location',
    description: 'Select from 120+ countries and 5,000+ cities. Our platform automatically applies local construction rates and currency.',
    color: 'bg-blue-500',
    glow: 'shadow-blue-500/20'
  },
  {
    step: '02',
    icon: SlidersHorizontal,
    title: 'Set Your Specifications',
    description: 'Define property type, floor area, quality tier, number of rooms and any premium features you want included.',
    color: 'bg-emerald-500',
    glow: 'shadow-emerald-500/20'
  },
  {
    step: '03',
    icon: BarChart3,
    title: 'Get Instant Estimates',
    description: 'Our engine calculates a detailed breakdown of all construction costs in your local currency with realistic ranges.',
    color: 'bg-purple-500',
    glow: 'shadow-purple-500/20'
  },
  {
    step: '04',
    icon: FileDown,
    title: 'Plan Your Project',
    description: 'Use loan calculators, compare locations and export your estimate. Share with architects and builders.',
    color: 'bg-amber-500',
    glow: 'shadow-amber-500/20'
  },
];

export default function HowItWorks() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section className="section-padding bg-navy-950 relative overflow-hidden" ref={ref}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white/[0.06] text-white/70 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            How It Works
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            From Idea to Estimate<br />
            <span className="gradient-text-light">In Minutes</span>
          </h2>
          <p className="text-white/50 text-lg mt-4 max-w-xl mx-auto">
            No registration required. No hidden fees. Just accurate construction cost intelligence at your fingertips.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {STEPS.map(({ step, icon: Icon, title, description, color, glow }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] right-0 h-0.5 bg-white/[0.06]" />
              )}

              <div className="relative p-6 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                <div className="text-white/20 text-xs font-bold tracking-widest mb-4">{step}</div>
                <div className={`w-14 h-14 rounded-2xl ${color} shadow-xl ${glow} flex items-center justify-center mb-4`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
