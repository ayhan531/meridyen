'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { INDICES } from '@/lib/market-data';
import { fmt, greeting } from '@/components/site/format';
import { useMarketTick } from '@/components/site/hooks';
import MarketStatus from '@/components/site/MarketStatus';
import SkyImage from '@/components/site/SkyImage';

/** Giriş / kayıt sayfalarının sol paneli: saate göre manzara, selamlama, seans durumu ve üç gösterge. */
export default function AuthAside({ title, lead, name }: { title: ReactNode; lead: string; name?: string }) {
  const [greet, setGreet] = useState('İyi günler');
  useEffect(() => { setGreet(greeting()); }, []);
  useMarketTick();
  const q = ['BIST 100', 'Gram Altın', 'USD/TRY'].map((n) => INDICES.find((i) => i.n === n)).filter(Boolean);
  return (
    <aside className="aside" aria-label="Meridyen Yatırım">
      <div className="sky" aria-hidden="true"><SkyImage /></div>
      <a className="brand" href="/"><span className="logo">M</span><span><b>Meridyen Yatırım</b><small>Borsa İstanbul işlem platformu</small></span></a>
      <div className="mid">
        <div className="greet"><span>{greet},</span> {name ? <b>{name}</b> : null}</div>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        <MarketStatus />
        <div className="quotes">
          {q.map((i) => i && (
            <div key={i.n}><span>{i.n}</span><b className="num">{i.v}</b><em className={`num ${i.c >= 0 ? 'up' : 'down'}`}>{i.c >= 0 ? '▲' : '▼'} {(i.c > 0 ? '+' : '') + fmt(i.c)}%</em></div>
          ))}
        </div>
      </div>
    </aside>
  );
}
