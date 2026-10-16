import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  chart: <path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" />,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 016.5 5H18v14H6.5A2.5 2.5 0 014 16.5v-9z" /><path d="M18 9.5h2v5h-2a2.5 2.5 0 010-5z" /></>,
  bell: <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" /><path d="M10 20.5a2 2 0 004 0" /></>,
  swap: <path d="M7 7h12l-3-3M17 17H5l3 3" />,
  doc: <><path d="M7 3h7l4 4v14H7V3z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  layers: <path d="M12 4l9 5-9 5-9-5 9-5zM3 14l9 5 9-5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></>,
  user: <><circle cx="12" cy="8.5" r="3.7" /><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  down: <path d="M6 9l6 6 6-6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Ico({ n, size, className }: { n: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{P[n]}</svg>
  );
}

/** Değişim yönü üçgeni (yazı karakteri yerine çizgi). */
export function Tri({ up }: { up: boolean }) {
  return <svg className={`tri ${up ? 'u' : 'd'}`} viewBox="0 0 10 10" width="9" height="9" aria-hidden="true"><path d="M5 1.8l4 6.4H1z" fill="currentColor" /></svg>;
}
