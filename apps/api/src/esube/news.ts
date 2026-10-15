/**
 * Haber akışları (Python: news_feed.py, market_news.py ve backend_server.py içindeki resmi haber / şirket haberi kodları).
 */
import { withConn } from './db';
import { cfg, httpBytes, isoTime, mapLimit, NEWS_SOURCES, now, sleep, UA_BROWSER, Row } from './common';
import { NEWS_DATA as D } from './news-data';
import { cp, decodeBody, El, htmlUnescape, isoUtc, parseRfc2822, parseXml, plain, quotePlus, urljoin } from './xml';

/* ============================================================== yardımcılar */

const W = '[\\p{L}\\p{N}_]';
/** Python re modülündeki \b (Unicode). */
const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;

const ALT: Record<string, string> = { I: 'ı', İ: 'i', Ş: 'ş', Ğ: 'ğ', Ü: 'ü', Ö: 'ö', Ç: 'ç' };
const SADE: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u', '’': "'", '‘': "'" };

/** Karşılaştırma için sadeleştirir: BIST → bist, Temettü → temettu. */
export function katla(deger: string): string {
  const a = Array.from(deger || '').map((c) => ALT[c] ?? c).join('').toLowerCase();
  return Array.from(a).map((c) => SADE[c] ?? c).join('');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Kelime sınırlı arama kalıbı; sonunda * olan kelimeler Türkçe ekleri kabul eder. */
function kalip(kelimeler: readonly string[]): RegExp {
  const parcalar = kelimeler.map((kelime) => {
    const ekli = kelime.endsWith('*');
    const govde = escapeRe(katla(ekli ? kelime.slice(0, -1) : kelime)).replace(/ /g, '\\s+');
    return B + govde + (ekli ? `[a-z]{0,6}${B}` : B);
  });
  return new RegExp(parcalar.join('|'), 'u');
}

const sortDesc = <T>(arr: T[], key: (x: T) => number) => [...arr].sort((a, b) => key(b) - key(a));
const num = (v: any) => Number(v ?? 0) || 0;
const nowF = () => Date.now() / 1000;

const AJAN = UA_BROWSER;
const MRSS = '{http://search.yahoo.com/mrss/}content';
const MRSS_THUMB = '{http://search.yahoo.com/mrss/}thumbnail';
const ICERIK = '{http://purl.org/rss/1.0/modules/content/}encoded';
const ATOM = '{http://www.w3.org/2005/Atom}';

/** Tek uçuşlu (single-flight) çalıştırıcı: Python'daki threading.Lock karşılığı. */
class Flight {
  private p: Promise<void> | null = null;
  async run(fn: () => Promise<void>): Promise<void> {
    while (this.p) await this.p.catch(() => undefined);
    this.p = fn().finally(() => { this.p = null; });
    await this.p;
  }
}

/* ===================================================== news_feed.py (TRT) */

const FEED_URL = 'https://www.trthaber.com/ekonomi_articles.rss';
const feedCache: { items: Row[]; checked: number; updated: number; error: string | null } = { items: [], checked: 0, updated: 0, error: null };
const feedFlight = new Flight();

function parseNews(xml: Buffer, timestamp: number): Row[] {
  const items: Row[] = [];
  const seen = new Set<string>();
  for (const node of parseXml(xml).iter('item')) {
    const url = (node.findtext('link') || '').trim();
    const pd = parseRfc2822(node.findtext('pubDate') || '');
    if (!pd) continue;
    const epoch = pd.epoch;
    if (!(timestamp - 7 * 86400 <= epoch && epoch <= timestamp + 300)) continue;
    let host = '';
    try { host = new URL(url).hostname; } catch { host = ''; }
    if (host !== 'www.trthaber.com' || seen.has(url)) continue;
    const title = plain(node.findtext('title'));
    const summary = plain(node.findtext('description'));
    const media = node.find('{http://search.yahoo.com/mrss/}content');
    const image = media ? media.get('url') || '' : '';
    let scheme = '';
    try { scheme = new URL(image).protocol; } catch { scheme = ''; }
    if (!title || !summary || scheme !== 'https:') continue;
    seen.add(url);
    items.push({
      id: url, title, summary, body: summary, image_url: image, url, source: 'TRT Haber',
      author: node.findtext('author') || 'TRT Haber', published_at: pd.iso, published_ts: epoch, kind: 'Ekonomi',
    });
  }
  return sortDesc(items, (i) => i.published_ts);
}

export async function latestNews(): Promise<[Row[], Row]> {
  await feedFlight.run(async () => {
    const current = nowF();
    if (current - feedCache.checked >= 120) {
      feedCache.checked = current;
      try {
        const { body } = await httpBytes(FEED_URL, { headers: { 'User-Agent': 'Ottoman/1.0' }, timeoutMs: 8000, maxBytes: 2_000_000 });
        const items = parseNews(body, current);
        if (!items.length) throw Object.assign(new Error('No recent publisher articles'), { pyName: 'ValueError' });
        Object.assign(feedCache, { items, updated: current, error: null });
      } catch (e: any) {
        feedCache.error = e?.pyName || (e?.name === 'ParseError' ? 'ParseError' : e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'TimeoutError' : 'URLError');
      }
    }
  });
  const current = nowF();
  const items = feedCache.items.filter((i) => i.published_ts >= current - 7 * 86400).slice(0, 30);
  return [items, {
    ok: items.length > 0 && !feedCache.error,
    degraded: !!feedCache.error,
    count: items.length,
    updated_at_label: feedCache.updated ? isoUtc(feedCache.updated) : null,
    sources: [{ name: 'TRT Haber', url: FEED_URL }],
    errors: feedCache.error ? [feedCache.error] : [],
  }];
}

/* ====================================================== market_news.py */

const XU030: string[] = [...D.XU030]; const XU100_EK: string[] = [...D.XU100_EK];
const XU100: string[] = Array.from(new Set<string>([...XU030, ...XU100_EK]));
const XU050: string[] = [...D.XU050];
const SEKME_ENDEKSI: Record<number, Set<string>> = {
  1: new Set<string>(XU100), 2: new Set<string>(XU030), 3: new Set<string>(D.XKTUM), 4: new Set<string>(D.XTMTU), 5: new Set<string>(D.XHARZ), 8: new Set<string>(XU050),
};
const XHARZ = new Set<string>(D.XHARZ);
const XU100_SET = new Set<string>(XU100);

const sirketAdlari = new Map<string, string>();
let adKod: Array<[string, string]> = [];

export function sirketleriTanit(adlar: Record<string, string>): void {
  const temiz: Record<string, string> = {};
  const entries = Object.entries(adlar || {});
  if (!entries.length) return;
  for (const [k, v] of entries) {
    const kod = String(k ?? '').trim().toUpperCase();
    const ad = String(v ?? '').trim();
    if (!/^[A-Z]{4,6}$/.test(kod) || !ad || ad.toUpperCase() === kod) continue;
    if (kod.endsWith('USD') || kod.endsWith('TRY') || kod.endsWith('EUR')) continue;
    temiz[kod] = ad;
  }
  if (!Object.keys(temiz).length) return;
  sirketAdlari.clear();
  for (const [k, v] of Object.entries(temiz)) sirketAdlari.set(k, v);
  const stop = new RegExp(`${B}(a\\.?s\\.?|anonim|şirketi|sirketi|holding|sanayi|ticaret|ve|yatırım|yatirim|index|endeks)${B}`, 'gu');
  const liste: Array<[string, string]> = [];
  for (const [kod, ad] of Object.entries(temiz)) {
    let sade = katla(ad).replace(stop, ' ');
    sade = sade.split(/\s+/).filter(Boolean).join(' ');
    if (Array.from(sade).length >= 7) liste.push([sade, kod]);
  }
  adKod = [...liste].sort((a, b) => Array.from(b[0]).length - Array.from(a[0]).length);
}

const FINANS_KALIP = kalip(D.FINANS);
const KONU_DISI = kalip(D.KONU_DISI);
const TURKIYE_KALIP = kalip(D.TURKIYE);
const SEKME_KALIPLARI = D.SEKME_ANAHTARLARI.map((k) => kalip(k));
const NON_LATIN = /[Ѐ-ӿ֐-ࣿ　-鿿가-힯]/;
const ARAC_SAYFASI = new RegExp(
  '(\\([A-Z]{4,6}\\)\\s*hisse|hisse senedi\\s*$|hisse senedi fiyatları|ne kadar|kaç tl|kac tl|' +
  'hisse fiyatı|canlı borsa|canli borsa|çevirici|hesaplama|kaç para|dolar kuru bugün|' +
  'en çok artan|en çok düşen|en cok artan|anlık|widget|' +
  '^\\s*(borsa i̇stanbul|borsa istanbul|altın fiyatları|döviz kurları|hisse senetleri|' +
  'piyasalar|tüm piyasalar haberleri|son dakika haberleri|ekonomi haberleri)\\s*$)',
  'iu',
);

const YENILEME_SANIYE = 600;
const EN_FAZLA_HABER = 20;
const SAYFADAN_EN_FAZLA = 45;

const onbellek: { items: Row[]; updated: number; errors: string[] } = { items: [], updated: 0, errors: [] };
const gorselOnbellek = new Map<string, string>();
const bingOnbellek = new Map<number, { items: Row[]; ts: number }>();
const tazeleFlight = new Flight();

function bingHedef(baglanti: string): string {
  if (!baglanti.includes('apiclick.aspx')) return baglanti;
  try {
    const hedef = new URL(baglanti).searchParams.get('url') || '';
    return hedef || baglanti;
  } catch { return baglanti; }
}

async function bingSorgu(sorgu: string): Promise<[El[], string]> {
  const adres = 'https://www.bing.com/news/search?q=' + encodeURIComponent(sorgu) + '&format=rss&setlang=tr&cc=tr&qft=sortbydate%3d%221%22';
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const { body } = await httpBytes(adres, { headers: { 'User-Agent': AJAN }, timeoutMs: 18_000 });
      const kok = parseXml(body);
      const m = /xmlns:News="([^"]+)"/.exec(body.subarray(0, 4000).toString('latin1'));
      const ns = m ? htmlUnescape(Buffer.from(m[1], 'latin1').toString('utf-8')) : '';
      return [kok.iter('item'), ns];
    } catch { await sleep(600); }
  }
  return [[], ''];
}

