'use client';
import { useState, type ComponentProps } from 'react';

const ERR_IC = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ flex: 'none', marginTop: 2 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
);

export function FieldError({ id, msg }: { id: string; msg?: string }) {
  return <div className={`ferr${msg ? ' on' : ''}`} id={id}>{msg ? <>{ERR_IC}<span>{msg}</span></> : null}</div>;
}

export function Alert({ kind, children, id }: { kind: 'err' | 'ok' | 'info'; children: React.ReactNode; id?: string }) {
  return <div className={`alert ${kind}`} id={id} role={kind === 'err' ? 'alert' : 'status'}>{kind === 'err' ? ERR_IC : null}<span>{children}</span></div>;
}

const EYE_ON = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
const EYE_OFF = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A16.8 16.8 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;

/** Göster / gizle düğmeli şifre kutusu. */
export function PasswordInput(props: ComponentProps<'input'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="inpw">
      <input {...props} className="inp has-btn" type={show ? 'text' : 'password'} />
      <button className="eye" type="button" aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? EYE_OFF : EYE_ON}</button>
    </div>
  );
}

export function Meter({ s }: { s: number }) {
  return <div className="meter" data-s={s} aria-hidden="true"><i /><i /><i /><i /></div>;
}

export function Spin() { return <span className="spin" aria-hidden="true" />; }

export const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const BACK = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>;
