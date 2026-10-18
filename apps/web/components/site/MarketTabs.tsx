'use client';
import { useState } from 'react';
import { INDICES, LIVE_LISTS, LOGO, STOCKS } from '@/lib/market-data';
import { cls, fmt, pct, tl } from './format';
import { Tri } from './icons';
import { useMarketTick } from './hooks';

type Tab = 'stock' | 'idx' | 'fund' | 'viop' | 'fx';
const TABS: [Tab, string][] = [['stock', 'Hisseler'], ['idx', 'Endeks ve emtia'], ['fx', 'Döviz'], ['fund', 'Fonlar'], ['viop', 'VİOP']];

/** Ana sayfa piyasa bölümü: sekmeli, canlı, kısa liste. */
export default function MarketTabs() {
  const n = useMarketTick();
  const [tab, setTab] = useState<Tab>('stock');
  type Row = { s: string; n: string; p: string; c: number; logo?: string };
  let rows: Row[] = [];
  if (tab === 'stock') rows = [...STOCKS].sort((a, b) => Math.abs(b.c) - Math.abs(a.c)).slice(0, 8).map((x) => ({ s: x.s, n: x.n, p: tl(x.p), c: x.c, logo: LOGO[x.s] }));
  else if (tab === 'idx') rows = INDICES.filter((x) => x.v !== '—').map((x) => ({ s: x.n, n: '', p: x.v, c: x.c }));
  else rows = (LIVE_LISTS[tab] || []).slice(0, 8).map((r: any[]) => ({ s: String(r[0]), n: String(r[1] ?? ''), p: typeof r[2] === 'number' ? fmt(r[2], tab === 'viop' ? 2 : 4) : String(r[2]), c: Number(r[3]) || 0 }));
  return (
    <div className="panel mt">
      <div className="panel-hd">
        <div className="tabs" role="tablist" aria-label="Piyasa türü">{TABS.map(([k, l]) => (<button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>))}</div>
        <a className="sec-link" href="/piyasalar">Tümü</a>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>{tab === 'stock' ? 'Hisse' : 'Enstrüman'}</th><th>Son fiyat</th><th>Değişim</th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={tab + x.s}>
                <td><div className="sym">{tab === 'stock' ? (x.logo ? <img src={x.logo} alt="" width={34} height={34} loading="lazy" /> : <span className="ph" />) : null}<span><b>{x.s}</b>{x.n ? <em>{x.n}</em> : null}</span></div></td>
                <td className="num">{x.p}</td>
                <td><span className={`pch num ${cls(x.c)}`}><Tri up={x.c >= 0} /> {pct(x.c)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <div className="empty">{n <= 1 ? 'Canlı veriler yükleniyor…' : 'Bu liste için canlı veri şu an alınamıyor.'}</div> : null}
    </div>
  );
}