function uyeSorgulari(sekme: number): string[] {
  const set = (a: Iterable<string>) => new Set<string>(a);
  const diff = (a: Set<string>, b: Set<string>) => new Set([...a].filter((x) => !b.has(x)));
  const kume = ({
    2: set(XU030), 8: diff(set(XU050), set(XU030)), 1: diff(set(XU100), set(XU050)), 3: diff(set(D.XKTUM), set(XU100)),
  } as Record<number, Set<string>>)[sekme];
  if (!kume || !kume.size) return [];
  const kodlar = [...kume].sort();
  const gruplar: string[][] = [];
  for (let i = 0; i < kodlar.length; i += 5) gruplar.push(kodlar.slice(i, i + 5));
  return gruplar.slice(0, 12).map((g) => g.join(' OR ') + ' hisse');
}

const OG = /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]+content=["']([^"']+)["']/i;
const OG_TERS = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i;

export async function sayfadanGorsel(adres: string): Promise<string> {
  const c = gorselOnbellek.get(adres);
  if (c !== undefined) return c;
  let bulunan = '';
  try {
    const { body } = await httpBytes(adres, { headers: { 'User-Agent': AJAN }, timeoutMs: 8000, maxBytes: 250_000 });
    const bas = body.toString('latin1');
    const m = OG.exec(bas) || OG_TERS.exec(bas);
    if (m) {
      let aday = htmlUnescape(Buffer.from(m[1], 'latin1').toString('utf-8')).trim();
      if (aday.startsWith('//')) aday = 'https:' + aday;
      if (aday.startsWith('https://') && !aday.endsWith('.svg')) bulunan = aday;
    }
  } catch { bulunan = ''; }
  if (gorselOnbellek.size > 20_000) gorselOnbellek.clear();
  gorselOnbellek.set(adres, bulunan);
  return bulunan;
}

