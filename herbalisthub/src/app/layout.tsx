import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'HerbalistHub',
    template: '%s | HerbalistHub',
  },
  description: 'Professional herbalist practice management platform',
  keywords: ['herbalist', 'herbs', 'practice management', 'healthcare'],
  authors: [{ name: 'HerbalistHub Team' }],
  creator: 'HerbalistHub',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://herbalisthub.com',
    siteName: 'HerbalistHub',
    title: 'HerbalistHub - Professional Herbalist Practice Management',
    description: 'Comprehensive platform for herbalist practice management',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HerbalistHub',
    description: 'Professional herbalist practice management platform',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-token',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <div className="relative flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}