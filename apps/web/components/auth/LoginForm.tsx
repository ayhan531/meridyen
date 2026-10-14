'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Account, fmtPhone, safeNext, strength } from '@/lib/account';
import AuthAside from './AuthAside';
import { Alert, BACK, FieldError, Meter, PasswordInput, Spin } from './ui';

type View = 'login' | 'code' | 'reset';

export default function LoginForm() {
  const [view, setView] = useState<View>('login');
  const [next, setNext] = useState('/app');
  const [greetName, setGreetName] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [signed, setSigned] = useState<{ name: string } | null>(null);

  /* giriş */
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState<{ id?: string; pw?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [going, setGoing] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  /* doğrulama kodu */
  const [code, setCode] = useState('');
  const [codeInfo, setCodeInfo] = useState<{ phone: string; code: string | null }>({ phone: '', code: null });
  const [codeErr, setCodeErr] = useState('');
  const [left, setLeft] = useState(300);
  const codeRef = useRef<HTMLInputElement>(null);

  /* şifre sıfırlama */
  const [rs, setRs] = useState({ email: '', phone: '', password: '', confirm: '' });
  const [rsErr, setRsErr] = useState<Record<string, string>>({});
  const [rsBusy, setRsBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setNext(safeNext(p.get('next')));
    const preset = p.get('no');
    if (p.get('cikis') === '1') setOkMsg('Çıkış yaptınız. Tekrar görüşmek üzere.');
    if (preset && /^\d{4,12}$/.test(preset)) {
      setId(preset);
      const acc = Account.accounts().find((a) => a.no === preset);
      if (acc) setGreetName(acc.user.split(' ')[0]);
      setTimeout(() => pwRef.current?.focus(), 0);
    } else if (matchMedia('(min-width: 961px)').matches) setTimeout(() => idRef.current?.focus(), 0);
    if (!preset) void Account.load().then((u) => { if (u) { setSigned({ name: u.name }); setGreetName(u.name.split(' ')[0]); } });
  }, []);

  useEffect(() => {
    if (view !== 'code') return;
    setLeft(300);
    const t = setInterval(() => setLeft((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [view]);

  const go = (url: string) => { setGoing(true); window.location.assign(url); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: typeof err = {};
    if (!id.trim()) er.id = 'Müşteri numaranızı ya da e-posta adresinizi yazın.';
    if (!pw) er.pw = 'Şifrenizi yazın.';
    setErr(er);
    if (er.id) { idRef.current?.focus(); return; }
    if (er.pw) { pwRef.current?.focus(); return; }
    setBusy(true);
    const r = await Account.signIn(id, pw, remember);
    setBusy(false);
    if (r.ok) return go(next);
    if ('needCode' in r && r.needCode) {
      setCodeInfo({ phone: r.phone, code: r.code }); setCode(''); setCodeErr(''); setView('code');
      setTimeout(() => codeRef.current?.focus(), 0);
      return;
    }
    if (r.field === 'identifier') { setErr({ id: r.error }); idRef.current?.focus(); return; }
    setErr({ form: r.error });
    setPw(''); pwRef.current?.focus();
  }

  async function submitCode(e?: FormEvent, value = code) {
    e?.preventDefault();
    if (value.length !== 6) { setCodeErr('6 haneli kodu girin.'); codeRef.current?.focus(); return; }
    const r = await Account.verifyCode(value);
    if (r.ok) return go(next);
    setCodeErr(r.error);
    if (r.expired) setTimeout(() => { setView('login'); setErr({ form: r.error }); }, 1400);
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    setRsBusy(true);
    const r = await Account.resetPassword(rs);
    setRsBusy(false);
    if (!r.ok) { setRsErr(r.errors); return; }
    setRs({ email: '', phone: '', password: '', confirm: '' }); setRsErr({});
    setId(r.no); setPw(''); setOkMsg('Şifreniz yenilendi. Yeni şifrenizle giriş yapın.'); setErr({});
    setView('login'); setTimeout(() => pwRef.current?.focus(), 0);
  }

  const keep = (href: string) => (next !== '/app' ? `${href}?next=${encodeURIComponent(next)}` : href);

  return (
    <div className="auth">
      <AuthAside title="Meridyen Yatırım'a hoş geldiniz" lead="Portföyünüz, emirleriniz ve takip listeniz kaldığınız yerde sizi bekliyor." name={greetName} />

      <main className="pane">
        <div className="pane-top">
          <a className="back" href="/">{BACK}Ana sayfa</a>
          <span className="alt">Hesabınız yok mu? <a href={keep('/kayit')}>Hesap açın</a></span>
        </div>

        {view === 'login' && (
          <div className="formbox">
            <h2>Giriş yap</h2>
            <p className="sub">Müşteri numaranız ya da e-posta adresinizle giriş yapın.</p>
            {okMsg ? <Alert kind="ok">{okMsg}</Alert> : null}
            {signed ? <Alert kind="info"><b>{signed.name}</b> olarak giriş yaptınız. <a href={next} style={{ color: 'var(--g600)', fontWeight: 800 }}>Uygulamaya devam edin</a> ya da başka bir hesapla giriş yapın.</Alert> : null}

            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="lgId">Müşteri no veya e-posta</label>
                <input ref={idRef} className="inp" id="lgId" name="username" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
                  placeholder="48273621 ya da ad@alanadi.com" aria-describedby="lgIdErr" aria-invalid={!!err.id} required value={id}
                  onChange={(e) => { setId(e.target.value); setErr({}); }} />
                <FieldError id="lgIdErr" msg={err.id} />
              </div>
              <div className="field">
                <label htmlFor="lgPw">Şifre <a href="#" onClick={(e) => { e.preventDefault(); setRs((x) => ({ ...x, email: /@/.test(id) ? id.trim() : '' })); setView('reset'); }}>Şifremi unuttum</a></label>
                <PasswordInput ref={pwRef} id="lgPw" name="password" autoComplete="current-password" placeholder="Şifrenizi girin" aria-describedby="lgPwErr" aria-invalid={!!(err.pw || err.form)} required
                  value={pw} onChange={(e) => { setPw(e.target.value); setErr({}); }} />
                <FieldError id="lgPwErr" msg={err.pw} />
              </div>
              <div className="setrow">
                <span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /></svg></span>
                <div className="t"><b id="remLbl">Beni hatırla</b><span>Bu cihazda oturum 30 gün açık kalsın</span></div>
                <button className="sw" type="button" role="switch" aria-checked={remember} aria-labelledby="remLbl" onClick={() => setRemember(!remember)}><i /></button>
              </div>
              {err.form ? <Alert kind="err">{err.form}</Alert> : null}
              <button className="btn primary block submit" type="submit" disabled={busy || going} aria-busy={busy || going}>
                {going ? <><Spin />Yönlendiriliyor</> : busy ? <><Spin />Giriş yapılıyor</> : 'Giriş yap'}
              </button>
            </form>
            <p className="swap">Hesabınız yok mu? <a href={keep('/kayit')}>Ücretsiz hesap açın</a></p>
            <p className="foot-note">Giriş yaparak <a href="/kayit#aydinlatma" style={{ color: 'inherit' }}>aydınlatma metnini</a> okuduğunuzu kabul edersiniz.</p>
          </div>
        )}

        {view === 'code' && (
          <div className="formbox">
            <h2 tabIndex={-1}>Doğrulama kodu</h2>
            <p className="sub">+90 <b>{codeInfo.phone}</b> numaralı telefonunuza gönderilen 6 haneli kodu girin.</p>
            {codeInfo.code ? (
              <div className="alert info sms" role="status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18h3" /></svg>
                <span>SMS · Meridyen doğrulama kodunuz: <b className="num">{codeInfo.code}</b></span>
              </div>
            ) : null}
            <form onSubmit={submitCode} noValidate>
              <div className="field">
                <label htmlFor="lgCode">Kod</label>
                <input ref={codeRef} className="inp num code" id="lgCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" aria-describedby="lgCodeErr" aria-invalid={!!codeErr}
                  value={code} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); setCodeErr(''); if (v.length === 6) void submitCode(undefined, v); }} />
                <FieldError id="lgCodeErr" msg={codeErr} />
              </div>
              <div className="hint">{left > 0 ? `Kod ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} dakika geçerli.` : 'Kodun süresi doldu. Girişe dönüp yeniden deneyin.'}</div>
              <button className="btn primary block submit" type="submit" disabled={going}>{going ? <><Spin />Yönlendiriliyor</> : 'Doğrula ve giriş yap'}</button>
            </form>
            <p className="swap" style={{ display: 'block' }}><a href="#" onClick={(e) => { e.preventDefault(); setView('login'); }}>Girişe dön</a></p>
          </div>
        )}

        {view === 'reset' && (
          <div className="formbox">
            <h2 tabIndex={-1}>Şifremi unuttum</h2>
            <p className="sub">Hesabınızdaki e-posta ve cep telefonunu girin, ardından yeni şifrenizi belirleyin.</p>
            <form onSubmit={submitReset} noValidate>
              <div className="field"><label htmlFor="rsEmail">E-posta</label>
                <input className="inp" id="rsEmail" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="ad@alanadi.com" aria-describedby="rsEmailErr" aria-invalid={!!rsErr.email}
                  value={rs.email} onChange={(e) => { setRs({ ...rs, email: e.target.value }); setRsErr({}); }} />
                <FieldError id="rsEmailErr" msg={rsErr.email} /></div>
              <div className="field"><label htmlFor="rsPhone">Cep telefonu</label>
                <div className="inpw"><span className="pre">+90</span><input className="inp has-pre num" id="rsPhone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="5XX XXX XX XX" maxLength={13} aria-describedby="rsPhoneErr" aria-invalid={!!rsErr.phone}
                  value={rs.phone} onChange={(e) => { setRs({ ...rs, phone: fmtPhone(e.target.value) }); setRsErr({}); }} /></div>
                <FieldError id="rsPhoneErr" msg={rsErr.phone} /></div>
              <div className="field"><label htmlFor="rsPw">Yeni şifre</label>
                <PasswordInput id="rsPw" autoComplete="new-password" placeholder="En az 8 karakter, harf ve rakam" aria-describedby="rsPwErr" aria-invalid={!!rsErr.password}
                  value={rs.password} onChange={(e) => { setRs({ ...rs, password: e.target.value }); setRsErr({}); }} />
                <Meter s={strength(rs.password)} />
                <FieldError id="rsPwErr" msg={rsErr.password} /></div>
              <div className="field"><label htmlFor="rsPw2">Yeni şifre tekrar</label>
                <input className="inp" id="rsPw2" type="password" autoComplete="new-password" aria-describedby="rsPw2Err" aria-invalid={!!rsErr.confirm}
                  value={rs.confirm} onChange={(e) => { setRs({ ...rs, confirm: e.target.value }); setRsErr({}); }} />
                <FieldError id="rsPw2Err" msg={rsErr.confirm} /></div>
              {rsErr.form ? <Alert kind="err">{rsErr.form}</Alert> : null}
              <button className="btn primary block submit" type="submit" disabled={rsBusy}>{rsBusy ? <><Spin />Şifre yenileniyor</> : 'Şifreyi yenile'}</button>
            </form>
            <p className="swap" style={{ display: 'block' }}><a href="#" onClick={(e) => { e.preventDefault(); setView('login'); }}>Girişe dön</a></p>
          </div>
        )}
      </main>
    </div>
  );
}