function kodlariBul(haber: Row): Set<string> {
  const kodlar = new Set<string>();
  const ham = haber.title + ' ' + haber.summary;
  const re = new RegExp(`${B}[A-ZÇĞİÖŞÜ]{4,6}${B}`, 'gu');
  for (const m of ham.matchAll(re)) {
    const aday = m[0];
    if (sirketAdlari.has(aday) || XU100_SET.has(aday) || XHARZ.has(aday)) kodlar.add(aday);
  }
  const metin = haber._metin as string;
  for (const [sade, kod] of adKod) if (metin.includes(sade)) kodlar.add(kod);
  return kodlar;
}

async function bingOku(sekme: number, simdi: number): Promise<Row[]> {
  const sorgular = [...D.BING_SORGULARI[sekme], ...uyeSorgulari(sekme)];
  const sonuclar = await mapLimit(sorgular, 6, (s) => bingSorgu(s));
  const dugumler: Array<[El, string]> = [];
  for (const [parca, ns] of sonuclar) for (const d of parca) dugumler.push([d, ns]);

  const adaylar: Row[] = [];
  const gorulen = new Set<string>();
  for (const [dugum, ns] of dugumler) {
    const baslik = plain(dugum.findtext('title'));
    const baglanti = bingHedef((dugum.findtext('link') || '').trim());
    if (!baslik || !baglanti.startsWith('http') || ARAC_SAYFASI.test(baslik)) continue;
    const anahtar = cp(katla(baslik), 90);
    if (gorulen.has(baglanti) || gorulen.has(anahtar)) continue;
    gorulen.add(baglanti); gorulen.add(anahtar);
    const ozet = plain(dugum.findtext('description'));
    const metin = katla(baslik + ' ' + ozet);
    if (!FINANS_KALIP.test(metin) || KONU_DISI.test(metin)) continue;
    if (NON_LATIN.test(baslik)) continue;
    const pd = parseRfc2822(dugum.findtext('pubDate') || '');
    const damga = pd ? pd.epoch : simdi;
    if (damga < simdi - 3 * 86400) continue;
    const kaynak = ns ? (dugum.findtext(`{${ns}}Source`) || '').trim() : '';
    adaylar.push({
      id: baglanti, title: baslik, url: baglanti, summary: cp(ozet, 400), body: cp(ozet, 1200), image_url: '', photo_url: '',
      source: kaynak || 'Haber', published_ts: Math.trunc(damga), published_at: dugum.findtext('pubDate') || '', _metin: metin, _hedefli: true,
    });
  }
  if (adaylar.length) {
    const gorseller = await mapLimit(adaylar, 8, (h) => sayfadanGorsel(h.url));
    adaylar.forEach((h, i) => { h.image_url = gorseller[i]; h.photo_url = gorseller[i]; });
  }
  return adaylar.filter((h) => h.image_url.startsWith('https://'));
}

