import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { withConn } from '../esube/db';
import { refreshMarket } from '../esube/market';

/** Endeks adı (arayüz) → canlı önbellek sembolü. */
const INDEX_SYMBOLS: Record<string, string> = { 'BIST 100': 'XU100', 'BIST 30': 'XU030', 'USD/TRY': 'USDTRY', 'EUR/TRY': 'EURTRY' };

/**
 * Canlı fiyatlar: e-şube piyasa önbelleğinden (gerçek besleme: TradingView endeksleri + hisse akışı) okunur.
 * Simülasyon yoktur; kaynak okunamazsa son gerçek değerler döner, hiç yoksa boş snapshot.
 */
@Injectable()
export class MarketService {
  static readonly EVERY_MS = 3000;
  private cached: { at: number; data: any } | null = null;
  private inflight: Promise<any> | null = null;

  /** Eski istemciler için uyumlu biçim: { day, t, every, s: { KOD: [fiyat, hi, lo, değişim%] }, i: { ad: değer }, ic: { ad: değişim% } } */
  async snapshot() {
    if (this.cached && Date.now() - this.cached.at < 2000) return this.cached.data;
    if (!this.inflight) {
      this.inflight = this.build().then((d) => { this.cached = { at: Date.now(), data: d }; return d; }).finally(() => { this.inflight = null; });
    }
    return this.inflight;
  }

  private async build() {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
    const dayStart = Math.floor(new Date(`${day}T00:00:00+03:00`).getTime() / 1000);
    const s: Record<string, [number, number, number, number]> = {};
    const i: Record<string, number> = {};
    const ic: Record<string, number> = {};
    let t = Date.now();
    try {
      await withConn(async (conn) => {
        const rows = await refreshMarket(conn);
        const hl = await conn.all('SELECT symbol, MAX(price) AS hi, MIN(price) AS lo FROM market_history WHERE recorded_at>=? GROUP BY symbol', [dayStart]);
        const hm = new Map(hl.map((r: any) => [r.symbol, r]));
        const by = new Map(rows.map((r: any) => [r.symbol, r]));
        for (const r of rows) {
          if (r.asset_class !== 'stock') continue;
          const h: any = hm.get(r.symbol);
          const p = Number(r.price);
          s[r.symbol] = [p, h ? Math.max(Number(h.hi), p) : p, h ? Math.min(Number(h.lo), p) : p, Number(r.change_pct)];
        }
        for (const [name, sym] of Object.entries(INDEX_SYMBOLS)) {
          const r: any = by.get(sym);
          if (r) { i[name] = Number(r.price); ic[name] = Number(r.change_pct); }
        }
        const upd = Math.max(0, ...rows.map((r: any) => Number(r.updated_at) || 0));
        if (upd) t = upd * 1000;
      });
    } catch { /* kaynak yoksa boş döner; istemci eski değeri korur */ }
    return { day, t, every: MarketService.EVERY_MS, s, i, ic };
  }
}
