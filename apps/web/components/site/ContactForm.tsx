'use client';
import { useState, type FormEvent } from 'react';

export default function ContactForm() {
  const [f, setF] = useState({ full_name: '', email: '', phone: '', subject: 'Genel Bilgi', message: '' });
  const [st, setSt] = useState<{ k: 'ok' | 'err'; m: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function send(e: FormEvent) {
    e.preventDefault(); setBusy(true); setSt(null);
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Mesaj gönderilemedi.');
      setSt({ k: 'ok', m: `Mesajınız alındı. Referans numaranız: ${j.reference}` }); setF({ ...f, message: '' });
    } catch (er: any) { setSt({ k: 'err', m: er.message }); }
    setBusy(false);
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={send} className="cform">
      <div className="two">
        <label>Ad soyad<input required maxLength={120} value={f.full_name} onChange={set('full_name')} autoComplete="name" /></label>
        <label>E-posta<input required type="email" maxLength={120} value={f.email} onChange={set('email')} autoComplete="email" /></label>
      </div>
      <div className="two">
        <label>Telefon<input maxLength={40} value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" /></label>
        <label>Konu<select value={f.subject} onChange={set('subject')}><option>Genel Bilgi</option><option>Hesap açma</option><option>Para yatırma / çekme</option><option>Emirler</option><option>Fon, VİOP veya döviz işlemi</option><option>Teknik destek</option></select></label>
      </div>
      <label>Mesajınız<textarea required minLength={10} maxLength={2000} rows={6} value={f.message} onChange={set('message')} /></label>
      {st && <div className={'note ' + st.k} role={st.k === 'err' ? 'alert' : 'status'}>{st.m}</div>}
      <button className="btn primary" disabled={busy} style={{ justifySelf: 'start' }}>{busy ? 'Gönderiliyor…' : 'Mesajı gönder'}</button>
    </form>
  );
}
