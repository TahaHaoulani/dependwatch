import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { PostHogProvider } from '@/components/providers/posthog-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'DependWatch: Observability for every API and tool your software depends on',
  description:
    'Latency, failures, cost—for every API and tool your software depends on, including the ones your AI agents call. Catch degradation before your users do.',
};

/**
 * Root layout: minimal shell for all routes.
 * SessionProvider + QueryProvider live only in (app) layout so public pages (/, /pricing, etc.)
 * do not trigger /api/auth/session or heavy client hydration.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen`}
      >
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <PostHogProvider>
            {children}
            <Toaster />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
