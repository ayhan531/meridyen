'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Account, fmtPhone, normPhone, safeNext, strength, tcValid, V } from '@/lib/account';
import AuthAside from './AuthAside';
import { Alert, BACK, CHECK, FieldError, Meter, PasswordInput, Spin } from './ui';

const Q: { k: string; q: string; o: string[] }[] = [
  { k: 'risk_experience', q: 'Yatırım deneyiminiz nedir?', o: ['Hiç yok', '1 yıldan az', '1–5 yıl', '5 yıldan fazla'] },
  { k: 'risk_horizon', q: 'Yatırımlarınızı ne kadar süre tutmayı planlıyorsunuz?', o: ['1 aydan kısa', '1–12 ay', '1–3 yıl', '3 yıldan uzun'] },
  { k: 'risk_loss', q: 'Portföyünüz %20 değer kaybederse ne yaparsınız?', o: ['Hepsini satarım', 'Bir kısmını satarım', 'Beklerim', 'Alım yaparım'] },
  { k: 'risk_income', q: 'Yatırıma ayırdığınız tutar gelirinizin ne kadarı?', o: ['%50’den fazla', '%25–50', '%10–25', '%10’dan az'] },
  { k: 'trade_frequency', q: 'Ne sıklıkla işlem yapmayı düşünüyorsunuz?', o: ['Yılda birkaç kez', 'Ayda birkaç kez', 'Haftada birkaç kez', 'Her gün'] },
  { k: 'knowledge_level', q: 'Finansal piyasalar hakkındaki bilginiz?', o: ['Başlangıç', 'Temel', 'İyi', 'İleri'] },
];
const EDU = ['İlköğretim', 'Lise', 'Ön lisans', 'Lisans', 'Yüksek lisans / Doktora'];
const GOAL = ['Sermaye koruma', 'Düzenli gelir', 'Uzun vadeli büyüme', 'Kısa vadeli kazanç'];
const PROD = ['Hisse senedi', 'Fon', 'VİOP', 'Döviz', 'Altın / Emtia'];
const TEXT_KEYS = ['full_name', 'tc', 'birth_date', 'email', 'phone', 'city', 'district', 'address', 'password', 'passwordConfirm', 'education', 'occupation', 'investment_goal', 'traded_products', 'risk_experience', 'risk_horizon', 'risk_loss', 'risk_income', 'trade_frequency', 'knowledge_level', 'consent'] as const;
type Key = (typeof TEXT_KEYS)[number];
const ORDER: Key[] = [...TEXT_KEYS];
const IDS = (k: Key) => 'rg_' + k;

