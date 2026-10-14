import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BASE_INDICES, BASE_STOCKS } from './market-data';

interface Quote { s: string; p: number; o: number; pc: number; hi: number; lo: number }
interface Idx { n: string; pre: string; n0: number; d: number; pc: number; v: number }

/** İstanbul saatine göre gün (gün değişince fiyatlar açılış verisine döner). */
const istanbulDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const tickOf = (p: number) => (p < 20 ? 0.01 : p < 50 ? 0.02 : p < 100 ? 0.05 : p < 250 ? 0.1 : p < 500 ? 0.25 : p < 1000 ? 0.5 : 1);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/**
 * Canlı fiyat motoru: 3 saniyede bir payları küçük adımlarla oynatır (önceki kapanışın ±%10'u, fiyat adımına yuvarlanır).
 * Bütün kullanıcılar aynı fiyatları görür. Gerçek veri sağlayıcısı bağlanınca yalnızca bu servis değişir.
 */
@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Market');
  private quotes: Quote[] = [];
  private indices: Idx[] = [];
  private day = '';
  private updated = Date.now();
  private timer?: NodeJS.Timeout;
  static readonly EVERY_MS = 3000;

  onModuleInit() { this.reset(); this.timer = setInterval(() => this.step(), MarketService.EVERY_MS); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private reset() {
    this.day = istanbulDay();
    this.quotes = BASE_STOCKS.map((b) => ({ ...b, hi: Math.max(b.p, b.o), lo: Math.min(b.p, b.o) }));
    this.indices = BASE_INDICES.map((i) => {
      const m = i.v.match(/^(\D*)([\d.,]+)$/);
      const n0 = m ? parseFloat(m[2].replace(/\./g, '').replace(',', '.')) : 0;
      return { n: i.n, pre: m ? m[1] : '', n0, d: m ? (m[2].split(',')[1] || '').length : 2, pc: n0 / (1 + i.c / 100), v: n0 };
    });
    this.log.log(`Piyasa günü: ${this.day}`);
  }

  step() {
    if (istanbulDay() !== this.day) this.reset();
    for (const q of this.quotes) {
      if (Math.random() < 0.35) continue;
      const tk = tickOf(q.p), drift = ((q.o - q.p) / q.p) * 0.02;
      let p = q.p * (1 + gauss() * 0.0016 + drift * 0.05);
      p = Math.min(q.pc * 1.1, Math.max(q.pc * 0.9, p));
      p = +(Math.round(p / tk) * tk).toFixed(2);
      if (p === q.p) p = +(q.p + (Math.random() < 0.5 ? -tk : tk)).toFixed(2);
      q.p = p; q.hi = Math.max(q.hi, p); q.lo = Math.min(q.lo, p);
    }
    for (const i of this.indices) i.v = i.v * (1 + gauss() * 0.0006);
    this.updated = Date.now();
  }

  /** İstemcinin beklediği biçim: { day, t, s: { KOD: [fiyat, gün yüksek, gün düşük] }, i: { endeks: değer } } */
  snapshot() {
    const s: Record<string, [number, number, number]> = {};
    for (const q of this.quotes) s[q.s] = [q.p, q.hi, q.lo];
    const i: Record<string, number> = {};
    for (const x of this.indices) i[x.n] = +x.v.toFixed(4);
    return { day: this.day, t: this.updated, every: MarketService.EVERY_MS, s, i };
  }
}
