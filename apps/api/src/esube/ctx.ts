/** İstek bağlamı: gövde okuma, çok parçalı form, oturum, CORS, yanıt üreticileri (Python: AppHandler yardımcıları). */
import type { Request } from 'express';
import sharp, { Metadata } from 'sharp';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Conn } from './db';
import { cfg, HttpError, now, pyStr, Row } from './common';

export interface Reply { status: number; headers: Record<string, string>; body: Buffer }

export type Query = Record<string, string[]>;

/* ----------------------------------------------------------- multipart */

export class Part {
  name = ''; filename = ''; type: string; value: string | null; data: Buffer | null;
  constructor(headers: Record<string, string>, data: Buffer) {
    const disp = headers['content-disposition'] || '';
    for (let token of disp.split(';')) {
      token = token.trim();
      if (token.startsWith('name=')) this.name = stripQuotes(token.slice(5));
      else if (token.startsWith('filename=')) this.filename = stripQuotes(token.slice(9));
    }
    this.type = (headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
    this.value = this.filename ? null : data.toString('utf-8');
    this.data = this.filename ? data : null;
  }
}
const stripQuotes = (s: string) => s.replace(/^"+|"+$/g, '');

function bufSplit(buf: Buffer, sep: Buffer): Buffer[] {
  const out: Buffer[] = [];
  let start = 0;
  for (;;) {
    const i = buf.indexOf(sep, start);
    if (i < 0) { out.push(buf.subarray(start)); return out; }
    out.push(buf.subarray(start, i));
    start = i + sep.length;
  }
}
const lstripCRLF = (b: Buffer) => { let i = 0; while (i < b.length && (b[i] === 13 || b[i] === 10)) i++; return b.subarray(i); };
const rstripCRLF = (b: Buffer) => { let i = b.length; while (i > 0 && (b[i - 1] === 13 || b[i - 1] === 10)) i--; return b.subarray(0, i); };
const asciiWs = (c: number) => c === 32 || (c >= 9 && c <= 13);
const stripWs = (b: Buffer) => { let s = 0; let e = b.length; while (s < e && asciiWs(b[s])) s++; while (e > s && asciiWs(b[e - 1])) e--; return b.subarray(s, e); };

const LINE_BREAK = new RegExp('\\r\\n|\\n|\\r|\\u000b|\\u000c|\\u001c|\\u001d|\\u001e|\\u0085|\\u2028|\\u2029');

export class MultipartForm {
  private parts = new Map<string, Part[]>();
  constructor(raw: Buffer, contentType: string) {
    let boundary = '';
    for (let token of contentType.split(';')) {
      token = token.trim();
      if (token.startsWith('boundary=')) boundary = stripQuotes(token.slice(9));
    }
    if (!boundary) return;
    const sep = Buffer.from('--' + boundary);
    const chunks = bufSplit(raw, sep);
    for (let chunk of chunks.slice(1)) {
      const st = stripWs(chunk);
      if ((st.length === 2 && st[0] === 45 && st[1] === 45) || (chunk.length >= 2 && chunk[0] === 45 && chunk[1] === 45)) break;
      chunk = lstripCRLF(chunk);
      const i = chunk.indexOf('\r\n\r\n');
      if (i < 0) continue;
      const hdrRaw = chunk.subarray(0, i).toString('utf-8');
      const body = rstripCRLF(chunk.subarray(i + 4));
      const hdrs: Record<string, string> = {};
      for (const line of hdrRaw.split(LINE_BREAK)) {
        const c = line.indexOf(':');
        if (c >= 0) hdrs[line.slice(0, c).trim().toLowerCase()] = line.slice(c + 1).trim();
      }
      const part = new Part(hdrs, body);
      if (part.name) {
        const arr = this.parts.get(part.name);
        if (arr) arr.push(part); else this.parts.set(part.name, [part]);
      }
    }
  }
  keys(): string[] { return [...this.parts.keys()]; }
  has(key: string): boolean { return this.parts.has(key); }
  /** Tek parça ise Part, aksi halde liste (Python __getitem__). */
  get(key: string): Part | Part[] {
    const p = this.parts.get(key) || [];
    return p.length === 1 ? p[0] : p;
  }
}

/** field_value(form, name) */
export function fieldValue(form: MultipartForm, name: string): string {
  const item = form.has(name) ? form.get(name) : null;
  if (item === null || Array.isArray(item)) return '';
  return (item.value || '').trim();
}

/** Sadece tek ve dosya olan parça, yoksa null */
export function fileItem(form: MultipartForm, name: string): Part | null {
  if (!form.has(name)) return null;
  const item = form.get(name);
  if (Array.isArray(item) || !item.filename) return null;
  return item;
}

/* ------------------------------------------------------------- Ctx */

const ALLOWED_ORIGINS = new Set([
  'http://localhost:4173', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:8008',
  'https://ottoman.local', 'capacitor://ottoman.local', 'https://localhost', 'capacitor://localhost', 'http://localhost',
]);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = String(req.headers['origin'] || '');
  const host = String(req.headers['host'] || '');
  let netloc = '';
  try { netloc = origin.includes('://') ? new URL(origin).host : ''; } catch { netloc = ''; }
  const allow = origin && (netloc === host || ALLOWED_ORIGINS.has(origin) || origin.startsWith('capacitor://') || origin.includes('localhost') || origin.includes('onrender.com'));
  return {
    'Access-Control-Allow-Origin': allow ? origin : '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie, Authorization, X-Session-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  };
}

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};

