'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Account, type User } from '@/lib/account';
import { Ico } from './icons';

const PRODUCTS = [
  ['/hizmetler#pay', 'Pay piyasası', 'Borsa İstanbul’da çevrim içi alım satım'],
  ['/hizmetler#fon', 'Yatırım fonları', 'Fon fiyatlarını izleyin'],
  ['/hizmetler#viop', 'Vadeli işlemler (VİOP)', 'Sözleşmeleri takip edin'],
  ['/hizmetler#doviz', 'Döviz', 'Kurlar ve döviz çevirici'],
  ['/hizmetler#emtia', 'Altın ve emtia', 'Gram altın ve Brent petrol'],
];
const CORP = [
  ['/kurumsal', 'Hakkımızda', 'Yaklaşımımız ve ilkelerimiz'],
  ['/guvenlik', 'Güvenlik ve şeffaflık', 'Hesabınız nasıl korunur'],
  ['/sss', 'Sık sorulan sorular', 'Kısa yanıtlar'],
  ['/iletisim', 'İletişim', 'Bize yazın'],
  ['/sozlesmeler', 'Sözleşmeler', 'Yasal metinler'],
];
const LINKS = [['/piyasalar', 'Piyasalar'], ['/platform', 'Platform'], ['/ucretler', 'Ücretler'], ['/blog', 'Blog']];

export default function SiteHeader() {
  const path = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);
  const [prog, setProg] = useState(0);
  const [open, setOpen] = useState(false);
  const [dd, setDd] = useState<string | null>(null);
  const [me, setMe] = useState<User | null>(null);

  useEffect(() => {
    const f = () => { setScrolled(window.scrollY > 8); const m = document.documentElement.scrollHeight - window.innerHeight; setProg(m > 0 ? Math.min(1, window.scrollY / m) : 0); }; f();
    window.addEventListener('scroll', f, { passive: true });
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setDd(null); } };
    const away = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.dd')) setDd(null); };
    document.addEventListener('keydown', esc); document.addEventListener('click', away);
    void Account.load().then(setMe);
    return () => { window.removeEventListener('scroll', f); document.removeEventListener('keydown', esc); document.removeEventListener('click', away); };
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  const close = () => { setOpen(false); setDd(null); };
  const menu = (id: string, label: string, items: string[][]) => (
    <div className={`dd${dd === id ? ' open' : ''}`}>
      <button type="button" aria-expanded={dd === id} aria-haspopup="true" onClick={() => setDd(dd === id ? null : id)}>{label}<Ico n="down" /></button>
      <div className="dd-panel">{items.map(([h, t, s]) => (<a key={h} href={h} onClick={close}><b>{t}</b><span>{s}</span></a>))}</div>
    </div>
  );

  return (
    <header className={`hd${scrolled ? ' scrolled' : ''}`} id="top">
      <a className="skip" href="#icerik">İçeriğe geç</a>
      <div className="wrap hd-in">
        <a className="brand" href="/" aria-label="Meridyen Yatırım ana sayfa"><span className="logo">M</span><span><b>Meridyen Yatırım</b><small>Borsa İstanbul işlem platformu</small></span></a>
        <nav className={`hd-nav${open ? ' open' : ''}`} id="siteNav" aria-label="Ana menü">
          {menu('p', 'Ürünler', PRODUCTS)}
          {LINKS.map(([h, t]) => (<a key={h} href={h} onClick={close} aria-current={path === h || path.startsWith(h + '/') ? 'page' : undefined}>{t}</a>))}
          {menu('k', 'Kurumsal', CORP)}
        </nav>
        <div className="hd-acts">
          {me ? (
            <>
              <span className="chip lime" title={`Müşteri No ${me.no}`}>{me.name.split(' ')[0]}</span>
              <a className="btn primary sm" href="/app">E-şubeye git</a>
            </>
          ) : (
            <>
              <a className="btn ghost sm" href="/giris">Giriş yap</a>
              <a className="btn primary sm" href="/kayit">Hesap aç</a>
            </>
          )}
        </div>
        <button className="menu-btn" aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'} aria-expanded={open} aria-controls="siteNav" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
      </div>
      <i className="prog" aria-hidden="true" style={{ transform: `scaleX(${prog})` }} />
    </header>
  );
}
