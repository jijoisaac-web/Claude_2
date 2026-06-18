'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Building2, Ruler, Star, BedDouble, Bath,
  Car, Waves, Sun, Cpu, Flower2, ChevronRight, ChevronLeft,
  CheckCircle2, Sparkles
} from 'lucide-react';
import { COUNTRIES } from '@/data/countries';
import { getCitiesByCountry } from '@/data/cities';
import {
  EstimateInput, calculateEstimate, EstimateResult,
  PropertyType, QualityTier, AreaUnit, GarageType
} from '@/data/costEngine';

interface Props {
  initialCountry?: string;
  onResult?: (result: EstimateResult) => void;
}

const PROPERTY_TYPES: { id: PropertyType; label: string; icon: string; description: string }[] = [
  { id: 'single-storey', label: 'Single Storey', icon: '🏠', description: 'Ground floor only' },
  { id: 'double-storey', label: 'Double Storey', icon: '🏡', description: 'Two floors' },
  { id: 'villa', label: 'Villa', icon: '🏛️', description: 'Spacious standalone' },
  { id: 'luxury', label: 'Luxury Home', icon: '💎', description: 'Ultra-premium finishes' },
  { id: 'apartment', label: 'Apartment', icon: '🏢', description: 'Multi-unit building' },
  { id: 'duplex', label: 'Duplex', icon: '🏘️', description: 'Two attached units' },
  { id: 'townhouse', label: 'Townhouse', icon: '🏙️', description: 'Multi-level terraced' },
];

const QUALITY_TIERS: { id: QualityTier; label: string; icon: string; description: string; color: string }[] = [
  { id: 'economy', label: 'Economy', icon: '💼', description: 'Basic materials, functional design', color: 'from-slate-500 to-slate-600' },
  { id: 'standard', label: 'Standard', icon: '🏆', description: 'Good quality, popular choices', color: 'from-blue-500 to-blue-600' },
  { id: 'premium', label: 'Premium', icon: '⭐', description: 'High-end materials, premium finishes', color: 'from-purple-500 to-purple-600' },
  { id: 'luxury', label: 'Ultra-Luxury', icon: '💎', description: 'World-class, no-expense-spared', color: 'from-amber-500 to-orange-500' },
];

const STEPS = [
  { id: 1, label: 'Location', icon: MapPin },
  { id: 2, label: 'Property', icon: Building2 },
  { id: 3, label: 'Size', icon: Ruler },
  { id: 4, label: 'Quality', icon: Star },
  { id: 5, label: 'Features', icon: Sparkles },
];

