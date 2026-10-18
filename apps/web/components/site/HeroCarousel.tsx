'use client';
import { useEffect, useRef, useState } from 'react';
import LiveBoard from './LiveBoard';
import MarketStatus from './MarketStatus';
import PhoneDemo from './PhoneDemo';
import Waves from './Waves';

const SLIDES = [
  { k: 'Canlı piyasa', t: "Borsa İstanbul'a sade ve şeffaf bir hat.", d: 'Piyasaları izleyin, emrinizi verin, portföyünüzü takip edin. Fiyatlar canlı kaynaktan gelir.', a: ['/kayit', 'Hesap aç'], b: ['/piyasalar', 'Canlı piyasalara bak'] },
  { k: 'Maliyet', t: 'Emri vermeden önce toplamı görün.', d: 'Komisyon ve BSMV, onay düğmesinin hemen üstünde kalem kalem gösterilir. Sonradan çıkan kalem olmaz.', a: ['/araclar#maliyet', 'Maliyeti hesapla'], b: ['/ucretler', 'Ücretleri incele'] },
  { k: 'Her cihazda', t: 'Tek kimlik, tek hesap, her cihaz.', d: 'Telefon, tablet ve bilgisayarda aynı e-şube. Emirlerinizi, bakiyenizi ve bildirimlerinizi her yerden izleyin.', a: ['/platform', 'Platformu keşfedin'], b: ['/hesap-acma', 'Hesap açma rehberi'] },
];
const MS = 8000;

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const reduce = useRef(false);
  useEffect(() => { reduce.current = matchMedia('(prefers-reduced-motion: reduce)').matches; }, []);
  useEffect(() => {
    if (hold || reduce.current) return;
    const t = setTimeout(() => setI((x) => (x + 1) % SLIDES.length), MS);
    return () => clearTimeout(t);
  }, [i, hold]);
  return (
    <section className="hero" aria-roledescription="carousel" aria-label="Öne çıkanlar" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div className="hero-grid" aria-hidden="true" />
      <Waves />
      <div className="wrap hero-in">
        <div className="hero-copy">
          <MarketStatus className="mstat" />
          <div className="slides">
            {SLIDES.map((s, k) => (
              <div key={s.k} className={`slide${k === i ? ' on' : ''}`} aria-hidden={k !== i} {...(k !== i ? { inert: true } as any : {})}>
                {k === 0 ? <h1>{s.t}</h1> : <h2 className="h1">{s.t}</h2>}
                <p className="lead">{s.d}</p>
                <div className="ctas"><a className="btn lime" href={s.a[0]}>{s.a[1]}</a><a className="btn ghost-d" href={s.b[0]}>{s.b[1]}</a></div>
              </div>
            ))}
          </div>
          <p className="fine">Yatırım ürünleri risk içerir; yatırdığınız tutarın bir kısmını ya da tamamını kaybedebilirsiniz.</p>
        </div>
        <div className="hero-art">
          <div className={`vis${i === 0 ? ' on' : ''}`}><LiveBoard /></div>
          <div className={`vis${i === 1 ? ' on' : ''}`} aria-hidden={i !== 1}>
            <div className="costcard">
              <div className="cc-hd">Örnek alım<span>Pay piyasası</span></div>
              <div className="cc-row"><span>İşlem tutarı</span><b className="num">₺10.000,00</b></div>
              <div className="cc-row"><span>Komisyon (%0,1)</span><b className="num">₺10,00</b></div>
              <div className="cc-row"><span>BSMV (komisyonun %5&apos;i)</span><b className="num">₺0,50</b></div>
              <div className="cc-row tot"><span>Ödenecek toplam</span><b className="num">₺10.010,50</b></div>
              <div className="cc-ft">Hesaplayıcıda kendi tutarınızı deneyin.</div>
            </div>
          </div>
          <div className={`vis${i === 2 ? ' on' : ''}`} aria-hidden={i !== 2}><PhoneDemo /></div>
        </div>
      </div>
      <div className="wrap hero-nav" role="tablist" aria-label="Slayt seçimi">
        {SLIDES.map((s, k) => (
          <button key={s.k} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)}>
            <span className="bar"><i key={k === i ? `a${i}` : 'x'} style={{ animationDuration: `${MS}ms`, animationPlayState: hold ? 'paused' : 'running' }} /></span>
            <span className="lbl">{s.k}</span>
          </button>
        ))}
      </div>
      <p className="hero-coord">İstanbul · 41,0082° K · 28,9784° D</p>
    </section>
  );
}