async function bingSekme(sekme: number): Promise<Row[]> {
  const simdi = nowF();
  const kayit = bingOnbellek.get(sekme);
  if (kayit && simdi - kayit.ts < YENILEME_SANIYE && kayit.items.length) return kayit.items;
  const haberler = await bingOku(sekme, simdi);
  if (haberler.length) {
    for (const h of haberler) {
      h.kodlar = kodlariBul(h);
      h.turkiye = TURKIYE_KALIP.test(h._metin) || h.kodlar.size > 0;
    }
    bingOnbellek.set(sekme, { items: haberler, ts: simdi });
    return haberler;
  }
  return kayit ? kayit.items : [];
}

function gorselBul(dugum: El): string {
  for (const etiket of [MRSS, MRSS_THUMB, 'enclosure']) {
    const alan = dugum.find(etiket);
    if (alan) {
      const adres = (alan.get('url') || '').trim();
      if (adres.startsWith('https://')) return adres;
    }
  }
  for (const alan of ['description', ICERIK]) {
    const govde = dugum.findtext(alan) || '';
    const m = /<img[^>]+src="(https:\/\/[^"]+)"/.exec(htmlUnescape(govde));
    if (m) return m[1];
  }
  return '';
}

async function beslemeOku(ad: string, adres: string, simdi: number, gorselSart: boolean): Promise<Row[]> {
  const { body } = await httpBytes(adres, { headers: { 'User-Agent': AJAN }, timeoutMs: 15_000, maxBytes: 3_000_000 });
  const kok = parseXml(body);
  const cikti: Row[] = [];
  for (const dugum of kok.iter('item')) {
    const baslik = plain(dugum.findtext('title'));
    const baglanti = (dugum.findtext('link') || '').trim();
    if (!baslik || !baglanti.startsWith('http')) continue;
    const gorsel = gorselBul(dugum);
    if (gorselSart && !gorsel) continue;
    const ozet = plain(dugum.findtext('description'));
    const metin = katla(baslik + ' ' + ozet);
    if (!FINANS_KALIP.test(metin) || KONU_DISI.test(metin)) continue;
    const pd = parseRfc2822(dugum.findtext('pubDate') || '');
    const damga = pd ? pd.epoch : simdi;
    if (damga > simdi + 3600 || damga < simdi - 3 * 86400) continue;
    cikti.push({
      id: baglanti, title: baslik, url: baglanti, summary: cp(ozet, 400), body: cp(ozet, 1200), image_url: gorsel, photo_url: gorsel,
      source: ad, published_ts: Math.trunc(damga), published_at: dugum.findtext('pubDate') || '', _metin: metin,
    });
  }
  return cikti;
}

async function tazele(): Promise<void> {
  const simdi = nowF();
  if (simdi - onbellek.updated < YENILEME_SANIYE && onbellek.items.length) return;
  const hatalar: string[] = [];
  const isler: Array<[string, string, boolean]> = [
    ...D.GORSELLI.map(([a, u]) => [a, u, true] as [string, string, boolean]),
    ...D.BIST_YOGUN.map(([a, u]) => [a, u, false] as [string, string, boolean]),
  ];
  const parcalar = await mapLimit(isler, 8, async ([ad, adres, sart]) => {
    try { return await beslemeOku(ad, adres, simdi, sart); } catch (e: any) {
      hatalar.push(`${ad}: ${e?.name || 'Error'}`);
      return [] as Row[];
    }
  });
  const toplam = parcalar.flat();
  const gorulen = new Set<string>();
  const benzersiz: Row[] = [];
  for (const h of sortDesc(toplam, (x) => x.published_ts)) {
    const anahtar = cp(katla(h.title), 90);
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    h.kodlar = kodlariBul(h);
    h.turkiye = TURKIYE_KALIP.test(h._metin) || h.kodlar.size > 0;
    benzersiz.push(h);
  }
  const eksik = benzersiz.filter((h) => !h.image_url && (h.kodlar.size || h.turkiye)).slice(0, SAYFADAN_EN_FAZLA);
  if (eksik.length) {
    const gorseller = await mapLimit(eksik, 8, (h) => sayfadanGorsel(h.url));
    eksik.forEach((h, i) => { h.image_url = gorseller[i]; h.photo_url = gorseller[i]; });
  }
  const fotolu = benzersiz.filter((h) => h.image_url.startsWith('https://'));
  if (!fotolu.length) { onbellek.errors = hatalar.length ? hatalar : ['kaynak yok']; return; }
  Object.assign(onbellek, { items: fotolu, updated: simdi, errors: hatalar });
}

const KADEME_SEKMELERI = [2, 8, 1];
const KADEME_KUMELERI: Array<[number, Set<string>]> = [[2, new Set<string>(XU030)], [8, new Set<string>(XU050)], [1, new Set<string>(XU100)]];

function kademe(kodlar: Set<string>): number {
  for (const [sekme, kume] of KADEME_KUMELERI) for (const k of kodlar) if (kume.has(k)) return sekme;
  return 0;
}

