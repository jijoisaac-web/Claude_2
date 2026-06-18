import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BuildWise Global — Construction Cost Estimator for 120+ Countries',
  description: 'Estimate the cost of building a house anywhere in the world. Get accurate construction cost estimates for 120+ countries and 5,000+ cities with local currency support.',
  keywords: ['construction cost estimator', 'building cost calculator', 'house construction cost', 'global construction costs', 'building cost by country'],
  openGraph: {
    title: 'BuildWise Global — Know Exactly What Your Dream Home Will Cost',
    description: 'Estimate construction costs across countries, cities and property types with intelligent cost modeling.',
    type: 'website',
    siteName: 'BuildWise Global',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BuildWise Global',
    description: 'Construction Cost Intelligence Platform for 120+ Countries',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0a1929" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
