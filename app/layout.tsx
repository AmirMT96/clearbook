import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clearbook — Persönliche Buchhaltung',
  description: 'Dein persönlicher Finanz-Begleiter.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Clearbook',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#001e40',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
