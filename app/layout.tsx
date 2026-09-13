import type { Metadata } from 'next';
import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Barlow_Condensed({ variable: '--font-display', subsets: ['latin'], weight: ['700', '800', '900'] });
const body = DM_Sans({ variable: '--font-body', subsets: ['latin'], weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://has-this-ever-been-litigated.dschnei1122.chatgpt.site'),
  title: 'Has This Ever Been Litigated?',
  description: 'Type anything. Someone may have gone to court over it.',
  openGraph: {
    title: 'Has This Ever Been Litigated?',
    description: 'Type anything. Someone may have gone to court over it.',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: 'Has This Ever Been Litigated? Type anything. Someone may have gone to court over it.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Has This Ever Been Litigated?',
    description: 'Type anything. Someone may have gone to court over it.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>;
}
