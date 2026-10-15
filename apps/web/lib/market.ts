/**
 * Canlı piyasa: fiyatlar, hisse listesi, endeksler, fon/VİOP/döviz listeleri ve haberler sunucudan gelir
 * (GET /api/prices, /api/news). Sabit ya da simüle veri yoktur; kaynak okunamazsa ekranlar boş/— gösterir.
 */
import { INDICES, LIVE_LISTS, LOGO, NEWS, NEWSFEED, STOCKS, type Stock } from './market-data';

interface Snapshot {
  day: string; t: number; every: number;
  s: Record<string, [number, number, number, number?]>; i: Record<string, number>; ic?: Record<string, number>;
  r?: Record<string, [string, string, number, string]>; x?: { fund: any[][]; viop: any[][]; fx: any[][] };
}

const PREF = 'mrdyn.sim.v1';
export const tickOf = (p: number) => (p < 20 ? 0.01 : p < 50 ? 0.02 : p < 100 ? 0.05 : p < 250 ? 0.1 : p < 500 ? 0.25 : p < 1000 ? 0.5 : 1);
const fmtV = (pre: string, n: number, d: number) => pre + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const INDEX_FMT: Record<string, [string, number]> = { 'BIST 100': ['', 2], 'BIST 30': ['', 2], 'USD/TRY': ['', 4], 'EUR/TRY': ['', 4], 'Gram Altın': ['', 2], 'Brent': ['$', 2] };
const compact = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(2).replace('.', ',') + ' Mr' : n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' Mn' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.', ',') + ' B' : String(Math.round(n)));

const subs: Array<() => void> = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let every = 3000;
let running = false;
let lastFull = 0;
let lastNews = 0;
let updatedAt = 0;
export const lastUpdate = () => updatedAt;

function applyRoster(m: Snapshot) {
  const byS = new Map(STOCKS.map((x) => [x.s, x]));
  const next: Stock[] = [];
  for (const sym of Object.keys(m.s)) {
    const v = m.s[sym]; const r = m.r?.[sym];
    const ex = byS.get(sym);
    const c = typeof v[3] === 'number' ? v[3] : 0;
    const base: Stock = ex || { s: sym, n: sym, sec: 'Diğer', p: v[0], c, vol: '—', mc: '—', pe: '—', pb: '—', div: '—', low52: v[2], high52: v[1], o: v[0], pc: v[0] };
    if (r) { base.n = r[0]; base.sec = r[1] || 'Diğer'; base.vol = r[2] ? compact(r[2]) : '—'; (base as any).volN = r[2] || 0; if (r[3]) LOGO[sym] = r[3]; }
    next.push(base);
  }
  STOCKS.length = 0; STOCKS.push(...next);
}

function apply(m: Snapshot) {
  every = m.every || every; updatedAt = m.t || Date.now();
  if (m.r) applyRoster(m);
  const byS = new Map(STOCKS.map((x) => [x.s, x]));
  for (const sym of Object.keys(m.s)) {
    const s = byS.get(sym); if (!s) continue; const v = m.s[sym];
    if (v[0] !== s.p) s.prev = s.p;
    s.p = v[0]; s.hi = v[1]; s.lo = v[2]; s.low52 = v[2]; s.high52 = v[1];
    if (typeof v[3] === 'number') { s.c = v[3]; s.pc = s.p / (1 + v[3] / 100); s.o = s.pc; }
  }
  for (const i of INDICES) {
    const v = m.i[i.n]; if (v == null) continue;
    const [pre, d] = INDEX_FMT[i.n] || ['', 2];
    i._n = v; i.c = m.ic?.[i.n] ?? 0; i.v = fmtV(pre, v, d);
  }
  if (m.x) { LIVE_LISTS.fund = m.x.fund; LIVE_LISTS.viop = m.x.viop; LIVE_LISTS.fx = m.x.fx; }
}

async function loadNews() {
  try {
    const r = await fetch('/api/news', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json() as { items?: any[] };
    const items = (j.items || []).slice(0, 40);
    const when = (iso: string) => { const d = new Date(iso); const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000)); return m < 60 ? `${m} dk` : m < 1440 ? `${Math.round(m / 60)} sa` : `${Math.round(m / 1440)} gün`; };
    const list = items.map((n) => ({ t: String(n.title), s: `${n.source || 'Haber'} · ${when(n.published_at)}`, url: n.url as string | undefined, body: String(n.summary || n.body || '') }));
    NEWSFEED.length = 0; NEWSFEED.push(...list.slice(0, 8));
    NEWS.default = list;
    lastNews = Date.now();
  } catch { /* sonraki turda yeniden denenir */ }
}

async function pull(full: boolean) {
  const r = await fetch('/api/prices' + (full ? '?full=1' : ''), { cache: 'no-store' });
  if (r.ok) { apply((await r.json()) as Snapshot); if (full) lastFull = Date.now(); }
  if (Date.now() - lastNews > 5 * 60 * 1000) await loadNews();
}

async function poll() {
  if (!running) return;
  if (typeof document !== 'undefined' && document.hidden) { timer = setTimeout(poll, every); return; }
  try { await pull(STOCKS.length === 0 || Date.now() - lastFull > 60000); subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }
  catch { /* bağlantı kesikse bir sonraki turda yeniden denenir */ }
  if (running) timer = setTimeout(poll, every);
}

export const MeridyenMarket = {
  enabled(): boolean { try { return localStorage.getItem(PREF) !== 'off'; } catch { return true; } },
  start() { if (running || !MeridyenMarket.enabled()) return; running = true; poll(); },
  stop() { running = false; if (timer) clearTimeout(timer); timer = null; },
  setEnabled(on: boolean) { try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch { /* yok say */ } if (on) MeridyenMarket.start(); else MeridyenMarket.stop(); },
  onTick(f: () => void) { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
  /** Bir kez hemen çek (sayfa açılışında güncel fiyatla başlamak için). */
  async refresh() { try { await pull(true); } catch { /* yok say */ } },
  tickOf,
};

/** Gerçek fiyat geçmişi (sunucudaki örneklerden). days: 1 = bugün. */
const histCache = new Map<string, { at: number; pts: number[]; ts: number[] }>();
export function history(sym: string, days: number, onLoad?: () => void): { pts: number[]; ts: number[] } {
  const k = sym + ':' + days; const c = histCache.get(k);
  if (!c || Date.now() - c.at > 30000) {
    if (!c) histCache.set(k, { at: Date.now(), pts: [], ts: [] });
    else c.at = Date.now();
    fetch(`/api/prices/history/${encodeURIComponent(sym)}?days=${days}`, { cache: 'no-store' }).then((r) => r.json()).then((j: { points: number[][] }) => {
      histCache.set(k, { at: Date.now(), pts: j.points.map((p) => p[1]), ts: j.points.map((p) => p[0]) });
      onLoad?.();
    }).catch(() => { /* yok say */ });
  }
  const h = histCache.get(k)!; return { pts: h.pts, ts: h.ts };
}
