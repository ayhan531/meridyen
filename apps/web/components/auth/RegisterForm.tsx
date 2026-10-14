'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Account, fmtPhone, safeNext, strength, V } from '@/lib/account';
import AuthAside from './AuthAside';
import { Alert, BACK, CHECK, FieldError, Meter, PasswordInput, Spin } from './ui';

type Key = 'name' | 'email' | 'phone' | 'password' | 'passwordConfirm' | 'consent';
const ORDER: Key[] = ['name', 'email', 'phone', 'password', 'passwordConfirm', 'consent'];
const IDS: Record<Key, string> = { name: 'rgName', email: 'rgEmail', phone: 'rgPhone', password: 'rgPw', passwordConfirm: 'rgPw2', consent: 'rgConsent' };

export default function RegisterForm() {
  const [next, setNext] = useState('/app');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', passwordConfirm: '', consent: false, marketing: false });
  const [err, setErr] = useState<Partial<Record<Key | 'form', string>>>({});
  const [touched, setTouched] = useState<Set<Key>>(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ no: string; first: string } | null>(null);
  const [toast, setToast] = useState('');
  const dlg = useRef<HTMLDialogElement>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);

  const check: Record<Key, () => string> = {
    name: () => V.name(f.name),
    email: () => V.email(f.email),
    phone: () => V.phone(f.phone),
    password: () => V.password(f.password),
    passwordConfirm: () => (!f.passwordConfirm ? 'Şifrenizi yeniden yazın.' : f.passwordConfirm !== f.password ? 'Şifreler aynı değil.' : ''),
    consent: () => (f.consent ? '' : 'Devam etmek için aydınlatma metnini onaylayın.'),
  };

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(location.search).get('next')));
    if (location.hash === '#aydinlatma') dlg.current?.showModal();
    if (matchMedia('(min-width: 961px)').matches) document.getElementById('rgName')?.focus();
  }, []);
  /* dokunulmuş alanlar yazarken doğrulanır */
  useEffect(() => {
    if (!touched.size) return;
    setErr((e) => { const n = { ...e }; touched.forEach((k) => { n[k] = check[k](); }); return n; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, form: '' })); };
  const blur = (k: Key) => { if ((f as Record<string, unknown>)[k] || touched.has(k)) { setTouched((t) => new Set(t).add(k)); setErr((e) => ({ ...e, [k]: check[k]() })); } };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(new Set(ORDER));
    const er: Partial<Record<Key, string>> = {};
    ORDER.forEach((k) => { const m = check[k](); if (m) er[k] = m; });
    setErr(er);
    const first = ORDER.find((k) => er[k]);
    if (first) { document.getElementById(IDS[first])?.focus(); return; }
    setBusy(true);
    const r = await Account.register({ ...f });
    setBusy(false);
    if (!r.ok) {
      setErr(r.errors as Partial<Record<Key | 'form', string>>);
      const k = ORDER.find((x) => r.errors[x]); if (k) document.getElementById(IDS[k])?.focus();
      return;
    }
    setDone({ no: r.user.no, first: r.user.name.split(' ')[0] });
    window.scrollTo({ top: 0 });
    setTimeout(() => doneTitle.current?.focus(), 0);
  }

  async function copyNo() {
    if (!done) return;
    try { await navigator.clipboard.writeText(done.no); setToast('Müşteri numarası kopyalandı'); } catch { setToast('Müşteri numaranız: ' + done.no); }
    setTimeout(() => setToast(''), 3200);
  }

  const pw = f.password, rules = { len: pw.length >= 8, let: /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(pw), dig: /\d/.test(pw) };
  const giris = next !== '/app' ? `/giris?next=${encodeURIComponent(next)}` : '/giris';
  const box = <span className="box">{CHECK}</span>;

  return (
    <div className="auth">
      <AuthAside title="Hesabınız birkaç dakikada hazır" lead="Formu doldurun, müşteri numaranızı alın ve ilk emrinizi verin. Hesap açmak ücretsiz." />

      <main className="pane">
        <div className="pane-top">
          <a className="back" href="/">{BACK}Ana sayfa</a>
          <span className="alt">Hesabınız var mı? <a href={giris}>Giriş yapın</a></span>
        </div>

        {!done ? (
          <div className="formbox">
            <h2>Hesap aç</h2>
            <p className="sub">Ücretsizdir ve birkaç dakika sürer. Pazarlama izni dışındaki tüm alanlar zorunludur.</p>
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="rgName">Ad soyad</label>
                <input className="inp" id="rgName" name="name" autoComplete="name" autoCapitalize="words" placeholder="Ayşe Yılmaz" aria-describedby="rgNameErr" aria-invalid={!!err.name} required maxLength={80}
                  value={f.name} onChange={(e) => set('name', e.target.value)} onBlur={() => blur('name')} />
                <FieldError id="rgNameErr" msg={err.name} />
              </div>
              <div className="field">
                <label htmlFor="rgEmail">E-posta</label>
                <input className="inp" id="rgEmail" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="ad@alanadi.com" aria-describedby="rgEmailErr" aria-invalid={!!err.email} required maxLength={120}
                  value={f.email} onChange={(e) => set('email', e.target.value)} onBlur={() => blur('email')} />
                <FieldError id="rgEmailErr" msg={err.email} />
              </div>
              <div className="field">
                <label htmlFor="rgPhone">Cep telefonu</label>
                <div className="inpw"><span className="pre">+90</span><input className="inp has-pre num" id="rgPhone" name="tel" type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="5XX XXX XX XX" aria-describedby="rgPhoneErr" aria-invalid={!!err.phone} required maxLength={13}
                  value={f.phone} onChange={(e) => set('phone', fmtPhone(e.target.value))} onBlur={() => blur('phone')} /></div>
                <FieldError id="rgPhoneErr" msg={err.phone} />
              </div>
              <div className="field">
                <label htmlFor="rgPw">Şifre</label>
                <PasswordInput id="rgPw" name="new-password" autoComplete="new-password" placeholder="En az 8 karakter" aria-describedby="rgPwRules rgPwErr" aria-invalid={!!err.password} required maxLength={128}
                  value={f.password} onChange={(e) => set('password', e.target.value)} onBlur={() => blur('password')} />
                <Meter s={strength(pw)} />
                <ul className="rules" id="rgPwRules">
                  <li className={rules.len ? 'ok' : ''}>En az 8 karakter</li>
                  <li className={rules.let ? 'ok' : ''}>Harf</li>
                  <li className={rules.dig ? 'ok' : ''}>Rakam</li>
                </ul>
                <FieldError id="rgPwErr" msg={err.password} />
              </div>
              <div className="field">
                <label htmlFor="rgPw2">Şifre tekrar</label>
                <input className="inp" id="rgPw2" name="confirm-password" type="password" autoComplete="new-password" placeholder="Şifrenizi yeniden yazın" aria-describedby="rgPw2Err" aria-invalid={!!err.passwordConfirm} required maxLength={128}
                  value={f.passwordConfirm} onChange={(e) => set('passwordConfirm', e.target.value)} onBlur={() => blur('passwordConfirm')} />
                <FieldError id="rgPw2Err" msg={err.passwordConfirm} />
              </div>

              <label className="check">
                <input type="checkbox" id="rgConsent" aria-describedby="rgConsentErr" aria-invalid={!!err.consent} checked={f.consent}
                  onChange={(e) => { set('consent', e.target.checked); setTouched((t) => new Set(t).add('consent')); }} />
                {box}
                <span><a href="#aydinlatma" onClick={(e) => { e.preventDefault(); dlg.current?.showModal(); }}>Aydınlatma metnini</a> okudum, kişisel verilerimin hesabımın açılması için işlenmesini kabul ediyorum.</span>
              </label>
              <FieldError id="rgConsentErr" msg={err.consent} />
              <label className="check">
                <input type="checkbox" id="rgMarketing" checked={f.marketing} onChange={(e) => set('marketing', e.target.checked)} />
                {box}
                <span>Piyasa bültenleri ve kampanyalar için bana e-posta ve SMS gönderilebilir. (İsteğe bağlı)</span>
              </label>

              {err.form ? <Alert kind="err">{err.form}</Alert> : null}
              <button className="btn primary block submit" type="submit" disabled={busy}>{busy ? <><Spin />Hesabınız açılıyor</> : 'Hesap aç'}</button>
            </form>
            <p className="swap">Hesabınız var mı? <a href={giris}>Giriş yapın</a></p>
          </div>
        ) : (
          <div className="formbox done">
            <div className="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
            <h2 tabIndex={-1} ref={doneTitle}>Hesabınız açıldı, {done.first}</h2>
            <p className="sub">Girişte müşteri numaranızı ya da e-posta adresinizi kullanabilirsiniz.</p>
            <div className="no">
              <span>Müşteri numaranız</span>
              <b className="num">{done.no}</b>
              <button type="button" onClick={copyNo}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="9" width="12" height="12" rx="3" /><path d="M5 15V6a3 3 0 0 1 3-3h9" /></svg>Numarayı kopyala</button>
            </div>
            <a className="btn primary block" href={next}>Uygulamaya geç</a>
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
          <button className="btn primary block" type="button" onClick={() => { set('consent', true); setTouched((t) => new Set(t).add('consent')); dlg.current?.close(); document.getElementById('rgConsent')?.focus(); }}>Okudum, onaylıyorum</button>
        </div>
      </dialog>
      {toast ? <div className="toast" role="status"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{toast}</div> : null}
    </div>
  );
}