export default function RegisterForm() {
  const [next, setNext] = useState('/app');
  const [f, setF] = useState<Record<string, string>>({ full_name: '', tc: '', birth_date: '', email: '', phone: '', city: '', district: '', address: '', password: '', passwordConfirm: '', education: '', occupation: '', investment_goal: '', traded_products: '', risk_experience: '', risk_horizon: '', risk_loss: '', risk_income: '', trade_frequency: '', knowledge_level: '', consent: '' });
  const [err, setErr] = useState<Partial<Record<Key | 'form', string>>>({});
  const [touched, setTouched] = useState<Set<Key>>(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ first: string; signed: boolean } | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);
  const req = (k: string, m: string) => (f[k]?.trim() ? '' : m);

  const check: Record<Key, () => string> = {
    full_name: () => V.name(f.full_name),
    tc: () => (tcValid(f.tc) ? '' : 'Geçerli bir 11 haneli T.C. kimlik numarası yazın.'),
    birth_date: () => (/^\d{4}-\d{2}-\d{2}$/.test(f.birth_date) ? '' : 'Doğum tarihinizi seçin.'),
    email: () => V.email(f.email),
    phone: () => V.phone(f.phone),
    city: () => req('city', 'Şehir yazın.'),
    district: () => req('district', 'İlçe yazın.'),
    address: () => (f.address.trim().length >= 10 ? '' : 'Açık adresinizi yazın.'),
    password: () => V.password(f.password),
    passwordConfirm: () => (!f.passwordConfirm ? 'Şifrenizi yeniden yazın.' : f.passwordConfirm !== f.password ? 'Şifreler aynı değil.' : ''),
    education: () => req('education', 'Seçim yapın.'),
    occupation: () => req('occupation', 'Mesleğinizi yazın.'),
    investment_goal: () => req('investment_goal', 'Seçim yapın.'),
    traded_products: () => req('traded_products', 'En az bir ürün seçin.'),
    risk_experience: () => req('risk_experience', 'Seçim yapın.'),
    risk_horizon: () => req('risk_horizon', 'Seçim yapın.'),
    risk_loss: () => req('risk_loss', 'Seçim yapın.'),
    risk_income: () => req('risk_income', 'Seçim yapın.'),
    trade_frequency: () => req('trade_frequency', 'Seçim yapın.'),
    knowledge_level: () => req('knowledge_level', 'Seçim yapın.'),
    consent: () => (f.consent === '1' ? '' : 'KVKK, sözleşme ve risk bildirimlerini onaylayın.'),
  };

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(location.search).get('next')));
    if (location.hash === '#aydinlatma') dlg.current?.showModal();
  }, []);
  useEffect(() => {
    if (!touched.size) return;
    setErr((e) => { const n = { ...e }; touched.forEach((k) => { n[k] = check[k](); }); return n; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const set = (k: Key, v: string) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, form: '' })); };
  const blur = (k: Key) => { if (f[k] || touched.has(k)) { setTouched((t) => new Set(t).add(k)); setErr((e) => ({ ...e, [k]: check[k]() })); } };
  const toggleProd = (p: string) => { const l = f.traded_products ? f.traded_products.split(',') : []; set('traded_products', (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]).join(',')); setTouched((t) => new Set(t).add('traded_products')); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(new Set(ORDER));
    const er: Partial<Record<Key, string>> = {};
    ORDER.forEach((k) => { const m = check[k](); if (m) er[k] = m; });
    setErr(er);
    const first = ORDER.find((k) => er[k]);
    if (first) { document.getElementById(IDS(first))?.focus(); return; }
    setBusy(true);
    const body: Record<string, string> = { ...f, phone: normPhone(f.phone), tc: f.tc.replace(/\D/g, ''), accept_kvkk: '1', accept_distance_contract: '1', accept_risk_disclosure: '1' };
    delete body.passwordConfirm; delete body.consent;
    const r = await Account.register(body);
    if (!r.ok) { setBusy(false); setErr((x) => ({ ...x, form: r.error })); return; }
    const s = await Account.signIn(body.tc, f.password, true);
    setBusy(false);
    setDone({ first: f.full_name.trim().split(' ')[0], signed: s.ok });
    window.scrollTo({ top: 0 });
    setTimeout(() => doneTitle.current?.focus(), 0);
  }

  const pw = f.password, rules = { len: pw.length >= 10, low: /[a-zçğıöşü]/.test(pw), up: /[A-ZÇĞİÖŞÜ]/.test(pw), dig: /\d/.test(pw) };
  const giris = next !== '/app' ? `/giris?next=${encodeURIComponent(next)}` : '/giris';
  const box = <span className="box">{CHECK}</span>;
  const inp = (k: Key, label: string, p: Record<string, unknown> = {}, onCh?: (v: string) => string) => (
    <div className="field">
      <label htmlFor={IDS(k)}>{label}</label>
      <input className="inp" id={IDS(k)} name={k} aria-invalid={!!err[k]} aria-describedby={IDS(k) + '_e'} value={f[k]} {...p}
        onChange={(e) => set(k, onCh ? onCh(e.target.value) : e.target.value)} onBlur={() => blur(k)} />
      <FieldError id={IDS(k) + '_e'} msg={err[k]} />
    </div>
  );
  const sel = (k: Key, label: string, opts: string[], values?: string[]) => (
    <div className="field">
      <label htmlFor={IDS(k)}>{label}</label>
      <select className="inp" id={IDS(k)} name={k} aria-invalid={!!err[k]} value={f[k]} onChange={(e) => set(k, e.target.value)} onBlur={() => blur(k)}>
        <option value="">Seçin</option>
        {opts.map((o, i) => <option key={o} value={values ? values[i] : o}>{o}</option>)}
      </select>
      <FieldError id={IDS(k) + '_e'} msg={err[k]} />
    </div>
  );

  return (
    <div className="auth">
      <AuthAside title="Hesabınız birkaç dakikada hazır" lead="Bilgilerinizi girin, T.C. kimlik numaranızla giriş yapın. Kimlik belgenizi yükledikten sonra hesabınız onaylanır ve işlem yapabilirsiniz." />

      <main className="pane">
        <div className="pane-top">
          <a className="back" href="/">{BACK}Ana sayfa</a>
          <span className="alt">Hesabınız var mı? <a href={giris}>Giriş yapın</a></span>
        </div>

        {!done ? (
          <div className="formbox">
            <h2>Hesap aç</h2>
            <p className="sub">Meridyen ve Ottoman E-Şube aynı hesabı kullanır. Tüm alanlar zorunludur.</p>
            <form onSubmit={submit} noValidate>
              {inp('full_name', 'Ad soyad', { autoComplete: 'name', maxLength: 80, placeholder: 'Ayşe Yılmaz' })}
              {inp('tc', 'T.C. kimlik no', { inputMode: 'numeric', maxLength: 11, autoComplete: 'username', placeholder: '11 haneli' }, (v) => v.replace(/\D/g, '').slice(0, 11))}
              {inp('birth_date', 'Doğum tarihi', { type: 'date', autoComplete: 'bday', max: new Date().toISOString().slice(0, 10) })}
              {inp('email', 'E-posta', { type: 'email', autoComplete: 'email', maxLength: 120, placeholder: 'ad@alanadi.com' })}
              <div className="field">
                <label htmlFor={IDS('phone')}>Cep telefonu</label>
                <div className="inpw"><span className="pre">+90</span><input className="inp has-pre num" id={IDS('phone')} name="tel" type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="5XX XXX XX XX" aria-invalid={!!err.phone} maxLength={13}
                  value={f.phone} onChange={(e) => set('phone', fmtPhone(e.target.value))} onBlur={() => blur('phone')} /></div>
                <FieldError id={IDS('phone') + '_e'} msg={err.phone} />
              </div>
              {inp('city', 'Şehir', { autoComplete: 'address-level1', maxLength: 40 })}
              {inp('district', 'İlçe', { autoComplete: 'address-level2', maxLength: 40 })}
              {inp('address', 'Açık adres', { autoComplete: 'street-address', maxLength: 200 })}
              <div className="field">
                <label htmlFor={IDS('password')}>Şifre</label>
                <PasswordInput id={IDS('password')} name="new-password" autoComplete="new-password" placeholder="En az 10 karakter" aria-invalid={!!err.password} maxLength={128}
                  value={f.password} onChange={(e) => set('password', e.target.value)} onBlur={() => blur('password')} />
                <Meter s={strength(pw)} />
                <ul className="rules">
                  <li className={rules.len ? 'ok' : ''}>En az 10 karakter</li>
                  <li className={rules.up ? 'ok' : ''}>Büyük harf</li>
                  <li className={rules.low ? 'ok' : ''}>Küçük harf</li>
                  <li className={rules.dig ? 'ok' : ''}>Rakam</li>
                </ul>
                <FieldError id={IDS('password') + '_e'} msg={err.password} />
              </div>
              <div className="field">
                <label htmlFor={IDS('passwordConfirm')}>Şifre tekrar</label>
                <input className="inp" id={IDS('passwordConfirm')} name="confirm-password" type="password" autoComplete="new-password" aria-invalid={!!err.passwordConfirm} maxLength={128}
                  value={f.passwordConfirm} onChange={(e) => set('passwordConfirm', e.target.value)} onBlur={() => blur('passwordConfirm')} />
                <FieldError id={IDS('passwordConfirm') + '_e'} msg={err.passwordConfirm} />
              </div>

              <h3 style={{ margin: '22px 0 4px', fontSize: 16 }}>Yatırım uygunluk anketi</h3>
              {sel('education', 'Eğitim durumu', EDU)}
              {inp('occupation', 'Meslek', { maxLength: 60 })}
              {sel('investment_goal', 'Yatırım amacı', GOAL)}
              <div className="field">
                <label>İşlem yapmak istediğiniz ürünler</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} id={IDS('traded_products')} tabIndex={-1}>
                  {PROD.map((p) => { const on = f.traded_products.split(',').includes(p); return <button key={p} type="button" className={`btn ${on ? 'primary' : ''}`} aria-pressed={on} onClick={() => toggleProd(p)}>{p}</button>; })}
                </div>
                <FieldError id={IDS('traded_products') + '_e'} msg={err.traded_products} />
              </div>
              {Q.map((q) => sel(q.k as Key, q.q, q.o, ['0', '1', '2', '3']))}

              <label className="check">
                <input type="checkbox" id={IDS('consent')} aria-invalid={!!err.consent} checked={f.consent === '1'}
                  onChange={(e) => { set('consent', e.target.checked ? '1' : ''); setTouched((t) => new Set(t).add('consent')); }} />
                {box}
                <span><a href="#aydinlatma" onClick={(e) => { e.preventDefault(); dlg.current?.showModal(); }}>KVKK aydınlatma metni, mesafeli sözleşme ve risk bildirimini</a> okudum, kabul ediyorum.</span>
              </label>
              <FieldError id={IDS('consent') + '_e'} msg={err.consent} />

              {err.form ? <Alert kind="err">{err.form}</Alert> : null}
              <button className="btn primary block submit" type="submit" disabled={busy}>{busy ? <><Spin />Hesabınız açılıyor</> : 'Hesap aç'}</button>
            </form>
            <p className="swap">Hesabınız var mı? <a href={giris}>Giriş yapın</a></p>
          </div>
        ) : (
          <div className="formbox done">
            <div className="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
            <h2 tabIndex={-1} ref={doneTitle}>Hesabınız açıldı, {done.first}</h2>
            <p className="sub">Girişte T.C. kimlik numaranızı kullanın. İşlem yapabilmek için uygulamada kimlik belgenizi (ön ve arka yüz) yükleyin; belgeniz incelenince hesabınız onaylanır.</p>
            <a className="btn primary block" href={done.signed ? next : giris}>{done.signed ? 'Uygulamaya geç' : 'Giriş yap'}</a>
          </div>
        )}
      </main>

      <dialog className="legal" id="aydinlatma" aria-labelledby="legalTitle" ref={dlg} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="in">
          <button className="x" type="button" aria-label="Kapat" onClick={() => dlg.current?.close()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          <h3 id="legalTitle">Kişisel verilerin işlenmesine ilişkin aydınlatma</h3>
          <p>Hesap açarken verdiğiniz ad soyad, e-posta ve cep telefonu bilgileri; hesabınızın oluşturulması, kimliğinizin doğrulanması ve sizinle iletişim kurulması amacıyla işlenir.</p>
          <ul>
            <li>Şifreniz düz metin olarak saklanmaz; geri çevrilemeyen bir özet olarak tutulur.</li>
            <li>Pazarlama izni isteğe bağlıdır ve hesap açmanın koşulu değildir.</li>
            <li>6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 11. maddesindeki haklarınızı, verilerinize erişmek, düzeltilmesini ya da silinmesini istemek için kullanabilirsiniz.</li>
          </ul>
          <button className="btn primary block" type="button" onClick={() => { set('consent', '1'); setTouched((t) => new Set(t).add('consent')); dlg.current?.close(); document.getElementById('rg_consent')?.focus(); }}>Okudum, onaylıyorum</button>
        </div>
      </dialog>
    </div>
  );
}
