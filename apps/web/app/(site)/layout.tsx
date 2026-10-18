import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/site.css';
import '@/styles/corp.css';
import '@/styles/corp2.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#143630' };

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (<>{children}<noscript><style>{'.rv,.rv>*{opacity:1!important;transform:none!important;filter:none!important}'}</style></noscript></>);
}
