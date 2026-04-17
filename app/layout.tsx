import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clearbook',
  description: 'Dein persoenlicher Finanz-Begleiter.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.png', type: 'image/png', sizes: '256x256' },
    ],
    apple: '/apple-touch-icon.png',
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Try to get dark_mode preference from profile
  let darkMode = false;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
                cookieStore.set(name, value, options)
              );
            } catch { /* read-only */ }
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('dark_mode').eq('id', user.id).maybeSingle();
      darkMode = data?.dark_mode ?? false;
    }
  } catch { /* ignore on public pages */ }

  return (
    <html lang="de" className={darkMode ? 'dark' : ''}>
      <body className="dark:bg-gray-950 dark:text-gray-100">{children}</body>
    </html>
  );
}
