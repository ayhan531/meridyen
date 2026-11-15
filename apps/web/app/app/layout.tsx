import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/fonts.css';

export const metadata: Metadata = { title: 'Kuzey Menkul Değerler — E-Şube', robots: { index: false, follow: false } };
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, minimumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#ffffff',
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}
