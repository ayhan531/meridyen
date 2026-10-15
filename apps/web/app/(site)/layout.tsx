import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/site.css';
import '@/styles/corp.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#143630' };

export default function SiteLayout({ children }: { children: ReactNode }) {
  return children;
}