async function readBody(req: Request, length: number): Promise<Buffer> {
  if (length <= 0) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let got = 0;
  for await (const c of req) {
    const b = Buffer.isBuffer(c) ? c : Buffer.from(c);
    chunks.push(b); got += b.length;
    if (got >= length) break;
  }
  return Buffer.concat(chunks).subarray(0, length);
}

export class Ctx {
  private remote: string;
  constructor(readonly req: Request, readonly method: string, readonly path: string, readonly query: Query) {
    this.remote = (req.socket?.remoteAddress || '').replace(/^::ffff:/, '');   // istek bittikten sonra soket silinebilir
  }

  header(name: string): string { const v = this.req.headers[name.toLowerCase()]; return Array.isArray(v) ? v.join(', ') : (v ?? ''); }

  /** Soket bağlantı bilgisi istek bittikten sonra silinebildiği için ilk çağrıda saklanır. */
  ip(): string {
    const fwd = this.header('x-forwarded-for').split(',')[0].trim();
    return fwd || this.remote;
  }
  ua(): string { return this.header('user-agent'); }
  q(key: string): string { return this.query[key]?.[0] ?? ''; }

  sessionId(): string {
    for (const k of ['authorization']) {
      const auth = this.header(k).trim();
      if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
      if (auth && !auth.startsWith('Basic ') && auth.length > 10) return auth.trim();
    }
    const x = this.header('x-session-id').trim();
    if (x) return x;
    for (const part of this.header('cookie').split(';')) {
      if (!part.includes('=')) continue;
      const i = part.trim().indexOf('=');
      const key = part.trim().slice(0, i); const value = part.trim().slice(i + 1);
      if (key === cfg.cookieName) return value;
    }
    return '';
  }

  private contentLength(): number {
    const n = parseInt(this.header('content-length') || '0', 10);
    return Number.isFinite(n) ? n : 0;
  }

  /** read_json: 256.000 bayt sınırı; boşsa {} */
  async readJson(): Promise<any> {
    const length = this.contentLength();
    if (length > 256_000) throw new HttpError(413, 'İstek çok büyük');
    const raw = length ? await readBody(this.req, length) : Buffer.from('{}');
    try { return JSON.parse(raw.toString('utf-8') || '{}'); } catch { throw new HttpError(400, 'JSON okunamadı'); }
  }

  /** read_json() sonucunun dict olduğu varsayılan kullanım: dict değilse Python AttributeError → 500 */
  async readObject(): Promise<Row> {
    const v = await this.readJson();
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new TypeError("'" + typeof v + "' object has no attribute 'get'");
    return v;
  }

  async readMultipart(): Promise<MultipartForm> {
    const length = this.contentLength();
    if (length > cfg.maxUploadBytes * 4) throw new HttpError(413, 'Dosya boyutu çok büyük');
    const ct = this.header('content-type');
    if (!ct.startsWith('multipart/form-data')) throw new HttpError(400, 'Form tipi hatalı');
    return new MultipartForm(await readBody(this.req, length), ct);
  }

  async readJsonOrMultipart(): Promise<[Row, MultipartForm | null]> {
    if (this.header('content-type').startsWith('multipart/form-data')) {
      const form = await this.readMultipart();
      const data: Row = {};
      for (const key of form.keys()) {
        const item = form.get(key);
        if (Array.isArray(item) || item.filename) continue;
        data[key] = fieldValue(form, key);
      }
      return [data, form];
    }
    return [await this.readObject(), null];
  }

