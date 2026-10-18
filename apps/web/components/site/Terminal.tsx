/**
 * Örnek işlem ekranı (mum grafik, izleme listesi, emir bileti).
 * Tutarlar örnektir; gerçek veri değildir. Sunucuda sabit tohumla üretilir.
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const WATCH: [string, string, string, number][] = [
  ['THYAO', 'Türk Hava Yolları', '312,40', 1.85],
  ['GARAN', 'Garanti BBVA', '120,75', 0.5],
  ['AKBNK', 'Akbank', '65,30', 2.1],
  ['ASELS', 'Aselsan', '158,20', -0.4],
  ['BIMAS', 'BİM Mağazalar', '541,00', 0.9],
  ['EREGL', 'Ereğli Demir Çelik', '47,92', -1.2],
];

export default function Terminal() {
  const r = rng(11);
  const N = 46, W = 460, H = 190, VH = 36;
  let p = 296;
  const cs = Array.from({ length: N }, () => {
    const o = p;
    const c = o + (r() - 0.44) * 6;
    const hi = Math.max(o, c) + r() * 3.2;
    const lo = Math.min(o, c) - r() * 3.2;
    p = c;
    return { o, c, hi, lo, v: 0.25 + r() * 0.75 };
  });
  const min = Math.min(...cs.map((c) => c.lo)) - 2;
  const max = Math.max(...cs.map((c) => c.hi)) + 2;
  const y = (v: number) => 6 + (1 - (v - min) / (max - min)) * (H - VH - 14);
  const step = W / N;
  const ma = cs.map((_, i) => {
    const a = cs.slice(Math.max(0, i - 7), i + 1);
    return a.reduce((s, c) => s + c.c, 0) / a.length;
  });
  const maPath = ma.map((v, i) => `${i ? 'L' : 'M'}${(i * step + step / 2).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const last = cs[N - 1];
  return (
    <div className="term" role="img" aria-label="Örnek işlem ekranı: mum grafik, izleme listesi ve emir bileti">
      <aside className="tm-w">
        <div className="tm-t">İzleme listem</div>
        {WATCH.map(([s, n, v, c]) => (
          <div key={s} className={`tm-r${s === 'THYAO' ? ' on' : ''}`}>
            <img src={`/img/logos/${s}.svg`} alt="" width="22" height="22" loading="lazy" />
            <div><b>{s}</b><span>{n}</span></div>
            <div className="tm-p"><b className="num">{v}</b><span className={c >= 0 ? 'up' : 'down'}>{c >= 0 ? '+' : ''}{c.toFixed(2).replace('.', ',')}%</span></div>
          </div>
        ))}
      </aside>
      <section className="tm-c">
        <div className="tm-h">
          <div><b>THYAO</b><span>Türk Hava Yolları · BIST</span></div>
          <div className="tm-q"><b className="num">₺312,40</b><span className="up">▲ +1,85%</span></div>
        </div>
        <div className="tm-tf"><i className="on">1G</i><i>1H</i><i>1A</i><i>3A</i><i>1Y</i></div>
        <svg viewBox={`0 0 ${W} ${H}`} className="tm-svg" preserveAspectRatio="none">
          {[0.2, 0.4, 0.6, 0.8].map((g) => (<line key={g} x1="0" x2={W} y1={g * (H - VH)} y2={g * (H - VH)} stroke="rgba(234,241,238,.07)" />))}
          {cs.map((c, i) => {
            const x = i * step + step / 2;
            const up = c.c >= c.o;
            const col = up ? '#4FD08A' : '#F0716B';
            const isLast = i === N - 1;
            return (
              <g key={i} className={isLast ? 'tm-live' : undefined}>
                <line x1={x} x2={x} y1={y(c.hi)} y2={y(c.lo)} stroke={col} strokeWidth="1.2" />
                <rect x={x - step * 0.3} y={y(Math.max(c.o, c.c))} width={step * 0.6} height={Math.max(1.6, Math.abs(y(c.o) - y(c.c)))} fill={col} rx=".6" />
                <rect x={x - step * 0.3} y={H - c.v * VH} width={step * 0.6} height={c.v * VH} fill={col} opacity=".28" />
              </g>
            );
          })}
          <path d={maPath} fill="none" stroke="#C8F169" strokeWidth="1.6" strokeLinejoin="round" />
          <line x1="0" x2={W} y1={y(last.c)} y2={y(last.c)} stroke="#C8F169" strokeDasharray="3 4" opacity=".55" />
        </svg>
        <div className="tm-ax"><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>17:30</span></div>
      </section>
      <aside className="tm-o">
        <div className="tm-sw"><i className="buy">Alış</i><i>Satış</i></div>
        <label>Adet<b className="num">100</b></label>
        <label>Fiyat<b className="num">₺312,40</b></label>
        <div className="tm-sum"><span>Komisyon</span><b className="num">₺31,24</b></div>
        <div className="tm-sum"><span>BSMV</span><b className="num">₺1,56</b></div>
        <div className="tm-sum tot"><span>Toplam</span><b className="num">₺31.272,80</b></div>
        <span className="tm-go">Emri ver</span>
      </aside>
    </div>
  );
}