function sekmePuani(haber: Row, sekme: number): number {
  const metin = haber._metin as string;
  const kodlar = haber.kodlar as Set<string>;
  const tam = SEKME_KALIPLARI[sekme].test(metin);
  const endeks = SEKME_ENDEKSI[sekme];
  const uye = !!(endeks && [...kodlar].some((k) => endeks.has(k)));
  if (sekme === 7) return tam ? 3 : 0;
  if (sekme === 6) { if (tam) return haber.turkiye ? 3 : 2; return 0; }
  if (!haber.turkiye) return 0;
  if (sekme === 0) return tam ? 3 : (kodlar.size ? 2 : 0);
  if (KADEME_SEKMELERI.includes(sekme)) {
    if (tam) return 3;
    return kademe(kodlar) === sekme ? 2 : 0;
  }
  if (sekme === 3) {
    if (tam) return 3;
    return uye && ![...kodlar].some((k) => XU100_SET.has(k)) ? 2 : 0;
  }
  if (uye && tam) return 3;
  if (uye) return 2;
  if (tam) return [3, 4, 5].includes(sekme) ? 2 : 3;
  return 0;
}

export async function sekmeHaberleri(sekme: number, enAz = 12): Promise<[Row[], Row]> {
  sekme = Math.max(0, Math.min(D.SEKME_ANAHTARLARI.length - 1, Math.trunc(sekme || 0)));
  let hepsi: Row[] = []; let hatalar: string[] = []; let guncelleme = 0;
  await tazeleFlight.run(async () => {
    await tazele();
    hepsi = [...onbellek.items]; hatalar = [...onbellek.errors]; guncelleme = onbellek.updated;
  });
  let hedefli: Row[] = [];
  try { hedefli = await bingSekme(sekme); } catch { hedefli = []; }

  const secilen: Row[] = [];
  const kimlikler = new Set<string>();
  const baslikIzi = new Set<string>();
  const ekle = (h: Row) => {
    const anahtar = cp(katla(h.title), 90);
    if (kimlikler.has(h.id) || baslikIzi.has(anahtar)) return;
    kimlikler.add(h.id); baslikIzi.add(anahtar); secilen.push(h);
  };

  for (const h of sortDesc(hedefli, (x) => x.published_ts)) {
    if (sekmePuani(h, sekme) >= 2 || (sekme === 0 && sekmePuani(h, 0) >= 2)) ekle(h);
  }
  const uyanlar = hepsi.map((h) => [h, sekmePuani(h, sekme)] as [Row, number]).filter(([, p]) => p >= 2);
  uyanlar.sort((a, b) => (b[1] - a[1]) || (b[0].published_ts - a[0].published_ts));
  for (const [h] of uyanlar) ekle(h);

  if (sekme === 0 && secilen.length < enAz) {
    for (const h of sortDesc(hepsi.filter((x) => sekmePuani(x, 0) >= 2), (x) => x.published_ts)) {
      if (secilen.length >= enAz) break;
      ekle(h);
    }
  }
  if (secilen.length < enAz && (sekme === 6 || sekme === 7)) {
    for (const h of sortDesc(hepsi, (x) => x.published_ts)) {
      if (secilen.length >= enAz) break;
      ekle(h);
    }
  }
  const sirali = sortDesc(secilen, (x) => Math.trunc(num(x.published_ts)));
  const temiz = sirali.slice(0, EN_FAZLA_HABER).map((h) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(h)) if (!k.startsWith('_') && k !== 'kodlar' && k !== 'turkiye') o[k] = v;
    return o;
  });
  return [temiz, {
    ok: temiz.length > 0, count: temiz.length, targeted: hedefli.length, updated_at: Math.trunc(guncelleme),
    sources: [...new Set(temiz.map((h) => h.source))].sort(), errors: hatalar,
  }];
}

/* ================================================== backend_server.py haberleri */

export const MARKET_NEWS_QUERIES = [
  'Borsa İstanbul', 'BIST 100', 'BIST 30', 'katılım endeksi', 'temettü', 'halka arz', 'yatırım fonu', 'dolar euro kur', 'BIST 50',
];
const marketNewsCache = new Map<number, { items: Row[]; updated_at: number }>();

const NEWS_TOOL_WORDS = ['hesaplama', 'cevirici', 'çevirici', 'converter', 'hesapla'];
const NEWS_FINANCE_WORDS = [
  'borsa', 'bist', 'hisse', 'endeks', 'temettü', 'temettu', 'halka arz', 'fon', 'piyasa', 'yatırım', 'yatirim', 'faiz', 'döviz', 'doviz',
  'dolar', 'euro', 'kur', 'altın', 'altin', 'tahvil', 'viop', 'spk', 'kap', 'portföy', 'portfoy', 'sermaye', 'banka', 'enflasyon', 'şirket',
  'sirket', 'ihraç', 'ihrac', 'menkul', 'takasbank', 'masak', 'repo', 'kâr', 'kar payı', 'zarar', 'seans', 'lot', 'emir', 'tasfiye',
  'yatırımcı', 'yatirimci', 'gözaltı',
];
const NEWS_FOREIGN_TOKENS = new Set([
  'und', 'der', 'die', 'das', 'dem', 'den', 'nicht', 'wenn', 'wer', 'wirst', 'sie', 'ihr', 'dran', 'mehr', 'ein', 'eine', 'ist', 'wird', 'auch',
  'puder', 'the', 'and', 'for', 'with', 'from', 'after', 'says', 'will', 'that', 'this', 'are', 'was', 'buys', 'stocks', 'market', 'fund',
  'wealth', 'you', 'your', 'how', 'why', 'what', 'new', 'stem', 'rout',
]);
const NON_LATIN_TEXT = /[Ѐ-ӿ֐-ࣿ　-鿿가-힯豈-﫿]/;
const NEWS_OFF_TOPIC_WORDS = [
  'kira', 'kiracı', 'ev sahibi', 'asgari ücret', 'memur', 'emekli', 'eyt', 'sgk', 'bayram ikramiye', 'kyk', 'öğrenci burs', 'engelli maaş',
  'yaşlı maaş', 'evde bakım', 'nafaka',
];

