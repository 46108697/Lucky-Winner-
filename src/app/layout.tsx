import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lucky-winner.com';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Lucky Winner - Online Lottery & Gaming Platform',
    template: '%s | Lucky Winner',
  },
  description:
    'Play Lucky Winner online lottery and gaming platform. Safe, secure, and exciting experience with instant results. Try your luck today!',
  keywords: [
    'Lucky Winner',
    'online lottery',
    'play games',
    'win money',
    'gaming platform',
    'online matka',
    'results',
  ],
  robots: 'index, follow',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Lucky Winner - Online Lottery & Gaming Platform',
    description:
      'Safe, secure and exciting online lottery platform. Play and win instantly!',
    url: '/',
    siteName: 'Lucky Winner',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lucky Winner Game Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lucky Winner - Online Lottery & Gaming Platform',
    description:
      'Play games, bet smart, win big. Lucky Winner is your trusted online lottery platform.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1B5E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
