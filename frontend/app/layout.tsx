import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'CareerPilot AI - Your AI Career Coach',
  description: 'AI-powered career platform with resume analysis, mock interviews, LinkedIn optimization, and job matching.',
  keywords: ['career', 'AI', 'resume', 'interview', 'job search', 'LinkedIn', 'career coach'],
  authors: [{ name: 'CareerPilot AI' }],
  openGraph: {
    title: 'CareerPilot AI - Your AI Career Coach',
    description: 'AI-powered career platform with resume analysis, mock interviews, LinkedIn optimization, and job matching.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
