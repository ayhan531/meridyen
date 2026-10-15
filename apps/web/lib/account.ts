/**
 * Hesap ve oturum işlemleri: e-şube (ottoman) sistemiyle aynıdır — T.C. kimlik no + şifre, onaylı müşteri,
 * bakiye / emir / para talepleri aynı veritabanından. Oturum httpOnly çerezde tutulur.
 */
import { api, ApiFail } from './api';

export interface User {
  no: string; name: string; email: string; phone: string; createdAt: string; demo: boolean; twoFA: boolean;
  lastLogin: string | null; prevLogin: string | null; marketing: boolean; pwChangedAt: string | null;
  role: string; status: string; statusLabel: string; kycStatus: string; kycStatusLabel: string; kycNote: string; avatar: string;
}
const toUser = (u: any): User => ({
  no: u.account_no || String(u.id), name: u.full_name || '', email: u.email || '', phone: String(u.phone || ''), createdAt: u.created_at ? String(u.created_at).replace(' ', 'T') + 'Z' : '',
  demo: false, twoFA: !!u.two_factor_enabled, lastLogin: u.last_login_at || null, prevLogin: null, marketing: false, pwChangedAt: null,
  role: u.role || 'user', status: u.status || '', statusLabel: u.status_label || '', kycStatus: u.kyc_status || '', kycStatusLabel: u.kyc_status_label || '', kycNote: u.kyc_note || '', avatar: u.avatar_url || '',
});
export const tcValid = (tc: string) => {
  const d = String(tc).replace(/\D/g, '');
  if (!/^[1-9]\d{10}$/.test(d)) return false;
  const n = d.split('').map(Number);
  const odd = n[0] + n[2] + n[4] + n[6] + n[8], even = n[1] + n[3] + n[5] + n[7];
  if (((odd * 7 - even) % 10 + 10) % 10 !== n[9]) return false;
  return n.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === n[10];
};
type Fields = Record<string, string>;

