'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import {
  Building2, DollarSign, Ruler, Clock, TrendingUp, Download,
  RefreshCw, Share2, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { EstimateResult } from '@/data/costEngine';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

interface Props {
  result: EstimateResult;
  onReset?: () => void;
}

function AnimatedStat({ value, label, prefix = '', suffix = '', color = '' }: {
  value: number; label: string; prefix?: string; suffix?: string; color?: string;
}) {
  const { ref, inView } = useInView({ triggerOnce: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <div className={`text-3xl font-bold tracking-tight ${color || 'text-navy-900'}`}>
        {inView ? (
          <CountUp
            start={0}
            end={value}
            duration={1.8}
            separator=","
            prefix={prefix}
            suffix={suffix}
            decimals={value % 1 !== 0 ? 1 : 0}
          />
        ) : `${prefix}0${suffix}`}
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 text-sm">
        <div className="font-bold text-gray-900 mb-1">{item.category}</div>
        <div className="text-gray-500">{item.description}</div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="font-semibold text-emerald-600">${Math.round(item.costUSD).toLocaleString()}</span>
          <span className="text-gray-400">{item.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ResultsDashboard({ result, onReset }: Props) {
  const [expandBreakdown, setExpandBreakdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { ref: sectionRef, inView } = useInView({ triggerOnce: true });

  const loanRate = 0.055;
  const loanAmount = result.totalCostUSD * 0.8;
  const monthlyRate = loanRate / 12;
  const payments = 360;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      ref={sectionRef}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-2">
                <CheckCircle2 size={15} />
                Estimate Complete
              </div>
              <h2 className="text-3xl font-bold text-white leading-tight">
                {result.qualityLabel} Home in<br />
                <span className="text-emerald-400">{result.cityName}</span>
              </h2>
              <p className="text-white/50 text-sm mt-2">
                {Math.round(result.areaSqft).toLocaleString()} sqft · {result.qualityLabel} Quality
              </p>
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-2 text-white/50 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
            >
              <RefreshCw size={14} />
              Recalculate
            </button>
          </div>

          {/* Main cost */}
          <div className="mb-8">
            <div className="text-white/50 text-sm mb-1">Total Estimated Construction Cost</div>
            <div className="flex items-end gap-4">
              {inView && (
                <div className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                  <CountUp
                    start={0}
                    end={parseFloat(result.totalCostLocal.replace(/[^0-9.]/g, ''))}
                    duration={2}
                    separator=","
                    prefix={result.currencySymbol}
                    decimals={result.totalCostLocal.includes('.') ? 2 : 0}
                  />
                </div>
              )}
              <div className="pb-2">
                <div className="text-white/40 text-sm">{result.currencyCode}</div>
                <div className="text-white/30 text-xs">${Math.round(result.totalCostUSD).toLocaleString()} USD</div>
              </div>
            </div>
            <div className="text-white/40 text-sm mt-2">
              Range: {result.currencySymbol}{Math.round(result.minCostUSD * (1)).toLocaleString()} – {result.currencySymbol}{Math.round(result.maxCostUSD * (1)).toLocaleString()} {result.currencyCode}
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Per Sqft', value: result.costPerSqftLocal, icon: Ruler },
              { label: 'Per Sqm', value: result.costPerSqmLocal, icon: Ruler },
              { label: 'Monthly Loan', value: result.monthlyLoanEstimate, icon: DollarSign },
              { label: 'Build Time', value: result.projectTimeline, icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/[0.06] rounded-2xl p-4">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
                  <Icon size={13} />
                  {label}
                </div>
                <div className="text-white font-bold text-lg leading-tight">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy-900 text-lg mb-1">Cost Breakdown</h3>
          <p className="text-gray-400 text-sm mb-4">Where your construction budget goes</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={result.breakdown}
                dataKey="percentage"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={55}
                paddingAngle={2}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {result.breakdown.map((entry, index) => (
                  <Cell
                    key={entry.category}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar breakdown */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-navy-900 text-lg mb-1">Category Details</h3>
              <p className="text-gray-400 text-sm">Individual cost line items</p>
            </div>
            <button
              onClick={() => setExpandBreakdown(!expandBreakdown)}
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600 transition-colors"
            >
              {expandBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandBreakdown ? 'Less' : 'More'}
            </button>
          </div>

          <div className="space-y-2.5">
            {result.breakdown.slice(0, expandBreakdown ? undefined : 6).map((item, i) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate">{item.category}</span>
                    <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">
                      {result.currencySymbol}{Math.round(item.costUSD * (result.totalCostLocal.includes('M') ? 1 : 1)).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{item.percentage}%</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Loan summary */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1">
              <TrendingUp size={16} />
              Home Loan Estimate
            </div>
            <p className="text-gray-500 text-sm">Based on 30-year mortgage at 5.5% interest, 20% down payment</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Property Value', value: result.totalCostLocal },
            { label: 'Down Payment (20%)', value: `${result.currencySymbol}${Math.round(result.totalCostUSD * 0.2 * (1)).toLocaleString()}` },
            { label: 'Loan Amount', value: `${result.currencySymbol}${Math.round(result.totalCostUSD * 0.8 * (1)).toLocaleString()}` },
            { label: 'Monthly Payment', value: result.monthlyLoanEstimate },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-4">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="font-bold text-navy-900 text-lg">{value}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">* Indicative estimate only. Rates vary by lender and location. Consult a financial advisor.</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onReset}
          className="flex items-center gap-2 bg-navy-950 text-white font-semibold px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors"
        >
          <RefreshCw size={16} />
          New Estimate
        </button>
        <a
          href="/compare"
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Building2 size={16} />
          Compare Countries
        </a>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Download size={16} />
          Save Estimate
        </button>
        <button
          onClick={() => navigator.share?.({ title: 'BuildWise Estimate', url: window.location.href })}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </motion.div>
  );
}
