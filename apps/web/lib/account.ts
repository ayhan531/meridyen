/**
 * Hesap ve oturum işlemleri (sunucu: NestJS /api/auth, /api/state).
 * Oturum httpOnly çerezde tutulur; tarayıcıda yalnızca bu cihazda kullanılan hesapların listesi saklanır.
 */
import { api, ApiFail } from './api';

export interface User {
  no: string; name: string; email: string; phone: string; createdAt: string; demo: boolean; twoFA: boolean;
  lastLogin: string | null; prevLogin: string | null; marketing: boolean; pwChangedAt: string | null;
}
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
    if (s.length < 8) return 'Şifre en az 8 karakter olmalı.';
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s) || !/\d/.test(s)) return 'Şifrede en az bir harf ve bir rakam olmalı.';
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
const ACC = 'mrdyn.accounts.v2';
function readAccounts(): { no: string; user: string }[] { try { return JSON.parse(localStorage.getItem(ACC) || '[]'); } catch { return []; } }
function rememberAccount(u: User) {
  try { const l = readAccounts().filter((a) => a.no !== u.no); l.unshift({ no: u.no, user: u.name }); localStorage.setItem(ACC, JSON.stringify(l.slice(0, 8))); } catch { /* yok say */ }
}
function forgetAccount(no: string) { try { localStorage.setItem(ACC, JSON.stringify(readAccounts().filter((a) => a.no !== no))); } catch { /* yok say */ } }

/* ---------- oturum ---------- */
let me: User | null = null;
let remember = false;

const fail = (e: unknown) => (e instanceof ApiFail ? e.body : { message: 'İşlem tamamlanamadı.' });

export const Account = {
  DEMO: { no: '48273621' },
  async load(): Promise<User | null> {
    try { const r = await api<{ user: User | null; remember: boolean }>('/auth/me'); me = r.user; remember = r.remember; if (me) rememberAccount(me); }
    catch { me = null; }
    return me;
  },
  current(): (User & { remember: boolean }) | null { return me ? { ...me, remember } : null; },
  getUser(no: string): User | null { return me && me.no === no ? me : null; },
  accounts() { const l = readAccounts(); if (me && !l.some((a) => a.no === me!.no)) l.unshift({ no: me.no, user: me.name }); return l; },

  async register(input: { name: string; email: string; phone: string; password: string; passwordConfirm?: string; consent: boolean; marketing?: boolean; remember?: boolean }) {
    try { const r = await api<{ user: User }>('/auth/register', { method: 'POST', body: input }); me = r.user; remember = !!input.remember; rememberAccount(me); return { ok: true as const, user: me }; }
    catch (e) { const b = fail(e); return { ok: false as const, errors: (b as { errors?: Fields }).errors || { form: b.message } }; }
  },
  async signIn(identifier: string, password: string, rem: boolean) {
    try {
      const r = await api<{ user?: User; needCode?: boolean; code?: string | null; phone?: string }>('/auth/login', { method: 'POST', body: { identifier, password, remember: rem } });
      if (r.needCode) return { ok: false as const, needCode: true as const, code: r.code || null, phone: r.phone || '' };
      me = r.user!; remember = rem; rememberAccount(me);
      return { ok: true as const, user: me };
    } catch (e) { const b = fail(e) as { message: string; field?: string; locked?: boolean }; return { ok: false as const, error: b.message, field: b.field, locked: b.locked }; }
  },
  async verifyCode(code: string) {
    try { const r = await api<{ user: User }>('/auth/verify-code', { method: 'POST', body: { code } }); me = r.user; rememberAccount(me); return { ok: true as const }; }
    catch (e) { const b = fail(e) as { message: string; expired?: boolean }; return { ok: false as const, error: b.message, expired: !!b.expired }; }
  },
  async resetPassword(input: { email: string; phone: string; password: string; confirm?: string }) {
    try { const r = await api<{ no: string }>('/auth/reset-password', { method: 'POST', body: input }); return { ok: true as const, no: r.no }; }
    catch (e) { const b = fail(e) as { message: string; errors?: Fields }; return { ok: false as const, errors: b.errors || { form: b.message } }; }
  },
  async signOut() { try { await api('/auth/logout', { method: 'POST', body: {} }); } catch { /* yok say */ } me = null; },
  async setRemember(on: boolean) { try { await api('/auth/remember', { method: 'POST', body: { remember: on } }); remember = on; } catch { /* yok say */ } },
  async updateProfile(_no: string, input: { name: string; email: string; phone: string; marketing?: boolean }) {
    try { const r = await api<{ user: User }>('/auth/profile', { method: 'PATCH', body: input }); me = r.user; rememberAccount(me); return { ok: true as const, user: me }; }
    catch (e) { const b = fail(e) as { message: string; errors?: Fields }; return { ok: false as const, errors: b.errors || { form: b.message } }; }
  },
  async changePassword(_no: string, current: string, next: string, confirm?: string) {
    try { const r = await api<{ user: User }>('/auth/change-password', { method: 'POST', body: { current, next, confirm } }); me = r.user; return { ok: true as const }; }
    catch (e) { const b = fail(e) as { message: string; field?: string }; return { ok: false as const, field: b.field || 'current', error: b.message }; }
  },
  async setTwoFA(_no: string, enabled: boolean) {
    try { const r = await api<{ user: User }>('/auth/two-factor', { method: 'POST', body: { enabled } }); me = r.user; return { ok: true as const, user: me }; }
    catch (e) { return { ok: false as const, error: fail(e).message }; }
  },
  async deleteAccount(no: string, password: string) {
    try { await api('/auth/account', { method: 'DELETE', body: { password } }); forgetAccount(no); me = null; return { ok: true as const }; }
    catch (e) { return { ok: false as const, error: fail(e).message }; }
  },

  /* ---------- uygulama durumu ---------- */
  async loadState(): Promise<{ data: Record<string, unknown> | null; rev: number }> {
    const r = await api<{ data: Record<string, unknown> | null; rev: number }>('/state');
    stateRev = r.rev; return r;
  },
  /** Değişiklikler 600 ms içinde toplanıp tek istekle kaydedilir. */
  saveState(data: Record<string, unknown>) { pending = data; if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(() => void flush(false), 600); },
  flushState() { if (pending) void flush(true); },
  onConflict(f: (data: Record<string, unknown>) => void) { conflictHandler = f; },
};

let pending: Record<string, unknown> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let stateRev = 0;
let saving = false;
let conflictHandler: ((data: Record<string, unknown>) => void) | null = null;

async function flush(keepalive: boolean) {
  if (!pending || (saving && !keepalive)) return;
  const data = pending; pending = null; saving = true;
  try {
    const r = await api<{ ok?: boolean; rev: number; conflict?: boolean; data?: Record<string, unknown> }>('/state', { method: 'PUT', body: { data, rev: stateRev }, keepalive });
    stateRev = r.rev;
    if (r.conflict && r.data && conflictHandler) conflictHandler(r.data);
  } catch (e) {
    if (e instanceof ApiFail && e.status === 401) { window.location.href = '/giris?next=/app'; return; }
    if (!pending) pending = data;   // bağlantı hatası: bir sonraki değişiklikle yeniden denenir
  } finally { saving = false; if (pending && !keepalive) { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(() => void flush(false), 1500); } }
}
