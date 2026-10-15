'use client';
import { useRef } from 'react';
import { INDICES } from '@/lib/market-data';
import { arrow, cls, pct } from './format';
import { useMarketTick, useSession } from './hooks';

/** Giriş panelindeki canlı gösterge: endeksler, kurlar ve emtia. Değer değişince satır kısa süre vurgulanır. */
export default function LiveBoard() {
  const n = useMarketTick();
  const s = useSession();
  const prev = useRef<Record<string, string>>({});
  const flash: Record<string, boolean> = {};
  for (const x of INDICES) { flash[x.n] = !!prev.current[x.n] && prev.current[x.n] !== x.v && x.v !== '—'; prev.current[x.n] = x.v; }
  const loaded = INDICES.some((x) => x.v !== '—');
  return (
    <div className="board" role="region" aria-label="Canlı piyasa göstergeleri">
      <div className="board-hd">Canlı piyasa<span>{s ? s.label : ''}</span></div>
      <ul>
        {INDICES.map((x) => (
          <li key={x.n}>
            <b>{x.n}</b>
            <span key={x.v} className={`v num${flash[x.n] ? ' fl' : ''}`}>{x.v}</span>
            <span className={`c num ${cls(x.c)}`}>{x.v === '—' ? '' : `${arrow(x.c)} ${pct(x.c)}`}</span>
          </li>
        ))}
      </ul>
      <div className="board-ft">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
        {loaded ? 'Değerler canlı veri kaynağından alınır.' : n > 1 ? 'Canlı veri şu an alınamıyor; yeniden deniyoruz.' : 'Canlı veriler yükleniyor…'}
      </div>
    </div>
  );
}
