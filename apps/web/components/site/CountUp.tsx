'use client';
import { useEffect, useRef, useState } from 'react';

/** Görünür olunca değere kadar sayar. İlk çizim (sunucu) nihai değeri gösterir. */
export default function CountUp({ to, dec = 0, prefix = '', suffix = '' }: { to: number; dec?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    const el = ref.current; if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    setV(0);
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return; io.disconnect();
      const t0 = performance.now(), D = 1400;
      const f = (t: number) => { const k = Math.min(1, (t - t0) / D), z = 1 - Math.pow(1 - k, 3); setV(to * z); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, [to]);
  return <span ref={ref} className="num">{prefix}{v.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec })}{suffix}</span>;
}
