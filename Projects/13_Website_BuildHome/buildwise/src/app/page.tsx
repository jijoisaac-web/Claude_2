'use client';
import { useState } from 'react';
import HeroSection from '@/components/sections/HeroSection';
import TrustSection from '@/components/sections/TrustSection';
import HowItWorks from '@/components/sections/HowItWorks';
import FeaturedCountries from '@/components/sections/FeaturedCountries';
import GlobalIndexPreview from '@/components/sections/GlobalIndexPreview';
import ToolsSection from '@/components/sections/ToolsSection';
import EstimatorWizard from '@/components/estimator/EstimatorWizard';
import ResultsDashboard from '@/components/results/ResultsDashboard';
import { EstimateResult } from '@/data/costEngine';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

export default function HomePage() {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [selectedCountry, setSelectedCountry] = useState('');

  return (
    <>
      <HeroSection onCountrySelect={setSelectedCountry} />
      <TrustSection />
      <HowItWorks />

      {/* Estimator section */}
      <section id="estimator" className="section-padding bg-[#f7f8fa]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <Building2 size={14} />
              Construction Cost Estimator
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-navy-900 tracking-tight">
              Get Your Personalised<br />
              <span className="gradient-text">Build Cost Estimate</span>
            </h2>
            <p className="text-gray-500 text-lg mt-4 max-w-xl mx-auto">
              Answer a few questions about your project and get a detailed cost breakdown in seconds — completely free.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {result ? (
              <>
                <ResultsDashboard result={result} onReset={() => setResult(null)} />
              </>
            ) : (
              <EstimatorWizard
                initialCountry={selectedCountry}
                onResult={setResult}
              />
            )}
          </div>
        </div>
      </section>

      <GlobalIndexPreview />
      <FeaturedCountries />
      <ToolsSection />

      {/* CTA Banner */}
      <section className="py-20 bg-gradient-to-br from-navy-950 to-navy-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 70% 50%, #0ea5e9 0%, transparent 50%)'
          }}
        />
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Start Planning Your<br />
              Dream Home Today
            </h2>
            <p className="text-white/60 text-lg mb-8">
              Join thousands of homeowners who used BuildWise to plan their construction budget with confidence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="#estimator" className="btn-primary text-base px-8 py-4">
                Get Free Estimate
              </a>
              <a href="/global-index" className="btn-secondary text-base px-8 py-4">
                Explore Cost Index
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
