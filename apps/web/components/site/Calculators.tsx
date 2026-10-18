'use client';
import { useState } from 'react';
import CostCalculator from './CostCalculator';
import { LIVE_LISTS } from '@/lib/market-data';
import { fmt, parseNum, tl } from './format';
import { useMarketTick } from './hooks';

const C = 0.001, B = 0.05;

function Fx() {
  useMarketTick();
  const rates: [string, number][] = ([['TRY', 1]] as [string, number][]).concat((LIVE_LISTS.fx || []).map((q: any[]) => [String(q[0]).replace(/\/.*$/, '').replace(/TRY$/, '') || String(q[0]), Number(q[2])] as [string, number])).filter((x) => x[1] > 0);
  const [amt, setAmt] = useState('1.000'), [from, setFrom] = useState('USD'), [to, setTo] = useState('TRY');
  const r = (c: string) => rates.find((x) => x[0] === c)?.[1];
  const a = parseNum(amt), rf = r(from), rt = r(to), res = rf && rt ? (a * rf) / rt : null;
  if (rates.length < 2) return <div className="empty">Canlı kurlar yüklenince çevirici açılır.</div>;
  return (
    <form className="cc" onSubmit={(e) => e.preventDefault()} aria-label="Döviz çevirici">
      <div className="field"><label htmlFor="fxA">Tutar</label><input className="inp num" id="fxA" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.,]/g, ''))} /></div>
      <div className="two2">
        <div className="field"><label htmlFor="fxF">Çevrilecek</label><select className="inp" id="fxF" value={from} onChange={(e) => setFrom(e.target.value)}>{rates.map(([c]) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="fxT">Hedef</label><select className="inp" id="fxT" value={to} onChange={(e) => setTo(e.target.value)}>{rates.map(([c]) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="sum" aria-live="polite"><div className="tot"><span>Sonuç</span><b className="num">{res == null ? '—' : fmt(res, 2) + ' ' + to}</b></div><div><span>Kur bilgisi</span><b className="num">{rf && rt ? `1 ${from} = ${fmt(rf / rt, 4)} ${to}` : '—'}</b></div></div>
      <p className="hint">Kurlar bilgilendirme amaçlıdır; işlem kuru farklı olabilir. Döviz alım satımı için müşteri temsilcinizle iletişime geçin.</p>
    </form>
  );
}

function Pnl() {
  const [buy, setBuy] = useState('100,00'), [sell, setSell] = useState('110,00'), [qty, setQty] = useState('100');
  const b = parseNum(buy), s = parseNum(sell), q = parseNum(qty);
  const cost = b * q, cb = cost * C, bb = cb * B, proceeds = s * q, cs = proceeds * C, bs = cs * B;
  const net = proceeds - cs - bs - (cost + cb + bb), pc = cost + cb + bb > 0 ? (net / (cost + cb + bb)) * 100 : 0;
  const f = (l: string, id: string, v: string, set: (x: string) => void) => (<div className="field"><label htmlFor={id}>{l}</label><input className="inp num" id={id} inputMode="decimal" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.,]/g, ''))} /></div>);
  return (
    <form className="cc" onSubmit={(e) => e.preventDefault()} aria-label="Kâr zarar hesaplayıcı">
      <div className="two2">{f('Alış fiyatı (₺)', 'pB', buy, setBuy)}{f('Satış fiyatı (₺)', 'pS', sell, setSell)}</div>
      {f('Adet', 'pQ', qty, setQty)}
      <div className="sum" aria-live="polite">
        <div><span>Alış maliyeti (komisyon + BSMV dahil)</span><b className="num">{tl(cost + cb + bb)}</b></div>
        <div><span>Satıştan kalan (komisyon + BSMV sonrası)</span><b className="num">{tl(proceeds - cs - bs)}</b></div>
        <div className="tot"><span>Net kâr / zarar</span><b className={`num ${net >= 0 ? 'up' : 'down'}`}>{tl(net)} ({fmt(pc)}%)</b></div>
      </div>
      <p className="hint">Hesap, pay piyasası komisyonu (%0,1) ve BSMV (komisyonun %5&apos;i) ile yapılır. Vergi ve diğer masraflar dahil değildir.</p>
    </form>
  );
}

/** Üç hesaplayıcı tek çatıda. */
export default function Calculators({ initial = 'maliyet' }: { initial?: 'maliyet' | 'doviz' | 'kar' }) {
  const [t, setT] = useState(initial);
  const tabs: ['maliyet' | 'doviz' | 'kar', string][] = [['maliyet', 'Emir maliyeti'], ['kar', 'Kâr / zarar'], ['doviz', 'Döviz çevirici']];
  return (
    <div className="calcs" id="hesaplayici">
      <div className="tabs" role="tablist" aria-label="Hesaplayıcı">{tabs.map(([k, l]) => (<button key={k} role="tab" aria-selected={t === k} onClick={() => setT(k)}>{l}</button>))}</div>
      <div style={{ marginTop: 16 }}>{t === 'maliyet' ? <CostCalculator /> : t === 'kar' ? <Pnl /> : <Fx />}</div>
    </div>
  );
}
