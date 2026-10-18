'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Account, type User } from '@/lib/account';
import { Ico } from './icons';
import UtilityBar from './UtilityBar';

type Item = [string, string, string];
interface Menu { id: string; label: string; cols: { h: string; items: Item[] }[]; feat?: { t: string; d: string; href: string; cta: string } }

const MENUS: Menu[] = [
  { id: 'u', label: 'Ürünler', cols: [
    { h: 'Yatırım ürünleri', items: [
      ['/hizmetler#pay', 'Pay piyasası', 'Borsa İstanbul’da çevrim içi alım satım'],
      ['/hizmetler#fon', 'Yatırım fonları', 'Canlı fon fiyatlarını izleyin'],
      ['/hizmetler#viop', 'Vadeli işlemler (VİOP)', 'Sözleşmeleri takip edin'],
      ['/hizmetler#doviz', 'Döviz', 'Kurlar ve çevirici'],
      ['/hizmetler#emtia', 'Altın ve emtia', 'Gram altın, Brent petrol']] },
    { h: 'Alım satım', items: [
      ['/blog/limit-emir-piyasa-emri-farki', 'Emir türleri', 'Limit ve piyasa emri'],
      ['/blog/t2-takas-nedir', 'Takas (T+2)', 'Satış bedeli ne zaman çekilir'],
      ['/ucretler', 'Komisyon ve ücretler', 'Tüm maliyet kalemleri']] }],
    feat: { t: 'Hesabınızı açın', d: 'Kayıt, kimlik doğrulama ve ilk emir için adım adım rehber.', href: '/hesap-acma', cta: 'Hesap açma rehberi' } },
  { id: 'p', label: 'Piyasalar', cols: [
    { h: 'Canlı veri', items: [
      ['/piyasalar', 'Canlı piyasalar', 'Hisse, fon, VİOP, döviz'],
      ['/haberler', 'Piyasa haberleri', 'Güncel haber akışı']] },
    { h: 'Hesaplayıcılar', items: [
      ['/araclar#maliyet', 'Emir maliyeti', 'Komisyon ve BSMV dahil toplam'],
      ['/araclar#doviz', 'Döviz çevirici', 'Canlı kurla çeviri'],
      ['/araclar#kar', 'Kâr / zarar', 'Net sonucu önceden görün']] }] },
  { id: 'k', label: 'Platform', cols: [
    { h: 'E-şube', items: [
      ['/platform', 'Platform özellikleri', 'Portföy, emir, para hareketleri'],
      ['/platform#kanallar', 'İşlem kanalları', 'Web ve Android uygulaması'],
      ['/guvenlik', 'Güvenlik ve şeffaflık', 'Hesabınız nasıl korunur']] }] },
  { id: 'd', label: 'Destek', cols: [
    { h: 'Yardım', items: [
      ['/destek', 'Destek merkezi', 'Adım adım işlem rehberleri'],
      ['/hesap-acma', 'Hesap açma', 'Gerekenler ve süreç'],
      ['/sss', 'Sık sorulan sorular', 'Kısa yanıtlar'],
      ['/iletisim', 'İletişim', 'Bize yazın']] },
    { h: 'Öğrenin', items: [
      ['/blog', 'Yatırımcı rehberi', 'Borsa, emir, takas, risk'],
      ['/blog/borsa-istanbul-nedir-nasil-calisir', 'Borsa nasıl çalışır?', 'Başlangıç için']] }] },
  { id: 'c', label: 'Kurumsal', cols: [
    { h: 'Meridyen', items: [
      ['/kurumsal', 'Hakkımızda', 'Yaklaşımımız ve ilkelerimiz'],
      ['/guvenlik', 'Güvenlik ve şeffaflık', 'İşleyişimiz'],
      ['/site-haritasi', 'Site haritası', 'Tüm sayfalar']] },
    { h: 'Yasal', items: [
      ['/sozlesmeler', 'Sözleşmeler', 'Çerçeve sözleşme ve formlar'],
      ['/kvkk', 'KVKK aydınlatma metni', 'Kişisel verileriniz'],
      ['/risk-bildirimi', 'Risk bildirimi', 'Başlıca riskler'],
      ['/gizlilik', 'Gizlilik ve çerezler', 'Veri ve çerez kullanımı']] }] },
];

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
  return (
    <>
      <UtilityBar />
      <header className={`hd${scrolled ? ' scrolled' : ''}`} id="top">
        <a className="skip" href="#icerik">İçeriğe geç</a>
        <div className="wrap hd-in">
          <a className="brand" href="/" aria-label="Meridyen Yatırım ana sayfa"><span className="logo">M</span><span><b>Meridyen Yatırım</b><small>Borsa İstanbul işlem platformu</small></span></a>
          <nav className={`hd-nav${open ? ' open' : ''}`} id="siteNav" aria-label="Ana menü">
            {MENUS.map((m) => (
              <div key={m.id} className={`dd${dd === m.id ? ' open' : ''}`}>
                <button type="button" aria-expanded={dd === m.id} aria-haspopup="true" onClick={() => setDd(dd === m.id ? null : m.id)}>{m.label}<Ico n="down" /></button>
                <div className="dd-panel mega" style={{ ['--n' as any]: m.cols.length }}>
                  {m.cols.map((c) => (
                    <div key={c.h} className="mcol"><h5>{c.h}</h5>{c.items.map(([h, t, s]) => (<a key={h} href={h} onClick={close}><b>{t}</b><span>{s}</span></a>))}</div>
                  ))}
                  {m.feat ? <a className="mfeat" href={m.feat.href} onClick={close}><b>{m.feat.t}</b><span>{m.feat.d}</span><em>{m.feat.cta}</em></a> : null}
                </div>
              </div>
            ))}
            <a href="/ucretler" onClick={close} aria-current={path === '/ucretler' ? 'page' : undefined}>Ücretler</a>
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
    </>
  );
}