  json(data: any, status = 200, extra: Record<string, string> = {}): Reply {
    return { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra }, body: Buffer.from(JSON.stringify(data), 'utf-8') };
  }

  csv(filename: string, headers: string[], rows: any[][]): Reply {
    const cell = (v: any) => '"' + String(v === null || v === undefined ? '' : pyStr(v)).replace(/"/g, '""') + '"';
    const text = '﻿' + [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\r\n');
    return { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` }, body: Buffer.from(text, 'utf-8') };
  }

  /* --- oturum --- */
  async currentUser(conn: Conn): Promise<Row | null> {
    const sid = this.sessionId();
    if (!sid) return null;
    const row = await conn.get('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.sid=? AND s.expires_at>?', [sid, now()]);
    if (row) await conn.run('UPDATE sessions SET last_seen_at=? WHERE sid=?', [now(), sid]);
    return row ? { ...row } : null;
  }
  async requireUser(conn: Conn): Promise<Row> {
    const user = await this.currentUser(conn);
    if (!user) throw new HttpError(401, 'Oturum gerekli');
    return user;
  }
  async requireAdmin(conn: Conn): Promise<Row> {
    const user = await this.requireUser(conn);
    if (user.role !== 'admin') throw new HttpError(403, 'Admin yetkisi gerekli');
    return user;
  }
  /** Patron talebiyle kaldırıldı (Python ile aynı): boş. */
  async requireAdminStepUp(_conn: Conn): Promise<void> { /* boş */ }
}

export const tokenHex = (n: number) => randomBytes(n).toString('hex');

/* ------------------------------------------------------------ yüklemeler */

export const MAX_IMAGE_DIMENSION = 2200;

export function readUploadBytes(item: Part, tooLarge = 'Dosya çok büyük'): Buffer {
  const data = item.data || Buffer.alloc(0);
  if (data.length > cfg.maxUploadBytes) throw new HttpError(413, tooLarge);
  return data;
}

async function heicToJpeg(raw: Buffer): Promise<Buffer | null> {
  const brand = raw.subarray(4, 12).toString('latin1');
  if (!/^ftyp(heic|heix|hevc|hevx|mif1|msf1)/.test(brand)) return null;
  try {
    const mod: any = await import('heic-convert');
    const convert = mod.default || mod;
    const out = await convert({ buffer: raw, format: 'JPEG', quality: 0.92 });
    return Buffer.from(out);
  } catch { return null; }
}

/** transcode_uploaded_image: gerçek içerik JPEG (ya da saydamlık varsa PNG) olarak yeniden kodlanır. */
export async function transcodeUploadedImage(raw: Buffer): Promise<[Buffer, string]> {
  const bad = () => new HttpError(400, 'Görsel dosyası okunamadı ya da desteklenmeyen bir format');
  let input = raw;
  let meta: Metadata;
  try {
    meta = await sharp(input, { failOn: 'error' }).metadata();
  } catch {
    const converted = await heicToJpeg(raw);
    if (!converted) throw bad();
    input = converted;
    try { meta = await sharp(input).metadata(); } catch { throw bad(); }
  }
  try {
    let pipeline = sharp(input, { failOn: 'error' }).rotate();
    pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true });
    if (meta.hasAlpha) return [await pipeline.png({ compressionLevel: 9 }).toBuffer(), '.png'];
    return [await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer(), '.jpg'];
  } catch {
    throw bad();
  }
}

export async function storeUpload(conn: Conn, name: string, contentType: string, data: Buffer): Promise<void> {
  if (cfg.uploadDir) {
    try {
      fs.mkdirSync(cfg.uploadDir, { recursive: true });
      fs.writeFileSync(path.join(cfg.uploadDir, path.basename(name)), data);
      return;
    } catch { /* disk yazılamazsa veritabanına düş */ }
  }
  await conn.run(
    'INSERT INTO uploaded_files (name, content_type, data, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET content_type=excluded.content_type, data=excluded.data',
    [name, contentType, data, now()],
  );
}

export async function canViewUpload(conn: Conn, user: Row, filename: string): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (user.avatar_url === `/uploads/${filename}`) return true;
  if (await conn.get('SELECT id FROM documents WHERE user_id=? AND stored_name=?', [user.id, filename])) return true;
  return !!(await conn.get('SELECT id FROM money_requests WHERE user_id=? AND receipt_stored_name=?', [user.id, filename]));
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf',
};
export function mimeFor(name: string): string {
  const i = name.lastIndexOf('.');
  return (i >= 0 && MIME[name.slice(i).toLowerCase()]) || 'application/octet-stream';
}
