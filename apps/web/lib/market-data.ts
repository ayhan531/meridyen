/** Piyasa açılış verisi, haberler ve logolar (uygulama ve tanıtım sayfası ortak kullanır). */
export interface Stock {
  s: string; n: string; sec: string; p: number; c: number; vol: string; mc: string; pe: string; pb: string; div: string;
  low52: number; high52: number; o: number; pc: number;
  /** canlı fiyatla güncellenen alanlar */
  hi?: number; lo?: number; prev?: number;
}
export interface Index { n: string; v: string; c: number; _pre?: string; _n?: number; _d?: number; _pc?: number }

export const IMG_BASE = '/img/';
export const COLORS: string[] = ['#1E4B41','#28604F','#5B7F3A','#8A6B2B','#3E5C8A','#6B4E8A','#2B6F7A','#A0522D','#556B2F','#7A3E5C'];
/* Tüm içerik canlıdır: STOCKS / INDICES / haberler ./market.ts tarafından sunucudan doldurulur. Sabit veri yoktur. */
export const STOCKS: Stock[] = [];
export const INDICES: Index[] = ['BIST 100', 'BIST 30', 'USD/TRY', 'EUR/TRY', 'Gram Altın', 'Brent'].map((n) => ({ n, v: '—', c: 0 }));
export const NEWSFEED: { t: string; s: string; url?: string; body?: string }[] = [];
export const NEWS: Record<string, { t: string; s: string; url?: string; body?: string }[]> = { default: [] };
/** Fon / VİOP / döviz listeleri (canlı): [sembol, ad, fiyat, değişim%] */
export const LIVE_LISTS: { fund: any[][]; viop: any[][]; fx: any[][] } = { fund: [], viop: [], fx: [] };

/* Hisse logoları: public/img/logos/<KOD>.svg */
export const LOGO_SYMBOLS: string[] = ["AKBNK", "ARCLK", "ASELS", "BIMAS", "ENKAI", "EREGL", "FROTO", "GARAN", "HEKTS", "ISCTR", "KCHOL", "KRDMD", "MGROS", "PETKM", "PGSUS", "SAHOL", "SISE", "TCELL", "THYAO", "TOASO", "TTKOM", "TUPRS", "VESTL", "YKBNK"];
export const LOGO: Record<string, string> = Object.fromEntries(LOGO_SYMBOLS.map((s) => [s, IMG_BASE + 'logos/' + s + '.svg']));
