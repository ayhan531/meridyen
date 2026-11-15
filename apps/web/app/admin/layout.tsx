import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/fonts.css';

export const metadata: Metadata = { title: 'Meridyen Yatırım — Yönetim', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
