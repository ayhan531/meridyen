/** Şifre, T.C. kimlik, IBAN, TOTP ve e-posta yardımcıları (Python: hash_password, valid_turkish_identity_number, ...). */
import { createHmac, pbkdf2, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';
import { Conn } from './db';
import { digitsOnly, now } from './common';

const pbkdf2Async = (pw: string, salt: string, iter: number, len: number, digest: string) =>
  new Promise<Buffer>((resolve, reject) => pbkdf2(pw, salt, iter, len, digest, (e, k) => (e ? reject(e) : resolve(k))));

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a, 'utf-8'); const y = Buffer.from(b, 'utf-8');
  return x.length === y.length && timingSafeEqual(x, y);
};

/** PBKDF2-HMAC-SHA256, 260.000 tur — Python sürümüyle aynı parametreler (mevcut özetler uyumlu). */
export async function hashPassword(password: string, salt?: string): Promise<[string, string]> {
  const s = salt ?? randomBytes(16).toString('hex');
  const dk = await pbkdf2Async(password, s, 260_000, 32, 'sha256');
  return [s, dk.toString('hex')];
}

export async function verifyPassword(password: string, salt: string, stored: string): Promise<boolean> {
  const [, candidate] = await hashPassword(password, salt);
  return safeEq(candidate, stored);
}

export function passwordIsStrong(password: string): boolean {
  return password.length >= 10 && /[A-ZÇĞİÖŞÜ]/.test(password) && /[a-zçğıöşü]/.test(password) && /\d/.test(password);
}

export function validTurkishIdentityNumber(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = [...value].map(Number);
  const sum = (idx: number[]) => idx.reduce((a, i) => a + d[i], 0);
  const mod10 = (x: number) => ((x % 10) + 10) % 10;
  const tenth = mod10(sum([0, 2, 4, 6, 8]) * 7 - sum([1, 3, 5, 7]));
  const eleventh = mod10(sum([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  return d[9] === tenth && d[10] === eleventh;
}

/** Algoritmaya uyan ama gerçek olamayacak kalıpları da eler (11111111110). */
export function identityNumberIsReal(value: string): boolean {
  return validTurkishIdentityNumber(value) && new Set(value.slice(0, 10)).size > 1;
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b32decode(input: string): Buffer {
  const s = input.replace(/=+$/, '').toUpperCase();
  let bits = 0; let value = 0; const out: number[] = [];
  for (const ch of s) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('Incorrect padding / geçersiz base32');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

export function b32encode(buf: Buffer): string {
  let bits = 0; let value = 0; let out = '';
  for (const b of buf) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function totpCode(secret: string, timestamp?: number): string {
  const key = b32decode(secret.replace(/\s+/g, ''));
  const counter = Math.floor((timestamp ?? now()) / 30);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', key).update(msg).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, '0');
}

export function verifyTotp(secret: string, code: string): boolean {
  const clean = code.replace(/\D/g, '');
  if (!(secret && clean.length === 6)) return false;
  return [-1, 0, 1].some((step) => safeEq(totpCode(secret, now() + step * 30), clean));
}

export function turkishIban(value: string): string {
  const iban = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^TR\d{24}$/.test(iban)) return '';
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = [...rearranged].map((c) => (/[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c)).join('');
  return BigInt(numeric) % 97n === 1n ? iban : '';
}

export function riskProfileFor(score: number): string {
  if (score <= 6) return 'Muhafazakar';
  if (score <= 12) return 'Dengeli';
  return 'Dinamik';
}

/** Rastgele 5 haneli, benzersiz müşteri numarası: OT + 5 rakam. */
export async function generateAccountNo(conn: Conn): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const candidate = 'OT' + String(randomInt(0, 100000)).padStart(5, '0');
    if (!(await conn.get('SELECT 1 FROM users WHERE account_no=?', [candidate]))) return candidate;
  }
  return 'OT' + String(randomInt(0, 100000)).padStart(5, '0');
}

export async function sendResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const password = process.env.SMTP_PASSWORD || '';
  if (!host || !user || !password) return false;
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({ host, port, secure: false, requireTLS: true, auth: { user, pass: password }, connectionTimeout: 12_000, greetingTimeout: 12_000, socketTimeout: 12_000 });
  await transport.sendMail({
    from: process.env.SMTP_FROM || user,
    to: email,
    subject: 'Meridyen Yatırım şifre yenileme',
    text: `Şifrenizi 30 dakika içinde yenilemek için bağlantıyı açın:\n\n${resetUrl}\n`,
  });
  return true;
}

export { digitsOnly };
