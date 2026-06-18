'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Paintbrush, Waves, Sun, Cpu, Flower2, Calculator, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function LoanCalculator() {
  const [loanAmt, setLoanAmt] = useState(300000);
  const [rate, setRate] = useState(5.5);
  const [years, setYears] = useState(30);

  const monthly = loanAmt * ((rate/100/12) * Math.pow(1 + rate/100/12, years*12)) / (Math.pow(1 + rate/100/12, years*12) - 1);
  const total = monthly * years * 12;
  const interest = total - loanAmt;

  return (
    <div id="loan" className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <DollarSign size={18} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-navy-900 text-lg">Home Loan Estimator</h3>
          <p className="text-gray-400 text-sm">Calculate your monthly mortgage payments</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Loan Amount (USD)', value: loanAmt, set: setLoanAmt, min: 50000, max: 5000000, step: 10000, prefix: '$' },
          { label: 'Interest Rate (%)', value: rate, set: setRate, min: 1, max: 15, step: 0.1, prefix: '' },
          { label: 'Loan Term (years)', value: years, set: setYears, min: 5, max: 30, step: 5, prefix: '' },
        ].map(({ label, value, set, min, max, step }) => (
          <div key={label}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full accent-emerald-500 mb-1"
            />
            <div className="text-lg font-bold text-navy-900">{value.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Monthly Payment', value: `$${Math.round(monthly).toLocaleString()}`, color: 'text-emerald-600' },
          { label: 'Total Repayment', value: `$${Math.round(total).toLocaleString()}`, color: 'text-navy-900' },
          { label: 'Total Interest', value: `$${Math.round(interest).toLocaleString()}`, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ROICalculator() {
  const [buildCost, setBuildCost] = useState(400000);
  const [landCost, setLandCost] = useState(150000);
  const [marketValue, setMarketValue] = useState(700000);
  const [annualRent, setAnnualRent] = useState(24000);

  const totalInvestment = buildCost + landCost;
  const equity = marketValue - totalInvestment;
  const equityPct = (equity / totalInvestment * 100).toFixed(1);
  const grossYield = (annualRent / totalInvestment * 100).toFixed(2);
  const paybackYears = (totalInvestment / annualRent).toFixed(1);

  return (
    <div id="roi" className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <TrendingUp size={18} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-navy-900 text-lg">Property Investment ROI</h3>
          <p className="text-gray-400 text-sm">Forecast your investment returns</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Build Cost (USD)', value: buildCost, set: setBuildCost, min: 50000, max: 3000000, step: 10000 },
          { label: 'Land Cost (USD)', value: landCost, set: setLandCost, min: 10000, max: 2000000, step: 10000 },
          { label: 'Expected Market Value', value: marketValue, set: setMarketValue, min: 100000, max: 5000000, step: 10000 },
          { label: 'Annual Rental Income', value: annualRent, set: setAnnualRent, min: 5000, max: 200000, step: 1000 },
        ].map(({ label, value, set, min, max, step }) => (
          <div key={label}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => set(Number(e.target.value))} className="w-full accent-emerald-500 mb-1" />
            <div className="font-bold text-navy-900">${value.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Investment', value: `$${totalInvestment.toLocaleString()}`, sub: 'Build + Land' },
          { label: 'Equity Gain', value: `$${equity.toLocaleString()}`, sub: `+${equityPct}%` },
          { label: 'Gross Rental Yield', value: `${grossYield}%`, sub: 'Per annum' },
          { label: 'Payback Period', value: `${paybackYears} yrs`, sub: 'From rental income' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-gray-50 rounded-2xl p-4">
            <div className="text-xl font-bold text-navy-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            <div className="text-xs text-emerald-600 font-semibold">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const OTHER_TOOLS = [
  { id: 'interior', icon: Paintbrush, label: 'Interior Design Estimator', desc: 'Get cost estimates for furnishing and interior design by room type and quality level.', color: 'bg-pink-50 text-pink-600' },
  { id: 'pool', icon: Waves, label: 'Swimming Pool Planner', desc: 'Estimate pool installation costs based on pool type, size, and location.', color: 'bg-cyan-50 text-cyan-600' },
  { id: 'solar', icon: Sun, label: 'Solar Installation Cost', desc: 'Calculate the cost of installing solar panels based on system size and your country.', color: 'bg-yellow-50 text-yellow-600' },
  { id: 'smart', icon: Cpu, label: 'Smart Home System Cost', desc: 'Budget for home automation, security, AV, and smart appliance integration.', color: 'bg-violet-50 text-violet-600' },
  { id: 'landscape', icon: Flower2, label: 'Landscaping Cost Planner', desc: 'Estimate garden design, driveway, fencing and outdoor living costs.', color: 'bg-green-50 text-green-600' },
  { id: 'renovation', icon: Calculator, label: 'Renovation Cost Calculator', desc: 'Kitchen and bathroom renovation estimates by size and finish quality.', color: 'bg-orange-50 text-orange-600' },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="bg-navy-950 pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/[0.06] text-white/70 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              Construction Planning Tools
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              Plan Every Aspect<br />
              <span className="gradient-text-light">Of Your Build</span>
            </h1>
            <p className="text-white/50 text-lg max-w-xl">
              From loan calculations to ROI forecasting — everything you need to plan your construction project with confidence.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <LoanCalculator />
        <ROICalculator />

        {/* Other tools grid */}
        <div>
          <h2 className="text-2xl font-bold text-navy-900 mb-6">More Planning Tools</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OTHER_TOOLS.map(({ id, icon: Icon, label, desc, color }) => (
              <div key={id} id={id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all group premium-card">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{label}</h3>
                <p className="text-gray-500 text-sm mb-4">{desc}</p>
                <div className="text-sm text-emerald-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Coming soon <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center py-8">
          <Link href="/#estimator" className="inline-flex items-center gap-2 bg-navy-950 text-white font-semibold px-8 py-4 rounded-xl hover:bg-navy-800 transition-all hover:-translate-y-0.5">
            <Building2 size={16} />
            Back to Cost Estimator
          </Link>
        </div>
      </div>
    </div>
  );
}