export default function EstimatorWizard({ initialCountry = '', onResult }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<EstimateInput>>({
    countryCode: initialCountry,
    propertyType: 'single-storey',
    qualityTier: 'standard',
    area: 1500,
    areaUnit: 'sqft',
    bedrooms: 3,
    bathrooms: 2,
    garage: 'single',
    includePool: false,
    includeSolar: false,
    includeSmartHome: false,
    includeLandscaping: false,
  });
  const [countrySearch, setCountrySearch] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const selectedCountry = COUNTRIES.find(c => c.code === form.countryCode);
  const cities = form.countryCode ? getCitiesByCountry(form.countryCode) : [];

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1);
    else handleCalculate();
  };

  const handleCalculate = () => {
    if (!form.countryCode || !form.propertyType || !form.qualityTier || !form.area) return;
    setIsCalculating(true);
    setTimeout(() => {
      try {
        const result = calculateEstimate(form as EstimateInput);
        onResult?.(result);
      } catch (e) { console.error(e); }
      setIsCalculating(false);
    }, 1200);
  };

  const canProceed = () => {
    if (step === 1) return !!form.countryCode;
    if (step === 2) return !!form.propertyType;
    if (step === 3) return form.area && form.area > 0;
    if (step === 4) return !!form.qualityTier;
    return true;
  };

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 10)
    : COUNTRIES.slice(0, 18);

  return (
    <div className="bg-white rounded-3xl shadow-2xl shadow-navy-900/10 overflow-hidden">
      {/* Progress bar */}
      <div className="bg-gradient-to-r from-navy-950 to-navy-800 px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-xl">Construction Cost Estimator</h2>
          <span className="text-white/50 text-sm font-medium">Step {step} of 5</span>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => step > s.id && setStep(s.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  step > s.id ? 'text-emerald-400 cursor-pointer' :
                  step === s.id ? 'text-white' : 'text-white/30'
                }`}
              >
                {step > s.id ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                    step === s.id ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400' : 'border-white/20 text-white/30'
                  }`}>{s.id}</div>
                )}
                <span className="hidden md:block">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded transition-all duration-500 ${step > s.id ? 'bg-emerald-400' : 'bg-white/15'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-8">
        <AnimatePresence mode="wait">
          {/* STEP 1: Location */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-navy-900 mb-1">Where are you building?</h3>
              <p className="text-gray-500 mb-6">Select your country and city for accurate local pricing</p>

              <input
                type="text"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm text-gray-700 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 max-h-72 overflow-y-auto pr-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setForm({ ...form, countryCode: country.code, cityName: undefined })}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                      form.countryCode === country.code
                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-gray-900 truncate">{country.name}</div>
                      <div className="text-[11px] text-gray-400">{country.currencyCode}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* City selection */}
              {form.countryCode && cities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select City <span className="text-gray-400 font-normal">(optional, for more accurate pricing)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {cities.slice(0, 8).map((city) => (
                      <button
                        key={city.name}
                        onClick={() => setForm({ ...form, cityName: city.name })}
                        className={`text-sm px-3.5 py-2 rounded-lg border transition-all ${
                          form.cityName === city.name
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 2: Property type */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-navy-900 mb-1">What type of property?</h3>
              <p className="text-gray-500 mb-6">Property structure affects total construction cost</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setForm({ ...form, propertyType: pt.id })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                      form.propertyType === pt.id
                        ? 'border-emerald-400 bg-emerald-50 shadow-md'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-3xl">{pt.icon}</span>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{pt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{pt.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Size */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-navy-900 mb-1">Property size & rooms</h3>
              <p className="text-gray-500 mb-6">Enter the total floor area and room count</p>

              {/* Area */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Floor Area</label>
                <div className="flex gap-2 mb-3">
                  {(['sqft', 'sqm'] as AreaUnit[]).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => {
                        const converted = unit === 'sqm'
                          ? Math.round((form.area || 1500) / 10.764)
                          : Math.round((form.area || 140) * 10.764);
                        setForm({ ...form, areaUnit: unit, area: converted });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                        form.areaUnit === unit
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {unit === 'sqft' ? 'Square Feet' : 'Square Metres'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={form.areaUnit === 'sqft' ? 400 : 40}
                    max={form.areaUnit === 'sqft' ? 15000 : 1400}
                    step={form.areaUnit === 'sqft' ? 50 : 5}
                    value={form.area || 1500}
                    onChange={(e) => setForm({ ...form, area: Number(e.target.value) })}
                    className="flex-1 accent-emerald-500"
                  />
                  <div className="w-32 text-center">
                    <input
                      type="number"
                      value={form.area || ''}
                      onChange={(e) => setForm({ ...form, area: Number(e.target.value) })}
                      className="w-full text-center border border-gray-200 rounded-xl px-3 py-2 text-lg font-bold text-navy-900 focus:outline-none focus:border-emerald-400"
                    />
                    <div className="text-xs text-gray-400 mt-1">{form.areaUnit}</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                  <span>Small Studio</span>
                  <span>Mansion</span>
                </div>
              </div>

              {/* Bedrooms & Bathrooms */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { key: 'bedrooms', label: 'Bedrooms', icon: BedDouble },
                  { key: 'bathrooms', label: 'Bathrooms', icon: Bath }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Icon size={14} /> {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setForm({ ...form, [key]: Math.max(1, (form[key as keyof typeof form] as number) - 1) })}
                        className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors"
                      >-</button>
                      <span className="w-12 text-center font-bold text-xl text-navy-900">
                        {form[key as keyof typeof form] as number}
                      </span>
                      <button
                        onClick={() => setForm({ ...form, [key]: Math.min(10, (form[key as keyof typeof form] as number) + 1) })}
                        className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Garage */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Car size={14} /> Garage
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['none', 'single', 'double', 'triple'] as GarageType[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm({ ...form, garage: g })}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all capitalize ${
                        form.garage === g
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {g === 'none' ? 'No Garage' : `${g.charAt(0).toUpperCase() + g.slice(1)} Car`}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Quality */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-navy-900 mb-1">Construction quality level</h3>
              <p className="text-gray-500 mb-6">Quality significantly impacts total cost</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUALITY_TIERS.map((qt) => (
                  <button
                    key={qt.id}
                    onClick={() => setForm({ ...form, qualityTier: qt.id })}
                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                      form.qualityTier === qt.id
                        ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${qt.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                      {qt.icon}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{qt.label}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{qt.description}</div>
                      {selectedCountry && (
                        <div className="text-xs text-emerald-600 font-semibold mt-2">
                          ~${(selectedCountry.baseCostUSD * (
                            qt.id === 'economy' ? selectedCountry.economyMultiplier :
                            qt.id === 'premium' ? selectedCountry.premiumMultiplier :
                            qt.id === 'luxury' ? selectedCountry.luxuryMultiplier : 1
                          )).toFixed(0)}/sqft in {selectedCountry.name}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 5: Features */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-navy-900 mb-1">Additional features</h3>
              <p className="text-gray-500 mb-6">Select any premium additions to include in your estimate</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'includePool', icon: Waves, label: 'Swimming Pool', desc: 'In-ground pool with decking', cost: '~$25K–$60K' },
                  { key: 'includeSolar', icon: Sun, label: 'Solar Installation', desc: '6–10kW rooftop solar system', cost: '~$15K–$30K' },
                  { key: 'includeSmartHome', icon: Cpu, label: 'Smart Home System', desc: 'Automation, security & AV', cost: '~$12K–$40K' },
                  { key: 'includeLandscaping', icon: Flower2, label: 'Landscaping', desc: 'Gardens, driveway, pathways', cost: '~$8K–$25K' },
                ].map(({ key, icon: Icon, label, desc, cost }) => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, [key]: !form[key as keyof typeof form] })}
                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      form[key as keyof typeof form]
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      form[key as keyof typeof form] ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-1">{cost} USD</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      form[key as keyof typeof form] ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                    }`}>
                      {form[key as keyof typeof form] && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Summary */}
              {selectedCountry && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-5 bg-gradient-to-br from-navy-950 to-navy-800 rounded-2xl"
                >
                  <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Your Estimate Summary</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-white/50">Country</span>
                      <div className="text-white font-semibold">{selectedCountry.flag} {selectedCountry.name}</div>
                    </div>
                    {form.cityName && (
                      <div>
                        <span className="text-white/50">City</span>
                        <div className="text-white font-semibold">{form.cityName}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-white/50">Property</span>
                      <div className="text-white font-semibold capitalize">{form.propertyType?.replace('-', ' ')}</div>
                    </div>
                    <div>
                      <span className="text-white/50">Area</span>
                      <div className="text-white font-semibold">{form.area?.toLocaleString()} {form.areaUnit}</div>
                    </div>
                    <div>
                      <span className="text-white/50">Quality</span>
                      <div className="text-white font-semibold capitalize">{form.qualityTier}</div>
                    </div>
                    <div>
                      <span className="text-white/50">Rooms</span>
                      <div className="text-white font-semibold">{form.bedrooms} bed / {form.bathrooms} bath</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-2.5 rounded-xl hover:bg-gray-100"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || isCalculating}
            className={`flex items-center gap-2 font-semibold text-sm px-7 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              step === 5
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5'
                : 'bg-navy-950 text-white hover:bg-navy-800'
            }`}
          >
            {isCalculating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Calculating...
              </>
            ) : step === 5 ? (
              <>
                <Sparkles size={16} />
                Get My Estimate
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
