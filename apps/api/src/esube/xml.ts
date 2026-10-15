/** xml.etree.ElementTree benzeri küçük DOM + HTML metin yardımcıları (Python: ET, html.unescape, HTMLParser). */
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export class ParseError extends Error {}

export class El {
  constructor(public tag: string, public attrs: Record<string, string>, public text: string, public children: El[]) {}
  get(name: string): string | undefined { return this.attrs[name]; }
  find(tag: string): El | undefined { return this.children.find((c) => c.tag === tag); }
  /** findtext: yoksa undefined, varsa (boş olsa bile) metin. */
  findtext(tag: string): string | undefined { const c = this.find(tag); return c ? c.text : undefined; }
  /** `.//tag` — torunlar, belge sırasıyla. */
  iter(tag: string): El[] {
    const out: El[] = [];
    const walk = (e: El) => { for (const c of e.children) { if (c.tag === tag) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
}

const parser = new XMLParser({
  preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: false,
  parseTagValue: false, parseAttributeValue: false, processEntities: true, htmlEntities: false,
});

function expand(name: string, scope: Record<string, string>, isAttr = false): string {
  const i = name.indexOf(':');
  if (i > 0) {
    const uri = scope[name.slice(0, i)];
    if (uri !== undefined) return `{${uri}}${name.slice(i + 1)}`;
    return name;
  }
  if (!isAttr && scope[''] !== undefined) return `{${scope['']}}${name}`;
  return name;
}

function build(nodes: any[], scope: Record<string, string>): { text: string; children: El[] } {
  let text = '';
  let seenChild = false;
  const children: El[] = [];
  for (const node of nodes) {
    const key = Object.keys(node).find((k) => k !== ':@');
    if (!key) continue;
    if (key === '#text') { if (!seenChild) text += String(node['#text'] ?? ''); continue; }
    if (key.startsWith('?') || key === '#comment' || key.startsWith('!')) continue;
    seenChild = true;
    const rawAttrs: Record<string, string> = node[':@'] || {};
    const local = { ...scope };
    for (const [k, v] of Object.entries(rawAttrs)) {
      const n = k.slice(2);
      if (n === 'xmlns') local[''] = String(v);
      else if (n.startsWith('xmlns:')) local[n.slice(6)] = String(v);
    }
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawAttrs)) {
      const n = k.slice(2);
      if (n === 'xmlns' || n.startsWith('xmlns:')) continue;
      attrs[expand(n, local, true)] = String(v);
    }
    const inner = build(Array.isArray(node[key]) ? node[key] : [], local);
    children.push(new El(expand(key, local), attrs, inner.text, inner.children));
  }
  return { text, children };
}

/** ET.fromstring: bozuk XML için ParseError. Buffer ise bildirilen kodlama kullanılır. */
export function parseXml(input: Buffer | string): El {
  let text: string;
  if (typeof input === 'string') text = input;
  else {
    const head = input.subarray(0, 200).toString('latin1');
    const m = /<\?xml[^>]*encoding=["']([A-Za-z0-9_\-]+)["']/.exec(head);
    let label = m ? m[1] : 'utf-8';
    try { text = new TextDecoder(label).decode(input); } catch { label = 'utf-8'; text = input.toString('utf-8'); }
  }
  text = text.replace(/^﻿/, '');
  const valid = XMLValidator.validate(text);
  if (valid !== true) throw new ParseError(String((valid as any).err?.msg ?? 'not well-formed'));
  const tree = parser.parse(text);
  const top = (tree as any[]).filter((n) => { const k = Object.keys(n).find((x) => x !== ':@'); return k && !k.startsWith('?') && !k.startsWith('!') && k !== '#text' && k !== '#comment'; });
  if (top.length !== 1) throw new ParseError('no element found');
  const wrapper = build(top, {});
  return wrapper.children[0];
}

/* ---------------------------------------------------------------- HTML */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', reg: '®', euro: '€',
  trade: '™', bull: '•', middot: '·', deg: '°', times: '×', pound: '£', yen: '¥', cent: '¢', sect: '§',
  Ccedil: 'Ç', ccedil: 'ç', Ouml: 'Ö', ouml: 'ö', Uuml: 'Ü', uuml: 'ü', Scedil: 'Ş', scedil: 'ş',
  Gbreve: 'Ğ', gbreve: 'ğ', Iuml: 'Ï', iuml: 'ï', eacute: 'é', Eacute: 'É', agrave: 'à', acirc: 'â',
};

/** html.unescape (sık kullanılan adlandırılmış + sayısal karakter başvuruları). */
export function htmlUnescape(s: string): string {
  if (!s || !s.includes('&')) return s;
  return s.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);?/g, (all, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '�';
      return String.fromCodePoint(code);
    }
    return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : all;
  });
}