/* ---------- doğrulama (sunucudakiyle aynı kurallar) ---------- */
export const trLower = (s: unknown) => String(s ?? '').trim().toLocaleLowerCase('tr');
export const normPhone = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
export const V = {
  name(v: string) {
    const s = String(v ?? '').trim().replace(/\s+/g, ' ');
    if (!s) return 'Adınızı ve soyadınızı yazın.';
    if (s.length < 5 || s.split(' ').length < 2) return 'Adınızı ve soyadınızı birlikte yazın.';
    if (!/^[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû' .-]+$/.test(s)) return 'Ad soyad yalnızca harf içerebilir.';
    return '';
  },
  email(v: string) {
    const s = String(v ?? '').trim();
    if (!s) return 'E-posta adresinizi yazın.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) || s.length > 120) return 'Geçerli bir e-posta adresi yazın (ör. ad@alanadi.com).';
    return '';
  },
  phone(v: string) {
    const d = normPhone(v);
    if (!d) return 'Cep telefonu numaranızı yazın.';
    if (d.length !== 10 || d[0] !== '5') return 'Cep telefonu 5 ile başlayan 10 haneli olmalı (5XX XXX XX XX).';
    return '';
  },
  password(v: string) {
    const s = String(v ?? '');
    if (s.length < 10) return 'Şifre en az 10 karakter olmalı.';
    if (!/[a-zçğıöşü]/.test(s) || !/[A-ZÇĞİÖŞÜ]/.test(s) || !/\d/.test(s)) return 'Şifrede büyük harf, küçük harf ve rakam olmalı.';
    if (s.length > 128) return 'Şifre en fazla 128 karakter olabilir.';
    return '';
  },
};
/** 0 = yok, 1 = zayıf, 2 = orta, 3 = iyi, 4 = güçlü */
export function strength(pw: string): number {
  const s = String(pw || ''); if (!s) return 0;
  let score = 0;
  if (s.length >= 8) score++;
  if (s.length >= 12) score++;
  if (/[a-zçğıöşü]/.test(s) && /[A-ZÇĞİÖŞÜ]/.test(s)) score++;
  if (/\d/.test(s) && /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(s)) score++;
  if (V.password(s)) score = Math.min(score, 1);
  return Math.max(1, Math.min(4, score));
}
export const maskPhone = (ph: string) => { const d = String(ph || ''); return d.length === 10 ? `${d.slice(0, 3)} *** ** ${d.slice(8)}` : '***'; };
export const fmtPhone = (ph: string) => { const d = normPhone(ph).slice(0, 10); return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' '); };

/** Giriş sonrası yalnızca site içi uygulama adresine dönülür (açık yönlendirme olmasın). */
export function safeNext(next: string | null | undefined): string {
  const n = String(next || '');
  return /^\/app(\/)?(\?[\w=&-]*)?(#[\w-]*)?$/.test(n) ? n : '/app';
}

/* ---------- bu cihazdaki hesaplar ---------- */
const ACC = 'mrdyn.accounts.v3';
function readAccounts(): { no: string; user: string }[] { try { return JSON.parse(localStorage.getItem(ACC) || '[]'); } catch { return []; } }
function rememberAccount(u: User) {
  try { const l = readAccounts().filter((a) => a.no !== u.no); l.unshift({ no: u.no, user: u.name }); localStorage.setItem(ACC, JSON.stringify(l.slice(0, 8))); } catch { /* yok say */ }
}

/* ---------- oturum ---------- */
let me: User | null = null;
let remember = false;
let acct: any = null;

const fail = (e: unknown) => (e instanceof ApiFail ? e.body : { message: 'İşlem tamamlanamadı.' });

export const Account = {
  DEMO: { no: '' },
  async load(): Promise<User | null> {
    try { const r = await api<{ user: any; account?: any }>('/me'); me = r.user ? toUser(r.user) : null; acct = r.account || null; if (me) rememberAccount(me); }
    catch { me = null; }
    return me;
  },
  current(): (User & { remember: boolean }) | null { return me ? { ...me, remember } : null; },
  getUser(no: string): User | null { return me && me.no === no ? me : null; },
  accountInfo() { return acct; },
  accounts() { const l = readAccounts(); if (me && !l.some((a) => a.no === me!.no)) l.unshift({ no: me.no, user: me.name }); return l; },

  async register(f: Record<string, string | boolean>) {
    const form = new FormData();
    Object.entries(f).forEach(([k, v]) => { if (typeof v === 'boolean') { if (v) form.append(k, '1'); } else if (v != null) form.append(k, String(v)); });
    try { await api('/register', { method: 'POST', form }); return { ok: true as const }; }
    catch (e) { return { ok: false as const, error: fail(e).message }; }
  },
  async signIn(tc: string, password: string, rem: boolean) {
    try {
      const r = await api<{ user: any }>('/login', { method: 'POST', body: { tc: tc.replace(/\D/g, ''), password, remember: rem } });
      me = toUser(r.user); remember = rem; rememberAccount(me);
      return { ok: true as const, user: me };
    } catch (e) { const b = fail(e) as { message: string }; return { ok: false as const, error: b.message }; }
  },
  async forgot(tc: string, email: string) {
    try { const r = await api<{ message: string }>('/password/forgot', { method: 'POST', body: { tc: tc.replace(/\D/g, ''), email } }); return { ok: true as const, message: r.message }; }
    catch (e) { return { ok: false as const, error: fail(e).message }; }
  },
  async resetPassword(token: string, newPassword: string) {
    try { const r = await api<{ message: string }>('/password/reset', { method: 'POST', body: { token, new_password: newPassword } }); return { ok: true as const, message: r.message }; }
    catch (e) { return { ok: false as const, error: fail(e).message }; }
  },
  async signOut() { try { await api('/logout', { method: 'POST', body: {} }); } catch { /* yok say */ } me = null; acct = null; },
  async changePassword(current: string, next: string) {
    try { await api('/profile/password', { method: 'POST', body: { current_password: current, new_password: next } }); return { ok: true as const }; }
    catch (e) { return { ok: false as const, error: fail(e).message }; }
  },
  async uploadDocuments(front: File | null, back: File | null) {
    const form = new FormData();
    if (front) form.append('identity_front', front);
    if (back) form.append('identity_back', back);
    try { await api('/profile/documents', { method: 'POST', form }); return { ok: true as const }; }
    catch (e) { return { ok: false as const, error: fail(e).message }; }
  },
  /** Bakiye, pozisyonlar, emirler, para talepleri, işlemler, banka hesapları, belgeler: tek çağrı. */
  portfolio() { return api<any>('/portfolio'); },
};
