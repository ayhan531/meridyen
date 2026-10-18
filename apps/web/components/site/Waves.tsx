/** Hero arka planı: akan dalga çizgileri (süs; veri değildir). */
function wave(amp: number, y: number, ph: number) {
  const W = 1440, P = 720, pts: string[] = [];
  for (let x = 0; x <= W * 2; x += 24) pts.push(`${x === 0 ? 'M' : 'L'}${x} ${(y + Math.sin(((x + ph) / P) * Math.PI * 2) * amp + Math.sin(((x + ph) / P) * Math.PI * 4) * amp * 0.35).toFixed(1)}`);
  return pts.join(' ');
}
export default function Waves() {
  const L = [[46, 250, 0, 'a'], [34, 290, 180, 'b'], [58, 220, 420, 'c'], [26, 330, 560, 'd']] as const;
  return (
    <svg className="waves" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wg" x1="0" x2="1"><stop offset="0" stopColor="#C8F169" stopOpacity="0" /><stop offset=".5" stopColor="#C8F169" stopOpacity=".7" /><stop offset="1" stopColor="#C8F169" stopOpacity="0" /></linearGradient>
      </defs>
      {L.map(([a, y, ph, k], i) => (<g key={k} className={`wv w${i + 1}`}><path d={wave(a, y, ph)} fill="none" stroke={i % 2 ? 'rgba(234,241,238,.22)' : 'url(#wg)'} strokeWidth={i % 2 ? 1.2 : 1.6} /></g>))}
    </svg>
  );
}
