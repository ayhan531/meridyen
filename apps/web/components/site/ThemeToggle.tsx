'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [t, setT] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    setT(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  }, []);
  const flip = () => {
    const n = t === 'dark' ? 'light' : 'dark';
    setT(n);
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('meridyen_theme', n); } catch {}
  };
  return (
    <button type="button" className="theme-btn" onClick={flip} aria-label={t === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'} title={t === 'dark' ? 'Açık mod' : 'Koyu mod'}>
      {t === 'dark' ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></svg>
      ) : (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" /></svg>
      )}
    </button>
  );
}
