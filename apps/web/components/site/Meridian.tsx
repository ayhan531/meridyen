/** Ana sayfa girişindeki çizgi çalışması: boylam çizgileri, ekvator ve İstanbul meridyeni. */
export default function Meridian() {
  const lon = [330, 250, 160, 70];
  return (
    <svg className="globe" viewBox="0 0 1000 1000" aria-hidden="true">
      <circle className="ring" cx="500" cy="500" r="470" />
      <circle className="ring" cx="500" cy="500" r="395" />
      {lon.map((rx) => (<ellipse key={rx} className="ln" pathLength={1} cx="500" cy="500" rx={rx} ry="400" />))}
      <ellipse className="ln eq" pathLength={1} cx="500" cy="500" rx="400" ry="150" />
      <ellipse className="ln" pathLength={1} cx="500" cy="500" rx="400" ry="290" />
      <path className="ln mer" pathLength={1} d="M500 40V960" />
      <circle className="sat" r="6" />
    </svg>
  );
}
