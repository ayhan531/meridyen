/**
 * İstanbul silueti: Boğaz, Galata Köprüsü, Galata Kulesi, Süleymaniye, Levent kuleleri.
 * Elle çizilmiş vektör görsel; veri değildir. Sunucu tarafında üretilir (sabit tohumlu).
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const G = 300; // kıyı çizgisi (y)

function mosque(cx: number, s: number, key: string) {
  const t = (x: number, y: number) => `${(cx + x * s).toFixed(1)} ${(G + y * s).toFixed(1)}`;
  const arc = (r: number) => (r * s).toFixed(1);
  const dome = (x: number, y: number, r: number) => `M${t(x - r, y)} A${arc(r)} ${arc(r)} 0 0 1 ${t(x + r, y)}Z`;
  const minaret = (x: number, h: number) =>
    `M${t(x - 3.5, 0)} L${t(x - 3.5, -h)} L${t(x - 6, -h)} L${t(x, -h - 22)} L${t(x + 6, -h)} L${t(x + 3.5, -h)} L${t(x + 3.5, 0)}Z` +
    `M${t(x - 7, -h * 0.72)} h${(14 * s).toFixed(1)} v${(4 * s).toFixed(1)} h${(-14 * s).toFixed(1)}Z` +
    `M${t(x - 6, -h * 0.9)} h${(12 * s).toFixed(1)} v${(3.5 * s).toFixed(1)} h${(-12 * s).toFixed(1)}Z`;
  const d =
    `M${t(-96, 0)} L${t(-96, -34)} L${t(96, -34)} L${t(96, 0)}Z` +
    dome(0, -34, 50) + dome(-64, -34, 28) + dome(64, -34, 28) + dome(-90, -34, 15) + dome(90, -34, 15) +
    `M${t(-1.6, -84)} h${(3.2 * s).toFixed(1)} v${(-18 * s).toFixed(1)} h${(-3.2 * s).toFixed(1)}Z` +
    minaret(-118, 118) + minaret(118, 118) + minaret(-146, 92) + minaret(146, 92);
  return <path key={key} d={d} />;
}

function galata(cx: number) {
  const d =
    `M${cx - 14} ${G} L${cx - 12} ${G - 118} L${cx + 12} ${G - 118} L${cx + 14} ${G}Z` +
    `M${cx - 19} ${G - 118} h38 v7 h-38Z` +
    `M${cx - 14} ${G - 111} h28 v22 h-28Z` +
    `M${cx - 16} ${G - 124} L${cx} ${G - 158} L${cx + 16} ${G - 124}Z` +
    `M${cx - 1} ${G - 158} h2 v-12 h-2Z`;
  return <path d={d} />;
}

export default function Skyline() {
  const r = rng(7);
  // Levent / Maslak kuleleri (arka plan)
  const towers: { x: number; w: number; h: number; top: number }[] = [];
  let x = 1000;
  while (x < 1590) {
    const w = 24 + Math.floor(r() * 36);
    const h = 60 + Math.floor(r() * 150);
    towers.push({ x, w, h, top: Math.floor(r() * 4) });
    x += w + 2 + Math.floor(r() * 10);
  }
  const towerPath = towers
    .map(({ x: tx, w, h, top }) => {
      const y = G - h;
      if (top === 1) return `M${tx} ${G}V${y + 14}L${tx + w} ${y}V${G}Z`;
      if (top === 2) return `M${tx} ${G}V${y}H${tx + w * 0.55}V${y - 10}H${tx + w}V${G}Z`;
      if (top === 3) return `M${tx} ${G}V${y + 6}L${tx + w / 2} ${y - 16}L${tx + w} ${y + 6}V${G}Z`;
      return `M${tx} ${G}V${y}H${tx + w}V${G}Z`;
    })
    .join('');
  // yanan pencereler
  const wins = towers.flatMap((t) =>
    Array.from({ length: Math.max(2, Math.floor(t.w / 9)) }, () => ({
      x: t.x + 4 + Math.floor(r() * Math.max(1, t.w - 9)),
      y: G - t.h + 18 + Math.floor(r() * Math.max(8, t.h - 30)),
      d: (r() * 6).toFixed(1),
      p: (3 + r() * 5).toFixed(1),
    })),
  );
  // eski şehir evleri
  const houses: string[] = [];
  let hx = 120;
  while (hx < 860) {
    const w = 14 + Math.floor(r() * 18);
    const h = 14 + Math.floor(r() * 26);
    const base = G - 30 - Math.max(0, 52 - Math.abs(hx - 520) * 0.12);
    houses.push(`M${hx} ${G}V${base - h}L${hx + w / 2} ${base - h - 7}L${hx + w} ${base - h}V${G}Z`);
    hx += w + 1 + Math.floor(r() * 6);
  }
  const hill = `M0 ${G}V${G - 38}C140 ${G - 46} 260 ${G - 70} 420 ${G - 82}S640 ${G - 90} 760 ${G - 70}S960 ${G - 36} 1100 ${G - 34}V${G}Z`;
  // köprü
  const arches: string[] = [];
  for (let i = 0; i < 17; i++) {
    const ax = 560 + i * 36;
    arches.push(`M${ax + 5} ${G + 4}V${G - 6}a13 13 0 0 1 26 0V${G + 4}Z`);
  }
  const lamps = Array.from({ length: 24 }, (_, i) => 566 + i * 25);
  // su parıltıları
  const sparks = Array.from({ length: 34 }, () => ({
    x: Math.floor(r() * 1560),
    y: G + 12 + Math.floor(r() * 44),
    w: 14 + Math.floor(r() * 70),
    d: (r() * 8).toFixed(1),
    p: (4 + r() * 5).toFixed(1),
    lime: r() > 0.72,
  }));
  return (
    <svg className="sky" viewBox="0 0 1600 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="skw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E3029" /><stop offset="1" stopColor="#061816" /></linearGradient>
        <linearGradient id="skh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B4F44" stopOpacity=".7" /><stop offset="1" stopColor="#1B4F44" stopOpacity="0" /></linearGradient>
        <linearGradient id="skd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E2B27" stopOpacity="0" /><stop offset=".7" stopColor="#2F7A67" stopOpacity=".38" /><stop offset="1" stopColor="#C8D98A" stopOpacity=".34" /></linearGradient>
        <radialGradient id="skg" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#E4EDA8" stopOpacity=".5" /><stop offset="1" stopColor="#E4EDA8" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="0" y="0" width="1600" height={G} fill="url(#skd)" />
      <circle cx="830" cy="96" r="120" fill="url(#skg)" opacity=".5" />
      <ellipse cx="800" cy={G} rx="900" ry="150" fill="url(#skg)" opacity=".34" />
      <path d={towerPath} fill="#2C6D5E" opacity=".9" />
      <path d={towerPath} fill="url(#skh)" />
      <g className="sk-win">
        {wins.map((w, i) => (<rect key={i} x={w.x} y={w.y} width="3" height="4" rx=".6" style={{ animationDelay: `${w.d}s`, animationDuration: `${w.p}s` }} />))}
      </g>
      <path d={hill} fill="#1E584B" />
      <path d={houses.join('')} fill="#174A3F" />
      <g fill="#0F3A31">
        {mosque(640, 1.05, 'm1')}
        {mosque(300, 0.7, 'm2')}
        {galata(930)}
      </g>
      <g className="sk-win sk-old">
        {[610, 640, 670, 925, 935, 290, 310].map((wx, i) => (<rect key={i} x={wx} y={G - 20 - (i % 3) * 8} width="2.4" height="3.4" style={{ animationDelay: `${i * 1.3}s`, animationDuration: `${4 + (i % 4)}s` }} />))}
      </g>
      <rect x="0" y={G} width="1600" height="60" fill="url(#skw)" />
      <g fill="#071C18">
        <rect x="548" y={G - 12} width="640" height="7" />
        <path d={arches.join('')} />
      </g>
      <g fill="#E4EDA8">
        {lamps.map((lx) => (<rect key={lx} x={lx} y={G - 20} width="1.4" height="8" opacity=".85" />))}
      </g>
      <g className="sk-sparks">
        {sparks.map((s, i) => (<rect key={i} x={s.x} y={s.y} width={s.w} height="1.6" rx=".8" fill={s.lime ? '#C8F169' : '#EAF1EE'} style={{ animationDelay: `${s.d}s`, animationDuration: `${s.p}s` }} />))}
      </g>
      <g className="sk-ferry">
        <g transform={`translate(0 ${G - 6})`}>
          <path d="M0 6 L8 -2 H112 L124 -5 L132 6 Z" fill="#E9F0EC" />
          <path d="M6 6 H128 L124 10 H12Z" fill="#B88A3E" />
          <rect x="18" y="-12" width="76" height="10" rx="2" fill="#D9E4DF" />
          <rect x="34" y="-22" width="36" height="10" rx="2" fill="#E9F0EC" />
          <rect x="82" y="-24" width="8" height="14" fill="#C23B2E" />
          <rect x="82" y="-27" width="8" height="3" fill="#0B2520" />
          {Array.from({ length: 9 }, (_, i) => (<rect key={i} x={22 + i * 8.4} y="-9" width="4.6" height="4" fill="#C8F169" opacity=".9" />))}
          <path d="M-30 9 q10 -3 20 0 t20 0 t20 0" stroke="#EAF1EE" strokeWidth="1.2" fill="none" opacity=".35" />
        </g>
      </g>
    </svg>
  );
}
