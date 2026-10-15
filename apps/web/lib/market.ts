/**
 * Canlı fiyatlar: sunucudaki fiyat motorundan (GET /api/prices) birkaç saniyede bir alınır ve
 * STOCKS / INDICES nesnelerine yazılır. Abone olan ekranlar her güncellemede yeniden çizilir.
 */
import { INDICES, STOCKS } from './market-data';

interface Snapshot { day: string; t: number; every: number; s: Record<string, [number, number, number]>; i: Record<string, number> }

const PREF = 'mrdyn.sim.v1';
const fmtV = (pre: string, n: number, d: number) => pre + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
export const tickOf = (p: number) => (p < 20 ? 0.01 : p < 50 ? 0.02 : p < 100 ? 0.05 : p < 250 ? 0.1 : p < 500 ? 0.25 : p < 1000 ? 0.5 : 1);

/* Endeks değerleri metin ("12.418,63", "$71,40"); hesap için sayıya çevrilir. */
INDICES.forEach((i) => {
  const m = String(i.v).match(/^(\D*)([\d.,]+)$/);
  if (!m) return;
  i._pre = m[1]; i._n = parseFloat(m[2].replace(/\./g, '').replace(',', '.')); i._d = (m[2].split(',')[1] || '').length; i._pc = i._n / (1 + i.c / 100);
});
STOCKS.forEach((s) => { s.hi = Math.max(s.p, s.o); s.lo = Math.min(s.p, s.o); });

const subs: Array<() => void> = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let every = 3000;
let running = false;

function apply(m: Snapshot) {
  every = m.every || every;
  STOCKS.forEach((s) => {
    const v = m.s[s.s]; if (!v) return;
    if (v[0] !== s.p) s.prev = s.p;
    s.p = v[0]; s.hi = v[1]; s.lo = v[2]; s.c = ((s.p - s.pc) / s.pc) * 100;
  });
  INDICES.forEach((i) => {
    const v = m.i[i.n];
    if (v == null || i._n == null) return;
    i._n = v; i.c = ((v - (i._pc as number)) / (i._pc as number)) * 100; i.v = fmtV(i._pre || '', v, i._d ?? 2);
  });
}

async function poll() {
  if (!running) return;
  if (typeof document !== 'undefined' && document.hidden) { timer = setTimeout(poll, every); return; }
  try {
    const r = await fetch('/api/prices', { cache: 'no-store' });
    if (r.ok) { apply((await r.json()) as Snapshot); subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }
  } catch { /* bağlantı kesikse bir sonraki turda yeniden denenir */ }
  if (running) timer = setTimeout(poll, every);
}

export const MeridyenMarket = {
  enabled(): boolean { try { return localStorage.getItem(PREF) !== 'off'; } catch { return true; } },
  start() { if (running || !MeridyenMarket.enabled()) return; running = true; poll(); },
  stop() { running = false; if (timer) clearTimeout(timer); timer = null; },
  setEnabled(on: boolean) { try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch { /* yok say */ } if (on) MeridyenMarket.start(); else MeridyenMarket.stop(); },
  onTick(f: () => void) { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
  /** Bir kez hemen çek (sayfa açılışında güncel fiyatla başlamak için). */
  async refresh() { try { const r = await fetch('/api/prices', { cache: 'no-store' }); if (r.ok) apply((await r.json()) as Snapshot); } catch { /* yok say */ } },
  tickOf,
};
