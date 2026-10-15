'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Account, safeNext, strength, tcValid, V } from '@/lib/account';
import AuthAside from './AuthAside';
import { Alert, BACK, FieldError, Meter, PasswordInput, Spin } from './ui';

type View = 'login' | 'forgot' | 'reset';

export default function LoginForm() {
  const [view, setView] = useState<View>('login');
  const [next, setNext] = useState('/app');
  const [greetName, setGreetName] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [signed, setSigned] = useState<{ name: string; admin: boolean } | null>(null);

  /* giriş */
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState<{ id?: string; pw?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [going, setGoing] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  /* şifre sıfırlama (e-posta bağlantısı) */
  const [fg, setFg] = useState({ tc: '', email: '' });
  const [rs, setRs] = useState({ token: '', password: '', confirm: '' });
  const [rsErr, setRsErr] = useState('');
  const [rsBusy, setRsBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setNext(safeNext(p.get('next')));
    if (p.get('cikis') === '1') setOkMsg('Çıkış yaptınız. Tekrar görüşmek üzere.');
    const tok = p.get('reset');
    if (tok) { setRs((x) => ({ ...x, token: tok })); setView('reset'); }
    void Account.load().then((u) => { if (u) { setSigned({ name: u.name, admin: u.role === 'admin' }); setGreetName(u.name.split(' ')[0]); } });
    if (matchMedia('(min-width: 961px)').matches) setTimeout(() => idRef.current?.focus(), 0);
  }, []);

  const go = (url: string) => { setGoing(true); window.location.assign(url); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: typeof err = {};
    const tc = id.replace(/\D/g, '');
    if (!tcValid(tc)) er.id = 'Geçerli bir 11 haneli T.C. kimlik numarası yazın.';
    if (!pw) er.pw = 'Şifrenizi yazın.';
    setErr(er);
    if (er.id) { idRef.current?.focus(); return; }
    if (er.pw) { pwRef.current?.focus(); return; }
    setBusy(true);
    const r = await Account.signIn(tc, pw, remember);
    setBusy(false);
    if (r.ok) return go(r.user.role === 'admin' ? '/admin' : next);
    setErr({ form: r.error });
    setPw(''); pwRef.current?.focus();
  }

  async function submitForgot(e: FormEvent) {
    e.preventDefault(); setRsBusy(true); setRsErr('');
    const r = await Account.forgot(fg.tc, fg.email);
    setRsBusy(false);
    if (!r.ok) { setRsErr(r.error); return; }
    setOkMsg(r.message); setView('login');
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    const m = V.password(rs.password);
    if (m) { setRsErr(m); return; }
    if (rs.password !== rs.confirm) { setRsErr('Şifreler aynı değil.'); return; }
    setRsBusy(true); setRsErr('');
    const r = await Account.resetPassword(rs.token, rs.password);
    setRsBusy(false);
    if (!r.ok) { setRsErr(r.error); return; }
    setRs({ token: '', password: '', confirm: '' }); setPw(''); setOkMsg(r.message); setErr({});
    history.replaceState(null, '', '/giris'); setView('login');
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
            <p className="sub">T.C. kimlik numaranız ve şifrenizle giriş yapın.</p>
            {okMsg ? <Alert kind="ok">{okMsg}</Alert> : null}
            {signed ? <Alert kind="info"><b>{signed.name}</b> olarak giriş yaptınız. <a href={signed.admin ? '/admin' : next} style={{ color: 'var(--g600)', fontWeight: 800 }}>{signed.admin ? 'Yönetim paneline gidin' : 'Uygulamaya devam edin'}</a> ya da başka bir hesapla giriş yapın.</Alert> : null}

            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="lgId">T.C. kimlik numarası</label>
                <input ref={idRef} className="inp num" id="lgId" name="username" autoComplete="username" inputMode="numeric" maxLength={11} spellCheck={false}
                  placeholder="11 haneli T.C. kimlik no" aria-describedby="lgIdErr" aria-invalid={!!err.id} required value={id}
                  onChange={(e) => { setId(e.target.value.replace(/\D/g, '')); setErr({}); }} />
                <FieldError id="lgIdErr" msg={err.id} />
              </div>
              <div className="field">
                <label htmlFor="lgPw">Şifre <a href="#" onClick={(e) => { e.preventDefault(); setFg((x) => ({ ...x, tc: id })); setView('forgot'); }}>Şifremi unuttum</a></label>
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

        {view === 'forgot' && (
          <div className="formbox">
            <h2 tabIndex={-1}>Şifremi unuttum</h2>
            <p className="sub">T.C. kimlik numaranızı ve hesabınızdaki e-posta adresini yazın; şifre yenileme bağlantısı e-postanıza gönderilir.</p>
            <form onSubmit={submitForgot} noValidate>
              <div className="field"><label htmlFor="fgTc">T.C. kimlik numarası</label>
                <input className="inp num" id="fgTc" inputMode="numeric" maxLength={11} value={fg.tc} onChange={(e) => setFg({ ...fg, tc: e.target.value.replace(/\D/g, '') })} /></div>
              <div className="field"><label htmlFor="fgEmail">E-posta</label>
                <input className="inp" id="fgEmail" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="ad@alanadi.com" value={fg.email} onChange={(e) => setFg({ ...fg, email: e.target.value })} /></div>
              {rsErr ? <Alert kind="err">{rsErr}</Alert> : null}
              <button className="btn primary block submit" type="submit" disabled={rsBusy}>{rsBusy ? <><Spin />Gönderiliyor</> : 'Bağlantı gönder'}</button>
            </form>
            <p className="swap" style={{ display: 'block' }}><a href="#" onClick={(e) => { e.preventDefault(); setView('login'); }}>Girişe dön</a></p>
          </div>
        )}

        {view === 'reset' && (
          <div className="formbox">
            <h2 tabIndex={-1}>Yeni şifre belirle</h2>
            <form onSubmit={submitReset} noValidate>
              <div className="field"><label htmlFor="rsPw">Yeni şifre</label>
                <PasswordInput id="rsPw" autoComplete="new-password" placeholder="En az 10 karakter, büyük/küçük harf ve rakam" value={rs.password} onChange={(e) => { setRs({ ...rs, password: e.target.value }); setRsErr(''); }} />
                <Meter s={strength(rs.password)} /></div>
              <div className="field"><label htmlFor="rsPw2">Yeni şifre tekrar</label>
                <input className="inp" id="rsPw2" type="password" autoComplete="new-password" value={rs.confirm} onChange={(e) => { setRs({ ...rs, confirm: e.target.value }); setRsErr(''); }} /></div>
              {rsErr ? <Alert kind="err">{rsErr}</Alert> : null}
              <button className="btn primary block submit" type="submit" disabled={rsBusy}>{rsBusy ? <><Spin />Kaydediliyor</> : 'Şifreyi yenile'}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
