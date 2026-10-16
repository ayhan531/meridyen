'use client';
import { useMemo, useState } from 'react';
import { INDICES, LIVE_LISTS, LOGO, STOCKS } from '@/lib/market-data';
import { cls, fmt, pct, tl } from './format';
import { Tri } from './icons';
import { useMarketTick } from './hooks';

const num = (v: any, d = 2) => (typeof v === 'number' ? fmt(v, d) : String(v ?? '—'));

/** Ana sayfadaki kısa liste: günün en çok hareket eden hisseleri. */
export function Movers() {
  const n = useMarketTick();
  const rows = [...STOCKS].sort((a, b) => Math.abs(b.c) - Math.abs(a.c)).slice(0, 8);
  return (
    <div className="panel">
      <div className="panel-hd"><h3>Günün hareketlileri</h3><span>Borsa İstanbul</span></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Hisse</th><th>Son fiyat</th><th>Değişim</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((x) => (
              <tr key={x.s}>
                <td><div className="sym">{LOGO[x.s] ? <img src={LOGO[x.s]} alt="" width={34} height={34} loading="lazy" /> : <span className="ph" />}<span><b>{x.s}</b><em>{x.n}</em></span></div></td>
                <td className="num">{tl(x.p)}</td>
                <td><span className={`pch num ${cls(x.c)}`}><Tri up={x.c >= 0} /> {pct(x.c)}</span></td>
              </tr>
            )) : (n > 1 ? <tr><td colSpan={3}><div className="empty">Canlı veri şu an alınamıyor. Birazdan yeniden denenecek.</div></td></tr>
              : [0, 1, 2, 3, 4].map((i) => (<tr key={i}><td><div className="skel" style={{ width: 120 }} /></td><td><div className="skel" style={{ width: 70, marginLeft: 'auto' }} /></td><td><div className="skel" style={{ width: 70, marginLeft: 'auto' }} /></td></tr>)))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function IndexList() {
  useMarketTick();
  return (
    <div className="panel">
      <div className="panel-hd"><h3>Endeks, kur ve emtia</h3><span>Canlı</span></div>
      <ul className="idx-list">
        {INDICES.map((x) => (
          <li key={x.n}><b>{x.n}</b><span className="v num">{x.v}</span><span className={`c num ${x.v === '—' ? '' : cls(x.c)}`}>{x.v === '—' ? '' : <><Tri up={x.c >= 0} /> {pct(x.c)}</>}</span></li>
        ))}
      </ul>
    </div>
  );
}

type Tab = 'stock' | 'fund' | 'viop' | 'fx';
type Sort = 'name' | 'price' | 'chg';

/** Piyasalar sayfası: hisse, fon, VİOP ve döviz listeleri; arama ve sıralama. */
export function MarketExplorer() {
  const n = useMarketTick();
  const [tab, setTab] = useState<Tab>('stock');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('chg');
  const [dir, setDir] = useState<1 | -1>(-1);
  const rows = useMemo(() => {
    const raw: { s: string; n: string; p: number | string; c: number; extra?: string; logo?: string }[] =
      tab === 'stock' ? STOCKS.map((x) => ({ s: x.s, n: x.n, p: x.p, c: x.c, extra: x.sec, logo: LOGO[x.s] }))
        : (LIVE_LISTS[tab] || []).map((r: any[]) => ({ s: String(r[0]), n: String(r[1] ?? ''), p: r[2], c: Number(r[3]) || 0 }));
    const t = q.trim().toLocaleLowerCase('tr');
    const f = t ? raw.filter((x) => (x.s + ' ' + x.n).toLocaleLowerCase('tr').includes(t)) : raw;
    const k = (x: typeof raw[number]) => (sort === 'name' ? x.s : sort === 'price' ? Number(x.p) || 0 : x.c);
    return [...f].sort((a, b) => { const A = k(a), B = k(b); return (A < B ? -1 : A > B ? 1 : 0) * dir; });
  }, [tab, q, sort, dir, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const head = (k: Sort, label: string) => (
    <th aria-sort={sort === k ? (dir === 1 ? 'ascending' : 'descending') : undefined}>
      <button className="sortb" onClick={() => { if (sort === k) setDir(dir === 1 ? -1 : 1); else { setSort(k); setDir(k === 'name' ? 1 : -1); } }}>{label}{sort === k ? (dir === 1 ? ' ↑' : ' ↓') : ''}</button>
    </th>
  );
  const tabs: [Tab, string][] = [['stock', 'Hisseler'], ['fund', 'Fonlar'], ['viop', 'VİOP'], ['fx', 'Döviz']];
  const wait = n <= 1;
  return (
    <>
      <div className="bar">
        <div className="tabs" role="tablist" aria-label="Piyasa türü">{tabs.map(([k, l]) => (<button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>))}</div>
        <input className="search" type="search" placeholder="Sembol veya ad ara" aria-label="Sembol veya ad ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="panel">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>{head('name', tab === 'stock' ? 'Hisse' : 'Enstrüman')}{head('price', 'Son fiyat')}{head('chg', 'Değişim')}{tab === 'stock' ? <th className="hide-s">Sektör</th> : null}</tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={tab + x.s}>
                  <td><div className="sym">{tab === 'stock' ? (x.logo ? <img src={x.logo} alt="" width={34} height={34} loading="lazy" /> : <span className="ph" />) : null}<span><b>{x.s}</b><em>{x.n}</em></span></div></td>
                  <td className="num">{tab === 'stock' ? tl(Number(x.p)) : num(x.p, tab === 'viop' ? 2 : 4)}</td>
                  <td><span className={`pch num ${cls(x.c)}`}><Tri up={x.c >= 0} /> {pct(x.c)}</span></td>
                  {tab === 'stock' ? <td className="hide-s mute">{x.extra}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? <div className="empty">{wait ? 'Canlı veriler yükleniyor…' : q ? 'Aramanızla eşleşen sonuç yok.' : 'Bu liste için canlı veri şu an alınamıyor.'}</div> : null}
      </div>
      <p className="mute" style={{ marginTop: 14, fontSize: 13.5 }}>Fiyatlar canlı veri kaynağından alınır; gecikme veya kesinti olabilir. Burada gösterilenler yatırım tavsiyesi değildir. Fon, VİOP ve döviz alım satımı için müşteri temsilcinizle iletişime geçin.</p>
    </>
  );
}
