'use client';
import { INDICES, LOGO, STOCKS } from '@/lib/market-data';
import { arrow, cls, pct, tl } from './format';
import { useMarketTick } from './hooks';

export default function MarketTape() {
  useMarketTick();
  const list = STOCKS.slice(0, 16);
  if (!list.length) return <div className="tape2" aria-hidden="true" style={{ height: 49 }} />;
  const items = (h: boolean, k: string) => [
    ...INDICES.filter((x) => x.v !== '—').map((x) => (
      <span key={k + 'i' + x.n} aria-hidden={h || undefined} className="it"><b>{x.n}</b><span className="num">{x.v}</span><em className={`num ${cls(x.c)}`}>{arrow(x.c)} {pct(x.c)}</em></span>
    )),
    ...list.map((x) => (
      <span key={k + 's' + x.s} aria-hidden={h || undefined} className="it">{LOGO[x.s] ? <img src={LOGO[x.s]} alt="" width={22} height={22} /> : null}<b>{x.s}</b><span className="num">{tl(x.p)}</span><em className={`num ${cls(x.c)}`}>{arrow(x.c)} {pct(x.c)}</em></span>
    )),
  ];
  return <div className="tape2" role="region" aria-label="Piyasa şeridi"><div className="track">{items(false, 'a')}{items(true, 'b')}</div></div>;
}