export function foldTr(value: string): string {
  return value.replace(/İ/g, 'i').replace(/I/g, 'ı').replace(/Ğ/g, 'ğ').replace(/Ş/g, 'ş').replace(/Ö/g, 'ö').replace(/Ü/g, 'ü').replace(/Ç/g, 'ç').toLowerCase();
}

export function isTurkishFinanceNews(title: string): boolean {
  if (!title) return false;
  if (NON_LATIN_TEXT.test(title)) return false;
  const folded = foldTr(title);
  if (NEWS_TOOL_WORDS.some((w) => folded.includes(w)) && !folded.includes('haber')) return false;
  if (!NEWS_FINANCE_WORDS.some((w) => folded.includes(w))) return false;
  if (NEWS_OFF_TOPIC_WORDS.some((w) => folded.includes(w))) return false;
  const tokens = new Set(folded.split(/[^0-9a-zçğıöşü]+/));
  let hit = 0;
  for (const t of tokens) if (NEWS_FOREIGN_TOKENS.has(t)) hit++;
  if (hit >= 2) return false;
  return true;
}

function bingImage(image: string, template: string | null, width: number, height: number): string {
  if (!image || !image.startsWith('http')) return '';
  image = image.replace('http://', 'https://');
  if (template && template.includes('{0}')) return image + '&' + template.replace('{0}', String(width)).replace('{1}', String(height));
  return `${image}&w=${width}&h=${height}&c=7`;
}

async function fetchMarketNews(market: number): Promise<Row[]> {
  const query = MARKET_NEWS_QUERIES[market];
  const url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(query) + '&format=rss&setlang=tr&cc=tr&qft=sortbydate%3d%221%22';
  let raw: Buffer; let root: El;
  try {
    ({ body: raw } = await httpBytes(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeoutMs: 20_000 }));
    root = parseXml(raw);
  } catch { return []; }
  const decl = /xmlns:News="([^"]+)"/.exec(raw.subarray(0, 4000).toString('latin1'));
  const newsNs = decl ? htmlUnescape(Buffer.from(decl[1], 'latin1').toString('utf-8')) : '';
  const field = (node: El, name: string) => (newsNs ? (node.findtext(`{${newsNs}}${name}`) || '').trim() : '');
  const items: Row[] = [];
  for (const node of root.iter('item')) {
    const title = (node.findtext('title') || '').trim();
    const link = (node.findtext('link') || '').trim();
    if (!title || !link) continue;
    if (!isTurkishFinanceNews(title)) continue;
    const image = field(node, 'Image');
    const template = field(node, 'ImageSize') || null;
    const published = (node.findtext('pubDate') || '').trim();
    const pd = published ? parseRfc2822(published) : null;
    items.push({
      title, url: bingHedef(link), source: field(node, 'Source'), summary: (node.findtext('description') || '').trim(),
      image_url: bingImage(image, template, 160, 160), photo_url: bingImage(image, template, 900, 506),
      published_at: published, published_ts: pd ? Math.trunc(pd.epoch) : 0,
    });
  }
  const sirali = sortDesc(items, (i) => i.published_ts);
  const gorulen = new Set<string>();
  const benzersiz: Row[] = [];
  for (const it of sirali) {
    const anahtar = foldTr(it.title);
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    benzersiz.push(it);
  }
  return benzersiz;
}

let sirketTanitildi = 0;
async function tanitSirketler(): Promise<void> {
  if (now() - sirketTanitildi < 86400) return;
  try {
    const rows = await withConn((c) => c.all("SELECT symbol, name FROM market_cache WHERE name <> ''"));
    const map: Record<string, string> = {};
    for (const r of rows) map[r.symbol] = r.name;
    sirketleriTanit(map);
    sirketTanitildi = now();
  } catch { sirketTanitildi = now(); }
}

export async function marketNews(market: number): Promise<[Row[], boolean]> {
  const cached = marketNewsCache.get(market);
  if (cached && cached.items.length && now() - cached.updated_at < cfg.marketNewsRefreshSeconds) return [cached.items, true];
  let items: Row[] = [];
  try {
    await tanitSirketler();
    [items] = await sekmeHaberleri(market, 14);
  } catch { items = []; }
  if (!items.length && ![1, 2, 3, 8].includes(market)) {
    items = (await fetchMarketNews(market)).filter((h) => h.image_url);
  }
  if (items.length) {
    marketNewsCache.set(market, { items, updated_at: now() });
    return [items, true];
  }
  if (cached && cached.items.length) return [cached.items, true];
  return [[], false];
}

