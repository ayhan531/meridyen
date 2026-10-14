'use client';
import { INDICES, LOGO, STOCKS, type Stock } from '@/lib/market-data';
import { arrow, cls, pct, tl } from './format';
import { useMarketTick } from './hooks';

export function IndexCards() {
  useMarketTick();
  return (
    <div className="idxs">
      {INDICES.map((x) => (
        <div className="card" key={x.n}><div className="n">{x.n}</div><div className="v num">{x.v}</div><div className={`c num ${cls(x.c)}`}>{arrow(x.c)} {pct(x.c)}</div></div>
      ))}
    </div>
  );
}

/** Gün içi çizgi: hisse koduna bağlı tekrarlanabilir seri, son nokta anlık fiyat. */
function Spark({ st }: { st: Stock }) {
  let a = 0; for (const ch of st.s + '1G') a = (a * 31 + ch.charCodeAt(0)) >>> 0;
  const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const n = 32, pts: number[] = []; let v = st.pc;
  for (let i = 0; i < n; i++) { v += (st.p - v) / (n - i) + (r() - 0.5) * st.p * 0.004; pts.push(i === n - 1 ? st.p : v); }
  const mn = Math.min(...pts), mx = Math.max(...pts), w = 76, h = 28;
  const d = pts.map((p, i) => (i ? 'L' : 'M') + ((i / (n - 1)) * w).toFixed(1) + ' ' + (h - 3 - ((p - mn) / (mx - mn || 1)) * (h - 6)).toFixed(1)).join(' ');
  return <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={d} fill="none" stroke={`var(--${cls(st.c)})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function MoversRows() {
  useMarketTick();
  const rows = [...STOCKS].sort((a, b) => Math.abs(b.c) - Math.abs(a.c)).slice(0, 5);
  return (
    <tbody>
      {rows.map((x) => (
        <tr key={x.s}>
          <td><div className="sym">{LOGO[x.s] ? <img src={LOGO[x.s]} alt="" width={36} height={36} loading="lazy" /> : null}<span><b>{x.s}</b><em>{x.n}</em></span></div></td>
          <td className="col-spark"><Spark st={x} /></td>
          <td className="num">{tl(x.p)}</td>
          <td><span className={`pchip num ${cls(x.c)}`}>{arrow(x.c)} {pct(x.c)}</span></td>
        </tr>
      ))}
    </tbody>
  );
}
