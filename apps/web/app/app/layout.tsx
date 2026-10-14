import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/app.css';
import '@/styles/web.css';

export const metadata: Metadata = { title: 'Meridyen Yatırım — İşlem Platformu', robots: { index: false } };
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, minimumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#143630',
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}
