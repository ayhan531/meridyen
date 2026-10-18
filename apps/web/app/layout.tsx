import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/fonts.css';

export const metadata: Metadata = {
  title: 'Meridyen Yatırım',
  icons: { icon: '/img/favicon.svg' },
};

const THEME_JS = "try{var t=localStorage.getItem('meridyen_theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_JS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
