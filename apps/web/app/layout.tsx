import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/fonts.css';

export const metadata: Metadata = {
  title: 'Meridyen Yatırım',
  icons: { icon: '/img/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
