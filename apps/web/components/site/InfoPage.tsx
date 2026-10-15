'use client';
import { useState, type FormEvent } from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { PAGES } from './pages-data';

function ContactForm() {
  const [f, setF] = useState({ full_name: '', email: '', phone: '', subject: 'Genel Bilgi', message: '' });
  const [st, setSt] = useState<{ k: 'ok' | 'err'; m: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function send(e: FormEvent) {
    e.preventDefault(); setBusy(true); setSt(null);
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Mesaj gönderilemedi.');
      setSt({ k: 'ok', m: `Mesajınız alındı. Referans: ${j.reference}` }); setF({ ...f, message: '' });
    } catch (er: any) { setSt({ k: 'err', m: er.message }); }
    setBusy(false);
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={send} className="info-form">
      <label>Ad soyad<input required maxLength={120} value={f.full_name} onChange={set('full_name')} autoComplete="name" /></label>
      <label>E-posta<input required type="email" maxLength={120} value={f.email} onChange={set('email')} autoComplete="email" /></label>
      <label>Telefon<input maxLength={40} value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" /></label>
      <label>Konu<select value={f.subject} onChange={set('subject')}><option>Genel Bilgi</option><option>Hesap açma</option><option>Para yatırma / çekme</option><option>Emirler</option><option>Teknik destek</option></select></label>
      <label>Mesajınız<textarea required minLength={10} maxLength={2000} rows={5} value={f.message} onChange={set('message')} /></label>
      {st && <div className={'info-note ' + st.k} role={st.k === 'err' ? 'alert' : 'status'}>{st.m}</div>}
      <button className="btn primary" disabled={busy}>{busy ? 'Gönderiliyor…' : 'Gönder'}</button>
    </form>
  );
}

export default function InfoPage({ slug }: { slug: string }) {
  const p = PAGES[slug];
  return (
    <>
      <SiteHeader />
      <main className="info wrap">
        <p className="crumb"><a href="/">Ana sayfa</a> / {p.title}</p>
        <h1>{p.title}</h1>
        <p className="lead">{p.lead}</p>
        {p.body === 'contact' ? <ContactForm /> : p.body}
        <style>{`.info{padding-block:48px 72px;max-width:760px}.info h1{font-size:clamp(28px,5vw,40px);margin:8px 0}.info h2{font-size:20px;margin:28px 0 6px}.info p{line-height:1.65}.info .lead{font-size:18px;opacity:.8}.crumb{font-size:14px;opacity:.7}.crumb a{text-decoration:underline}
        .info-form{display:grid;gap:14px;margin-top:20px}.info-form label{display:grid;gap:6px;font-weight:600;font-size:14px}.info-form input,.info-form select,.info-form textarea{font:inherit;padding:12px 14px;border:1px solid #c9d3cd;border-radius:12px;background:#fff;color:inherit;width:100%}.info-note{padding:12px 14px;border-radius:12px;font-size:14px}.info-note.ok{background:#e4f5ea;color:#17562e}.info-note.err{background:#fde8e6;color:#8a1c12}
        .info .btn{display:inline-flex;margin-right:8px;margin-top:6px}`}</style>
      </main>
      <SiteFooter />
    </>
  );
}
