'use client';
import { useState } from 'react';
import { parseNum, tl } from './format';

const COMM = 0.001, BSMV = 0.05;

/** Emir maliyeti: uygulamadaki komisyon (%0,1) ve BSMV (komisyonun %5'i) ile aynı hesap. */
export default function CostCalculator() {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amt, setAmt] = useState('10.000');
  const g = Math.min(parseNum(amt), 1e12), c = g * COMM, t = c * BSMV, tot = side === 'buy' ? g + c + t : g - c - t;
  const onInput = (v: string) => {
    const parts = v.replace(/[^0-9,]/g, '').split(',');
    const int = parts[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setAmt(parts.length > 1 ? int + ',' + parts.slice(1).join('').slice(0, 2) : int);
  };
  return (
    <form className="cc" aria-label="Emir maliyeti hesaplayıcı" onSubmit={(e) => e.preventDefault()}>
      <div className="cc-seg" role="group" aria-label="İşlem yönü">
        <button type="button" className="buy" aria-pressed={side === 'buy'} onClick={() => setSide('buy')}>Al</button>
        <button type="button" className="sell" aria-pressed={side === 'sell'} onClick={() => setSide('sell')}>Sat</button>
      </div>
      <div className="field">
        <label htmlFor="calcAmt">İşlem tutarı</label>
        <div className="inpw"><span className="pre">₺</span><input className="inp has-pre num" id="calcAmt" inputMode="decimal" autoComplete="off" value={amt} onChange={(e) => onInput(e.target.value)} onFocus={(e) => e.target.select()} /></div>
      </div>
      <div className="sum" aria-live="polite">
        <div><span>İşlem tutarı</span><b className="num">{tl(g)}</b></div>
        <div><span>Komisyon (%0,1)</span><b className="num">{tl(c)}</b></div>
        <div><span>BSMV (komisyonun %5&apos;i)</span><b className="num">{tl(t)}</b></div>
        <div className="tot"><span>{side === 'buy' ? 'Ödenecek toplam' : 'Hesaba geçecek'}</span><b className="num">{tl(Math.max(0, tot))}</b></div>
      </div>
    </form>
  );
}
