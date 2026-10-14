'use client';

import { useEffect } from 'react';

/**
 * İşlem platformunun kabuğu (üst şerit, menü, içerik alanı, masaüstü kenar panelleri).
 * Ekranları lib/trading/engine.ts çizer; bileşen yalnızca kabuğu kurar ve motoru başlatır.
 */
export default function TradingApp() {
  useEffect(() => {
    if (/[?&]demo=1\b/.test(location.search)) document.documentElement.classList.add('in-frame');
    let cancelled = false;
    import('@/lib/trading/engine').then((m) => { if (!cancelled) void m.boot(); });
    return () => { cancelled = true; };
  }, []);

  const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2 } as const;
  return (
    <>
      <noscript><p style={{ padding: 24, fontFamily: 'sans-serif' }}>Meridyen Yatırım işlem platformu için JavaScript açık olmalıdır.</p></noscript>
      <div className="shell">
        <aside className="dside" id="dside" aria-label="Uygulama menüsü" />
        <div className="app">
          <div id="sky" aria-hidden="true" />
          <div className="top">
            <div className="topbar">
              <a className="logo" href="/" aria-label="Meridyen Yatırım ana sayfa" target="_top">M</a>
              <div className="tmarq" aria-hidden="true"><div className="tmtrack" id="tmtrack" /></div>
            </div>
            <nav className="menu" id="menu" aria-label="Ana menü">
              <button data-screen="home"><svg {...svg}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>Piyasalar</button>
              <button data-screen="portfolio"><svg {...svg}><path d="M21 12a9 9 0 1 1-9-9v9z" /><path d="M21 12h-9" /></svg>Portföy</button>
              <button data-screen="ticket"><svg {...svg}><path d="M7 17l-4-4 4-4M3 13h12M17 7l4 4-4 4M21 11H9" /></svg>Al · Sat</button>
              <button data-screen="watch"><svg {...svg}><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8z" /></svg>Takip</button>
              <button className="profile" data-screen="profile" aria-label="Profil" title="Profil"><svg {...svg}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg></button>
            </nav>
          </div>
          <main id="main" />
        </div>
        <aside className="drail" id="drail" aria-label="Özet" />
      </div>
      <div id="layer" />
    </>
  );
}
