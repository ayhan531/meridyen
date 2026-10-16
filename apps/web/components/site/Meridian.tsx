/** Ana sayfa girişindeki çizgi çalışması: dönen boylam çizgileri, enlem halkaları, akan veri ve İstanbul meridyeni. */
export default function Meridian() {
  return (
    <svg className="globe" viewBox="0 0 1000 1000" aria-hidden="true">
      <circle className="ring" cx="500" cy="500" r="470" />
      <circle className="ring r2" cx="500" cy="500" r="395" />
      {[0, 1, 2, 3, 4, 5].map((i) => (<ellipse key={i} className="lon" cx="500" cy="500" rx="400" ry="400" style={{ animationDelay: `${0.4}s, ${-i * 4.4}s` }} />))}
      <ellipse className="ln eq" pathLength={1} cx="500" cy="500" rx="400" ry="150" />
      <ellipse className="ln" pathLength={1} cx="500" cy="500" rx="400" ry="290" />
      <ellipse className="flow" pathLength={100} cx="500" cy="500" rx="400" ry="150" />
      <ellipse className="flow f2" pathLength={100} cx="500" cy="500" rx="400" ry="290" />
      <path className="ln mer" pathLength={1} d="M500 40V960" />
      <circle className="sat" r="6" />
    </svg>
  );
}
