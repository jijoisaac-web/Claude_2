'use client';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Link from 'next/link';
import { DollarSign, TrendingUp, Paintbrush, Waves, Sun, Cpu, Flower2, Calculator, ArrowRight } from 'lucide-react';

const TOOLS = [
  { icon: DollarSign, label: 'Home Loan Estimator', desc: 'Calculate monthly repayments', href: '/tools#loan', color: 'bg-blue-50 text-blue-600' },
  { icon: TrendingUp, label: 'Property ROI Calculator', desc: 'Forecast investment returns', href: '/tools#roi', color: 'bg-emerald-50 text-emerald-600' },
  { icon: Paintbrush, label: 'Interior Design Cost', desc: 'Room-by-room estimates', href: '/tools#interior', color: 'bg-pink-50 text-pink-600' },
  { icon: Waves, label: 'Swimming Pool Planner', desc: 'Pool installation costs', href: '/tools#pool', color: 'bg-cyan-50 text-cyan-600' },
  { icon: Sun, label: 'Solar Installation Cost', desc: 'PV system cost estimates', href: '/tools#solar', color: 'bg-yellow-50 text-yellow-600' },
  { icon: Cpu, label: 'Smart Home Estimator', desc: 'Automation & AV systems', href: '/tools#smart', color: 'bg-violet-50 text-violet-600' },
  { icon: Flower2, label: 'Landscaping Planner', desc: 'Garden & outdoor costs', href: '/tools#landscape', color: 'bg-green-50 text-green-600' },
  { icon: Calculator, label: 'Renovation Calculator', desc: 'Kitchen & bathroom upgrades', href: '/tools#renovation', color: 'bg-orange-50 text-orange-600' },
];

export default function ToolsSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section className="section-padding bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 bg-navy-950/5 text-navy-900 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              Additional Tools
            </div>
            <h2 className="text-4xl font-bold text-navy-900 tracking-tight">
              Everything You Need<br />
              To Plan Your Build
            </h2>
          </div>
          <Link href="/tools" className="flex items-center gap-2 text-navy-900 font-semibold hover:text-emerald-600 transition-colors flex-shrink-0">
            View all tools <ArrowRight size={16} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TOOLS.map(({ icon: Icon, label, desc, href, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.07 }}
            >
              <Link
                href={href}
                className="group flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white premium-card"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm mb-0.5">{label}</div>
                  <div className="text-gray-400 text-xs">{desc}</div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-1 transition-all mt-auto" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
