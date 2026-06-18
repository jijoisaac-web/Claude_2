import Link from 'next/link';
import { Building2, Globe, Mail, Twitter, Linkedin, Github } from 'lucide-react';

const footerLinks = {
  Platform: [
    { label: 'Construction Cost Estimator', href: '/#estimator' },
    { label: 'Global Cost Index', href: '/global-index' },
    { label: 'Country Comparison', href: '/compare' },
    { label: 'Cost Calculator Tools', href: '/tools' },
  ],
  Countries: [
    { label: 'Build Cost in USA', href: '/country/us' },
    { label: 'Build Cost in India', href: '/country/in' },
    { label: 'Build Cost in Malaysia', href: '/country/my' },
    { label: 'Build Cost in Australia', href: '/country/au' },
    { label: 'Build Cost in UAE', href: '/country/ae' },
    { label: 'Build Cost in UK', href: '/country/gb' },
  ],
  Resources: [
    { label: 'Construction Cost Guide', href: '/guides' },
    { label: 'Home Loan Estimator', href: '/tools#loan' },
    { label: 'ROI Calculator', href: '/tools#roi' },
    { label: 'FAQ', href: '/faq' },
  ],
  Company: [
    { label: 'About BuildWise', href: '/about' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'For Builders & Architects', href: '/partners' },
    { label: 'Advertise', href: '/advertise' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0a1929] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-white/[0.06]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">
                Build<span className="text-emerald-400">Wise</span>
              </span>
            </Link>
            <p className="text-white/45 text-sm leading-relaxed mb-4">
              The world's leading construction cost intelligence platform. Estimate building costs in 120+ countries.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.12] transition-colors">
                <Twitter size={14} className="text-white/60" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.12] transition-colors">
                <Linkedin size={14} className="text-white/60" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.12] transition-colors">
                <Github size={14} className="text-white/60" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/45 text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Globe size={14} />
            <span>© 2024 BuildWise Global. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-white/30 text-sm">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            <Link href="/disclaimer" className="hover:text-white/60 transition-colors">Disclaimer</Link>
          </div>
          <div className="text-white/20 text-xs">
            Cost estimates are indicative. Always consult local professionals.
          </div>
        </div>
      </div>
    </footer>
  );
}
