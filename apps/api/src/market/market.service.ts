import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { withConn } from '../esube/db';
import { refreshMarket } from '../esube/market';
import { httpJson, TRADINGVIEW_SCANNER_URL, UA_BACKEND } from '../esube/common';

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
  async snapshot(full = false) {
    const d = await this.base();
    if (!full) return { ...d, r: undefined, x: undefined };
    return d;
  }

  private async base() {
    if (this.cached && Date.now() - this.cached.at < 2000) return this.cached.data;
    if (!this.inflight) {
      this.inflight = this.build().then((d) => { this.cached = { at: Date.now(), data: d }; return d; }).finally(() => { this.inflight = null; });
    }
    return this.inflight;
  }

  /** Bugünden geriye `days` günlük gerçek fiyat örnekleri (market_history), en çok ~160 noktaya seyreltilir. */
  async history(symbol: string, days: number) {
    const since = Math.floor(Date.now() / 1000) - days * 86400;
    const rows = await withConn((conn) => conn.all('SELECT price, recorded_at FROM market_history WHERE symbol=? AND recorded_at>=? ORDER BY recorded_at', [symbol.toUpperCase().slice(0, 24), since]));
    const step = Math.max(1, Math.ceil(rows.length / 160));
    const pts = rows.filter((_: any, i: number) => i % step === 0 || i === rows.length - 1).map((r: any) => [Number(r.recorded_at), Number(r.price)]);
    return { symbol: symbol.toUpperCase(), days, points: pts };
  }

  private extra: { at: number; v: Record<string, [number, number]> } = { at: 0, v: {} };
  /** Altın (ons, USD) ve Brent: TradingView tarayıcısı; kaynak yoksa değer verilmez. */
  private async commodities(): Promise<Record<string, [number, number]>> {
    if (Date.now() - this.extra.at < 20000) return this.extra.v;
    this.extra.at = Date.now();
    try {
      const body = JSON.stringify({ symbols: { tickers: ['TVC:GOLD', 'TVC:UKOIL'], query: { types: [] } }, columns: ['name', 'close', 'change'] });
      const p = await httpJson(TRADINGVIEW_SCANNER_URL, { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'User-Agent': UA_BACKEND }, timeoutMs: 8000 });
      const v: Record<string, [number, number]> = {};
      for (const it of p?.data ?? []) {
        const d = it?.d; if (!Array.isArray(d) || !(Number(d[1]) > 0)) continue;
        v[it.s] = [Number(d[1]), Number(d[2]) || 0];
      }
      this.extra.v = v;
    } catch { /* eski değer korunur */ }
    return this.extra.v;
  }

  private async build() {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
    const dayStart = Math.floor(new Date(`${day}T00:00:00+03:00`).getTime() / 1000);
    const s: Record<string, [number, number, number, number]> = {};
    const i: Record<string, number> = {};
    const ic: Record<string, number> = {};
    const r: Record<string, [string, string, number, string]> = {};
    const x: Record<string, any[]> = {};
    let t = Date.now();
    try {
      await withConn(async (conn) => {
        const rows = await refreshMarket(conn);
        const hl = await conn.all('SELECT symbol, MAX(price) AS hi, MIN(price) AS lo FROM market_history WHERE recorded_at>=? GROUP BY symbol', [dayStart]);
        const hm = new Map(hl.map((r: any) => [r.symbol, r]));
        const by = new Map(rows.map((r: any) => [r.symbol, r]));
        const rr = r;
        const lists = (cls: string, max: number) => rows.filter((q: any) => q.asset_class === cls).sort((a: any, b: any) => String(a.symbol).localeCompare(String(b.symbol))).slice(0, max).map((q: any) => [q.symbol, String(q.name || q.symbol), Number(q.price), Number(q.change_pct)]);
        x.fund = lists('fund', 300); x.viop = lists('commodity', 150); x.fx = lists('fx', 20);
        for (const r of rows) {
          if (r.asset_class !== 'stock') continue;
          const h: any = hm.get(r.symbol);
          const p = Number(r.price);
          rr[r.symbol] = [String(r.name || r.symbol), String(r.sector || ''), Number(r.volume) || 0, String(r.logo_url || '')];
          s[r.symbol] = [p, h ? Math.max(Number(h.hi), p) : p, h ? Math.min(Number(h.lo), p) : p, Number(r.change_pct)];
        }
        for (const [name, sym] of Object.entries(INDEX_SYMBOLS)) {
          const r: any = by.get(sym);
          if (r) { i[name] = Number(r.price); ic[name] = Number(r.change_pct); }
        }
        const usd: any = by.get('USDTRY');
        const cm = await this.commodities();
        const gold = cm['TVC:GOLD'];
        if (gold && usd) { i['Gram Altın'] = (gold[0] / 31.1035) * Number(usd.price); ic['Gram Altın'] = gold[1]; }
        const brent = cm['TVC:UKOIL'];
        if (brent) { i['Brent'] = brent[0]; ic['Brent'] = brent[1]; }
        const upd = Math.max(0, ...rows.map((r: any) => Number(r.updated_at) || 0));
        if (upd) t = upd * 1000;
      });
    } catch { /* kaynak yoksa boş döner; istemci eski değeri korur */ }
    return { day, t, every: MarketService.EVERY_MS, s, i, ic, r, x };
  }
}
