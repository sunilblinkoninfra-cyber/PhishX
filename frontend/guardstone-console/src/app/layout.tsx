import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { ErrorBoundary, ToastContainer } from '@/components/common';
import MainLayout from '@/components/layout/MainLayout';

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const robotoMono = Roboto_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Guardstone Console - Enterprise SOC',
  description:
    'Enterprise-grade Security Operations Center console for email threat detection and incident response',
  keywords: [
    'SOC',
    'SIEM',
    'Email Security',
    'Phishing Detection',
    'Threat Detection',
    'Enterprise Security',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased`}
      >
        <ErrorBoundary>
          <MainLayout>
            {children}
          </MainLayout>
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