/** Sekme haberlerini arka planda ısıtır (haberleri_isit). */
export function haberleriIsit(): void {
  const run = async () => {
    await sleep(4000);
    for (;;) {
      for (let sekme = 0; sekme < MARKET_NEWS_QUERIES.length; sekme++) {
        try { await marketNews(sekme); } catch { /* yoksay */ }
        await sleep(2000);
      }
      await sleep(Math.max(60, Math.trunc(cfg.marketNewsRefreshSeconds / 2)) * 1000);
    }
  };
  void run();
}

/* ---------------------------------------------------------- resmi haberler */

interface LinkPair { href: string; text: string }

/** OfficialLinkParser: <a href> bağlantıları ve metinleri. */
function parseLinks(html: string): LinkPair[] {
  const links: LinkPair[] = [];
  let href = ''; let text: string[] = [];
  let last = 0;
  const re = /<(\/?)([a-zA-Z][^\s>\/]*)([^>]*)>/g;
  const data = (s: string) => { if (href && s) text.push(htmlUnescape(s)); };
  for (const m of html.matchAll(re)) {
    data(html.slice(last, m.index));
    last = m.index! + m[0].length;
    const closing = m[1] === '/'; const tag = m[2].toLowerCase();
    if (tag !== 'a') continue;
    if (!closing) {
      const hm = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3]);
      href = hm ? htmlUnescape(hm[1] ?? hm[2] ?? hm[3] ?? '') : '';
      text = [];
    } else if (href) {
      const t = htmlUnescape(text.join(' ')).replace(/\s+/g, ' ').trim();
      if (t) links.push({ href, text: t });
      href = ''; text = [];
    }
  }
  return links;
}

async function fetchOfficialText(url: string): Promise<string> {
  const { body, headers } = await httpBytes(url, { headers: { 'User-Agent': 'Ottoman/1.0' }, timeoutMs: 6000 });
  return decodeBody(body, headers);
}

const squash = (s: string) => htmlUnescape(s).replace(/\s+/g, ' ').trim();

async function tcmbNews(): Promise<Row[]> {
  const root = parseXml(await fetchOfficialText(NEWS_SOURCES.TCMB));
  let nodes = root.iter('item');
  if (!nodes.length) nodes = root.iter(`${ATOM}entry`);
  const items: Row[] = [];
  nodes.slice(0, 12).forEach((node, index) => {
    const title = squash(node.findtext('title') || node.findtext(`${ATOM}title`) || '');
    const linkNode = node.find(`${ATOM}link`);
    const link = (node.findtext('link') || '').trim() || (linkNode ? linkNode.get('href') || '' : '');
    const published = (node.findtext('pubDate') || node.findtext(`${ATOM}published`) || '').trim();
    if (title && link) {
      const pd = parseRfc2822(published);
      items.push({
        source: 'TCMB', title, url: urljoin('https://www.tcmb.gov.tr', link), published_at: published, kind: 'Para Politikası',
        _sort: (pd ? Math.trunc(pd.epoch) : 0) || now() - index,
      });
    }
  });
  return items;
}

async function htmlAnnouncementNews(source: string, url: string, pathMarker: string, kind: string): Promise<Row[]> {
  const links = parseLinks(await fetchOfficialText(url));
  const items: Row[] = [];
  const seen = new Set<string>();
  for (const { href, text } of links) {
    const absolute = urljoin(url, href);
    if (!absolute.toLowerCase().includes(pathMarker) || Array.from(text).length < 18 || seen.has(absolute)) continue;
    seen.add(absolute);
    items.push({ source, title: cp(text, 240), url: absolute, published_at: 'Güncel resmi duyuru', kind, _sort: now() - items.length });
    if (items.length >= 12) break;
  }
  return items;
}

async function spkBulletinNews(): Promise<Row[]> {
  const url = NEWS_SOURCES.SPK.replace('{year}', String(new Date().getFullYear()));
  const links = parseLinks(await fetchOfficialText(url));
  const items: Row[] = [];
  for (const { href, text: title } of links) {
    const h = href.toLowerCase();
    if (!h.includes('/data/') || !h.endsWith('.pdf') || !title.startsWith('Bülten No')) continue;
    const published = title.includes('Yayımlanma :') ? title.split('Yayımlanma :').slice(1).join('Yayımlanma :').trim() : 'Güncel SPK bülteni';
    const bulletin = title.split('Yayımlanma')[0].trim();
    items.push({ source: 'SPK', title: bulletin, url: urljoin(url, href), published_at: published, kind: 'SPK Bülteni', _sort: now() - items.length });
    if (items.length >= 12) break;
  }
  return items;
}

const newsCache: { items: Row[]; updated_at: number; errors: string[] } = { items: [], updated_at: 0, errors: [] };

