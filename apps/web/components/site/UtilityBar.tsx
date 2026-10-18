'use client';
import { INDICES } from '@/lib/market-data';
import { cls, pct } from './format';
import { Tri } from './icons';
import { useMarketTick, useSession } from './hooks';

/** En üstteki ince çubuk: seans durumu, canlı göstergeler ve hızlı bağlantılar. */
export default function UtilityBar() {
  useMarketTick();
  const s = useSession();
  const pick = INDICES.filter((x) => ['BIST 100', 'USD/TRY', 'EUR/TRY', 'Gram Altın', 'Brent'].includes(x.n));
  return (
    <div className="ub">
      <div className="wrap ub-in">
        <span className={`ub-st${s?.open ? ' on' : ''}`}><i />{s ? s.label : 'Borsa'}{s?.sub ? <em>{s.sub}</em> : null}</span>
        <ul className="ub-ix" aria-label="Canlı göstergeler">
          {pick.map((x) => (<li key={x.n}><b>{x.n}</b><span className="num">{x.v}</span>{x.v !== '—' ? <em className={`num ${cls(x.c)}`}><Tri up={x.c >= 0} />{pct(x.c)}</em> : null}</li>))}
        </ul>
        <nav className="ub-links" aria-label="Hızlı bağlantılar">
          <a href="/hesap-acma">Hesap açma</a><a href="/destek">Destek</a><a href="/sss">SSS</a><a href="/iletisim">İletişim</a>
        </nav>
      </div>
    </div>
  );
}
