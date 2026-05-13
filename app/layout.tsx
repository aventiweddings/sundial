import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sundial — Wedding timelines, beautifully timed.',
  description: 'AI-powered wedding day timelines. Golden hour auto-scheduled. Vendor windows enforced. Export-ready in seconds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-inter antialiased bg-[#FAF7F2] text-slate-800">
        {children}
      </body>
    </html>
  );
}