const TAG_RE = /<\/?[a-zA-Z][^>]*>|<!--[\s\S]*?-->|<![^>]*>|<\?[^>]*>/g;

/** HTMLParser ile yalnız veri parçalarını toplayıp boşlukla birleştirme: " ".join(parts).split() */
export function plain(value: string | null | undefined): string {
  const v = value || '';
  const parts: string[] = [];
  let last = 0;
  for (const m of v.matchAll(TAG_RE)) {
    if (m.index! > last) parts.push(v.slice(last, m.index));
    last = m.index! + m[0].length;
  }
  if (last < v.length) parts.push(v.slice(last));
  return htmlUnescape(parts.join(' ')).split(/\s+/).filter(Boolean).join(' ');
}

/** [...s].slice(0, n) — Python dilimleme (kod noktası) */
export const cp = (s: string, n: number): string => (s.length <= n ? s : Array.from(s).slice(0, n).join(''));

/* ------------------------------------------------------------ RFC 2822 */

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const TZ_ABBR: Record<string, number> = { GMT: 0, UT: 0, UTC: 0, Z: 0, EST: -300, EDT: -240, CST: -360, CDT: -300, MST: -420, MDT: -360, PST: -480, PDT: -420 };

export interface ParsedDate { epoch: number; iso: string }

/** email.utils.parsedate_to_datetime(...).timestamp()/isoformat(); geçersizse null. */
export function parseRfc2822(value: string | null | undefined): ParsedDate | null {
  const s = (value || '').trim();
  const m = /^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:([+-]\d{4})|([A-Za-z]{1,5}))?$/.exec(s);
  if (!m) return null;
  const day = Number(m[1]); const mon = MONTHS[m[2].toLowerCase()];
  if (mon === undefined) return null;
  let year = Number(m[3]);
  if (m[3].length <= 2) year += year < 70 ? 2000 : 1900; else if (m[3].length === 3) year += 1900;
  const hh = Number(m[4]); const mi = Number(m[5]); const ss = m[6] ? Number(m[6]) : 0;
  if (day < 1 || day > 31 || hh > 23 || mi > 59 || ss > 59) return null;
  let offMin: number | null = 0;
  if (m[7]) offMin = (m[7][0] === '-' ? -1 : 1) * (Number(m[7].slice(1, 3)) * 60 + Number(m[7].slice(3, 5)));
  else if (m[8]) { const k = m[8].toUpperCase(); offMin = k in TZ_ABBR ? TZ_ABBR[k] : null; }
  const utcMs = Date.UTC(year, mon, day, hh, mi, ss) - (offMin ?? 0) * 60_000;
  const check = new Date(Date.UTC(year, mon, day));
  if (check.getUTCDate() !== day) return null;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  let off = '';
  if (offMin !== null) {
    const a = Math.abs(offMin);
    off = `${offMin < 0 ? '-' : '+'}${p(Math.floor(a / 60))}:${p(a % 60)}`;
  }
  return { epoch: utcMs / 1000, iso: `${p(year, 4)}-${p(mon + 1)}-${p(day)}T${p(hh)}:${p(mi)}:${p(ss)}${off}` };
}

/** datetime.fromtimestamp(ts, timezone.utc).isoformat() */
export function isoUtc(ts: number): string {
  const d = new Date(ts * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  const us = Math.round((ts - Math.floor(ts)) * 1_000_000);
  return `${p(d.getUTCFullYear(), 4)}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${us ? '.' + p(us, 6) : ''}+00:00`;
}

/** urllib.parse.quote_plus */
export function quotePlus(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g, '+');
}

export function urljoin(base: string, link: string): string {
  try { return new URL(link, base).href; } catch { return link; }
}

/** Yanıt gövdesini Content-Type charset'iyle çözer (errors="replace"). */
export function decodeBody(body: Buffer, headers: Headers): string {
  const ct = headers.get('content-type') || '';
  const m = /charset=["']?([\w\-]+)/i.exec(ct);
  try { return new TextDecoder(m ? m[1] : 'utf-8').decode(body); } catch { return body.toString('utf-8'); }
}
