'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Globe, BarChart3, Wrench, ChevronDown, Menu, X, ArrowRight } from 'lucide-react';

const navItems = [
  {
    label: 'Estimator',
    href: '/#estimator',
    icon: Building2,
    description: 'Get your personalized build cost estimate'
  },
  {
    label: 'Global Index',
    href: '/global-index',
    icon: Globe,
    description: 'Construction costs ranked by country'
  },
  {
    label: 'Compare',
    href: '/compare',
    icon: BarChart3,
    description: 'Compare costs across countries and cities'
  },
  {
    label: 'Tools',
    href: '/tools',
    icon: Wrench,
    description: 'Loan calculator, ROI planner and more'
  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'py-3 bg-[#0a1929]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-2xl'
            : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Build<span className="text-emerald-400">Wise</span>
              <span className="text-white/50 font-normal text-sm ml-1">Global</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
              >
                <item.icon size={15} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/#estimator"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5"
            >
              Start Estimating
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[64px] z-40 bg-[#0a1929]/95 backdrop-blur-2xl border-b border-white/10 md:hidden"
          >
            <nav className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <item.icon size={16} className="text-white/70 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{item.label}</div>
                    <div className="text-white/50 text-xs mt-0.5">{item.description}</div>
                  </div>
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-white/10">
                <Link
                  href="/#estimator"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-semibold py-3 rounded-xl"
                >
                  Start Estimating
                  <ArrowRight size={16} />
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
