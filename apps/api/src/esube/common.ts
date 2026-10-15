/**
 * E-şube (ottoman) arka ucunun ortak yardımcıları. Python sürümündeki (tools/backend_server.py) küçük
 * yardımcıların birebir karşılıkları: zaman, yuvarlama, tür dönüşümü, etiketler ve ortam ayarları.
 */
import * as os from 'os';
import * as path from 'path';

export type Row = Record<string, any>;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Python'daki ValueError/TypeError karşılığı: işlenmezse 500 "Sunucu hatası" olur. */
export class ValueError extends Error {}

export const now = (): number => Math.floor(Date.now() / 1000);

const p2 = (n: number) => String(n).padStart(2, '0');

/** time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts or now())) */
export function isoTime(ts?: number | null): string {
  const d = new Date((ts || now()) * 1000);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/** time.strftime("%Y-%m-%d", time.localtime(ts)) */
export function localDay(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** time.strftime("%d.%m.%Y", time.gmtime(ts)) */
export function gmDMY(ts: number): string {
  const d = new Date(ts * 1000);
  return `${p2(d.getUTCDate())}.${p2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** Python round(x, nd): tam yarıda çifte yuvarlar (0.125 → 0.12), diğer durumlarda gerçek ikilik değere göre. */
export function pyRound(x: number, nd = 2): number {
  if (!Number.isFinite(x)) return x;
  const m = 10 ** nd;
  const y = x * m;
  if (Math.abs(y % 1) === 0.5) {
    const lo = Math.floor(y);
    return (lo % 2 === 0 ? lo : lo + 1) / m;
  }
  return Number(x.toFixed(nd));
}
export const round2 = (x: number) => pyRound(x, 2);

/** Python float(): sayıya çevrilemezse ValueError. */
export function pyFloat(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^[+-]?(\d+(_\d+)*\.?(\d+(_\d+)*)?|\.\d+(_\d+)*)([eE][+-]?\d+)?$/.test(s)) return Number(s.replace(/_/g, ''));
    if (/^[+-]?(inf|infinity)$/i.test(s)) return s.startsWith('-') ? -Infinity : Infinity;
    if (/^[+-]?nan$/i.test(s)) return NaN;
    throw new ValueError(`could not convert string to float: '${v}'`);
  }
  throw new ValueError(`float() argument must be a string or a real number, not '${v === null ? 'NoneType' : typeof v}'`);
}

/** Python int(float(x)) (sıfıra doğru keser). */
export function pyIntOfFloat(v: any): number {
  const f = pyFloat(v);
  if (!Number.isFinite(f)) throw new ValueError('cannot convert float to integer');
  return Math.trunc(f);
}

/** Python int(x): "12" → 12, "1.5" → ValueError. */
export function pyInt(v: any): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ValueError('cannot convert float to integer');
    return Math.trunc(v);
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    if (/^\s*[+-]?\d+(_\d+)*\s*$/.test(v)) return Number(v.replace(/_/g, ''));
    throw new ValueError(`invalid literal for int() with base 10: '${v}'`);
  }
  throw new ValueError('int() argument must be a string or a real number');
}

/** Python str(x) (JSON'dan gelen değerler için). */
export function pyStr(v: any): string {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

/** Python bool(x). */
export function pyBool(v: any): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === 'object') return Object.keys(v).length > 0;
  return !!v;
}

/** payload.get(key, default) — JSON null da null olarak gelir. */
export function pget(p: any, key: string, dflt: any = undefined): any {
  return p && Object.prototype.hasOwnProperty.call(p, key) ? p[key] : dflt;
}

export function envFloat(key: string, dflt: number): number {
  const v = process.env[key];
  if (v === undefined) return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}
export function envInt(key: string, dflt: number): number {
  const v = process.env[key];
  if (v === undefined) return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : dflt;
}

export const cfg = {
  cookieName: 'ottoman_sid',
  sessionTtl: 60 * 60 * 24 * 7,
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
  logoCacheDir: path.join(os.tmpdir(), 'esube-company-logos'),
  marketUrl: process.env.MARKET_URL || 'https://trrealapi-market.onrender.com/latest',
  marketTimeout: envFloat('MARKET_TIMEOUT', 12),
  marketRefreshSeconds: envInt('MARKET_REFRESH_SECONDS', 12),
  companyMetaRefreshSeconds: envInt('COMPANY_META_REFRESH_SECONDS', 86400),
  newsRefreshSeconds: envInt('NEWS_REFRESH_SECONDS', 900),
  marketNewsRefreshSeconds: envInt('MARKET_NEWS_REFRESH_SECONDS', 600),
  maxUploadBytes: envInt('MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
  loginMaxAttempts: envInt('LOGIN_MAX_ATTEMPTS', 5),
  loginLockSeconds: envInt('LOGIN_LOCK_SECONDS', 900),
  passwordResetTtl: envInt('PASSWORD_RESET_TTL', 1800),
  agreementsVersion: process.env.AGREEMENTS_VERSION || '2026-08',
  allowPriceSimulation: (process.env.ALLOW_PRICE_SIMULATION || '0') === '1',
  requireLiveMarketForTrading: (process.env.REQUIRE_LIVE_MARKET_FOR_TRADING || '1') === '1',
  fxRefreshSeconds: envInt('FX_REFRESH_SECONDS', 6 * 60 * 60),
  indexRefreshSeconds: envInt('INDEX_REFRESH_SECONDS', 20),
  participationFeedUrl: process.env.PARTICIPATION_FEED_URL || 'https://www.borsaistanbul.com/datum/hisse_endeks_ds.csv',
  participationSyncSeconds: envInt('PARTICIPATION_SYNC_SECONDS', 21600),
  pushSubject: process.env.PUSH_SUBJECT || 'https://ottoman-eggb.onrender.com',
  /** Render'da yerel disk kalıcı olmadığı için yüklenen dosyalar veritabanında saklanır. */
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  seedTestUser: process.env.SEED_TEST_USER !== 'false',
};

export const MARKET_URLS = [
  cfg.marketUrl,
  'https://trrealapi-market.onrender.com/api/latest',
  'https://trrealapi-market.onrender.com/data',
].filter((u, i, a) => a.indexOf(u) === i);

export const TRADINGVIEW_SCANNER_URL = 'https://scanner.tradingview.com/turkey/scan';
export const TRADINGVIEW_LOGO_BASE = 'https://s3-symbol-logo.tradingview.com';

export const OFFICIAL_COMPANY_DOMAINS: Record<string, string> = {
  ALBTN: 'albayrakbeton.com.tr', BETAE: 'betaenerji.com', CITAS: 'citlekci.com.tr', EKDMR: 'ekinciler.com',
  EKIM: 'ekimtur.com', GOLDA: 'golda.com.tr', ISVEA: 'isvea.com.tr', KARCL: 'karcel.com.tr',
  KPEKS: 'kapeks.com.tr', MASFN: 'masfen.com.tr', METEN: 'metgunenerji.com.tr', ORZAX: 'orzax.com.tr',
  QUICK: 'quicksigorta.com', SARAE: 'sara-enerji.com', SOHOE: 'sohocompany.com.tr', SSAAT: 'saatvesaat.com',
  TKNKA: 'teknikaplast.com.tr', VEYAS: 'turkerveyas.com.tr',
};

export const NEWS_SOURCES: Record<string, string> = {
  'Borsa İstanbul': 'https://www.borsaistanbul.com/duyurular',
  TCMB: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/RSS/Basin+Duyurulari',
  SPK: 'https://spk.gov.tr/spk-bultenleri/{year}-yili-spk-bultenleri',
  KAP: 'https://www.kap.org.tr/tr',
};

export function statusLabel(value: string): string {
  const m: Record<string, string> = {
    pending: 'Beklemede', awaiting_back: 'Belge Bekleniyor', under_review: 'İnceleniyor', approved: 'Onaylandı',
    test_account: 'Test Hesabı', consumed: 'Alımda Kullanıldı', rejected: 'Reddedildi', suspended: 'Askıda', cancelled: 'İptal',
  };
  return Object.prototype.hasOwnProperty.call(m, value) ? m[value] : value;
}

export function documentStatusLabel(value: string): string {
  return value === 'pending' ? 'İncelemede' : statusLabel(value);
}

export const SUSPENDED_MESSAGE = 'Hesabınız askıya alınmıştır. Lütfen referansınızla iletişime geçiniz.';

/** Python'daki mapping.get(key, key) */
export function lookup(map: Record<string, string>, key: string): string {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : key;
}

/** Python re.sub(r"\D", "", str(x)) */
export const digitsOnly = (v: any) => pyStr(v).replace(/\D/g, '');

/** Python str.strip() */
export const strip = (s: string) => s.replace(/^[\s\u0085 ﻿]+|[\s\u0085 ﻿]+$/g, '');

/** Python str.casefold benzeri karşılaştırma */
export const casefold = (s: string) => s.normalize('NFKD').toLowerCase();

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Eşzamanlılık sınırlı Promise.all (ThreadPoolExecutor karşılığı). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Zaman aşımlı HTTP isteği; en fazla maxBytes bayt okunur (urllib.urlopen + read(n)). */
export async function httpBytes(
  url: string,
  opts: { timeoutMs?: number; maxBytes?: number; headers?: Record<string, string>; method?: string; body?: string | Buffer } = {},
): Promise<{ status: number; body: Buffer; headers: Headers }> {
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: opts.headers,
    body: opts.body as any,
    redirect: 'follow',
    signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const max = opts.maxBytes ?? Infinity;
  const chunks: Buffer[] = [];
  let size = 0;
  if (res.body) {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      size += value.byteLength;
      if (size >= max) { await reader.cancel().catch(() => undefined); break; }
    }
  }
  let body = Buffer.concat(chunks);
  if (body.length > max) body = body.subarray(0, max);
  return { status: res.status, body, headers: res.headers };
}

export async function httpJson(url: string, opts: Parameters<typeof httpBytes>[1] = {}): Promise<any> {
  const { body } = await httpBytes(url, opts);
  return JSON.parse(body.toString('utf-8'));
}

export const UA_BACKEND = 'OttomanBackend/2.0';
export const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** Python'da float olan (ör. 791.0) ama JS'te tam sayı görünen değerlerin işaretçisi: pyJson "791.0" yazar. */
export class PyF { constructor(readonly v: number) {} }
export const flt = (n: any): PyF => new PyF(Number(n));

/** json.dumps(obj, ensure_ascii=False) görünümü: ", " ve ": " ayraçları. */
export function pyJson(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof PyF) return Number.isInteger(value.v) && Math.abs(value.v) < 1e16 ? value.v.toFixed(1) : JSON.stringify(value.v);
  if (Array.isArray(value)) return '[' + value.map(pyJson).join(', ') + ']';
  if (typeof value === 'object') {
    return '{' + Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => JSON.stringify(k) + ': ' + pyJson(v)).join(', ') + '}';
  }
  return JSON.stringify(value);
}

/** f"{x:.2f}" — Python biçimlendirmesi (çifte yuvarlama). */
export const fmt2 = (x: number): string => pyRound(Number(x), 2).toFixed(2);

/** `payload.get(k) or 0` gibi: yanlış (falsy) değerler 0 olur. */
export const or0 = (v: any): any => (pyBool(v) ? v : 0);

/** CSV hücresi için Python str(float): tam sayı değerli float ".0" taşır. */
export const pyFloatCell = (v: any): any => (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) < 1e16 ? v.toFixed(1) : v);
