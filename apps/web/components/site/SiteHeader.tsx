'use client';
import { useEffect, useState } from 'react';
import { Account, type User } from '@/lib/account';
import { INDICES, LOGO, STOCKS } from '@/lib/market-data';
import { arrow, cls, pct, tl } from './format';
import { useMarketTick, useSession } from './hooks';

/** Üst çubuk: marka, bölüm bağlantıları, oturuma göre düğmeler ve kayan değer şeridi. */
export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<User | null>(null);
  const s = useSession();
  useMarketTick();

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8); f();
    window.addEventListener('scroll', f, { passive: true });
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    void Account.load().then(setMe);
    return () => { window.removeEventListener('scroll', f); document.removeEventListener('keydown', esc); };
  }, []);

  const items = (hidden: boolean, k: string) => [
    <span key={k + 'st'} aria-hidden={hidden || undefined} className={`it st${s?.open ? ' on' : ''}`}><i /><b>{s ? s.label : 'Borsa'}</b><span>{s?.sub || ''}</span></span>,
    ...INDICES.map((x) => (
      <span key={k + 'i' + x.n} aria-hidden={hidden || undefined} className="it"><b>{x.n}</b><span className="num">{x.v}</span><em className={`num ${cls(x.c)}`}>{arrow(x.c)} {pct(x.c)}</em></span>
    )),
    ...STOCKS.slice(0, 12).map((x) => (
      <span key={k + 's' + x.s} aria-hidden={hidden || undefined} className="it">{LOGO[x.s] ? <img src={LOGO[x.s]} alt="" width={22} height={22} /> : null}<b>{x.s}</b><span className="num">{tl(x.p)}</span><em className={`num ${cls(x.c)}`}>{arrow(x.c)} {pct(x.c)}</em></span>
    )),
  ];

  return (
    <header className={`site-top${scrolled ? ' scrolled' : ''}`} id="top">
      <div className="wrap">
        <a className="brand" href="/" aria-label="Meridyen Yatırım ana sayfa"><span className="logo">M</span><span><b>Meridyen Yatırım</b><small>Borsa İstanbul işlem platformu</small></span></a>
        <nav className={`site-nav${open ? ' open' : ''}`} id="siteNav" aria-label="Sayfa bölümleri">
          {[['/#piyasalar', 'Piyasalar'], ['/hizmetler', 'Hizmetler'], ['/ucretler', 'Ücretler'], ['/sss', 'SSS'], ['/iletisim', 'İletişim']].map(([h, t]) => (
            <a key={h} href={h} onClick={() => setOpen(false)}>{t}</a>
          ))}
        </nav>
        <div className="acts" id="topActs">
          {me ? (
            <>
              <span className="chip lime" title={`Müşteri No ${me.no}`}>{me.name.split(' ')[0]}</span>
              <a className="btn primary sm" href="/app">Uygulamaya git</a>
            </>
          ) : (
            <>
              <a className="btn ghost sm" href="/giris">Giriş yap</a>
              <a className="btn primary sm" href="/kayit">Hesap aç</a>
            </>
          )}
        </div>
        <button className="menu-btn" aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'} aria-expanded={open} aria-controls="siteNav" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      <div className="tape" aria-label="Piyasa şeridi"><div className="track">{items(false, 'a')}{items(true, 'b')}</div></div>
    </header>
  );
}