export function newsMeta(): Row {
  const year = String(new Date().getFullYear());
  return {
    ok: newsCache.items.length > 0 && newsCache.errors.length < 3,
    degraded: newsCache.errors.length > 0,
    errors: newsCache.errors,
    updated_at_label: newsCache.updated_at ? isoTime(Math.trunc(newsCache.updated_at)) : null,
    sources: Object.entries(NEWS_SOURCES).map(([name, url]) => ({ name, url: url.replace('{year}', year) })),
  };
}

export async function officialNews(): Promise<[Row[], Row]> {
  if (newsCache.items.length && now() - Math.trunc(newsCache.updated_at) < cfg.newsRefreshSeconds) return [newsCache.items, newsMeta()];
  const items: Row[] = [];
  const errors: string[] = [];
  const sources: Array<[string, () => Promise<Row[]>]> = [
    ['TCMB', () => tcmbNews()],
    ['Borsa İstanbul', () => htmlAnnouncementNews('Borsa İstanbul', NEWS_SOURCES['Borsa İstanbul'], '/duyuru/', 'Piyasa Duyurusu')],
    ['SPK', () => spkBulletinNews()],
  ];
  await Promise.all(sources.map(async ([source, loader]) => {
    try { items.push(...(await loader())); } catch { errors.push(source); }
  }));
  if (items.length) {
    const sirali = sortDesc(items, (i) => i._sort || 0);
    for (const it of sirali) delete it._sort;
    Object.assign(newsCache, { items: sirali.slice(0, 36), updated_at: now(), errors });
  } else if (!newsCache.items.length) {
    const fallback = [
      { source: 'KAP', title: 'Şirket bildirimlerini KAP üzerinden inceleyin', url: NEWS_SOURCES.KAP, published_at: 'Resmi bildirim kaynağı', kind: 'Şirket Bildirimleri' },
      { source: 'Borsa İstanbul', title: 'Borsa İstanbul güncel piyasa duyuruları', url: NEWS_SOURCES['Borsa İstanbul'], published_at: 'Resmi duyuru kaynağı', kind: 'Piyasa Duyuruları' },
      { source: 'TCMB', title: 'TCMB basın duyuruları ve para politikası gelişmeleri', url: NEWS_SOURCES.TCMB, published_at: 'Resmi duyuru kaynağı', kind: 'Para Politikası' },
      { source: 'SPK', title: 'Sermaye Piyasası Kurulu haftalık bültenleri', url: NEWS_SOURCES.SPK.replace('{year}', String(new Date().getFullYear())), published_at: 'Resmi bülten kaynağı', kind: 'SPK Bültenleri' },
    ];
    Object.assign(newsCache, { items: fallback, updated_at: now(), errors: errors.length ? errors : ['Haber kaynakları'] });
  }
  return [newsCache.items, newsMeta()];
}

/* --------------------------------------------------------- şirket haberi */

const companyNewsCache = new Map<string, { news: Row[]; analysis: Row[]; updated_at: number }>();
const SHORT_NAME_RE = new RegExp(`${B}(A\\.?Ş\\.?|A\\.S\\.|T\\.A\\.Ş\\.|T\\.A\\.S\\.)${B}`, 'giu');
const ANALYSIS_RE = /analiz|hedef fiyat|değerlendirme|beklenti|yorum|teknik görünüm|model portföy/iu;

export async function companyNews(symbol: string, companyName: string): Promise<[Row[], Row[]]> {
  const cached = companyNewsCache.get(symbol);
  if (cached && now() - cached.updated_at < cfg.newsRefreshSeconds) return [cached.news, cached.analysis];
  const shortName = companyName.replace(SHORT_NAME_RE, '').trim();
  const query = quotePlus(`(${symbol} OR "${shortName}") when:14d`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=tr&gl=TR&ceid=TR:tr`;
  let items: Row[] = [];
  try {
    const root = parseXml(await fetchOfficialText(url));
    root.iter('item').slice(0, 24).forEach((node, index) => {
      const title = squash(node.findtext('title') || '');
      const link = (node.findtext('link') || '').trim();
      const published = (node.findtext('pubDate') || '').trim();
      const sourceNode = node.find('source');
      const source = sourceNode ? squash(sourceNode.text || '') : 'Haber kaynağı';
      if (!title || !link) return;
      const pd = parseRfc2822(published);
      items.push({ source, title: cp(title, 240), url: link, published_at: published || 'Güncel', kind: 'Şirket Haberi', _sort: (pd ? Math.trunc(pd.epoch) : 0) || now() - index });
    });
  } catch { items = []; }
  const analysis = items.filter((i) => ANALYSIS_RE.test(i.title)).slice(0, 4);
  const aSet = new Set(analysis.map((a) => JSON.stringify(a)));
  let news = items.filter((i) => !aSet.has(JSON.stringify(i))).slice(0, 6);
  if (news.length < 2) news = items.slice(0, 6);
  for (const it of [...news, ...analysis]) delete it._sort;
  companyNewsCache.set(symbol, { news, analysis, updated_at: now() });
  return [news, analysis];
}
