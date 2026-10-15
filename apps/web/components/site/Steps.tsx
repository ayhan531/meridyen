'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Adımlar görünür olunca bağlantı çizgisi çizilir. */
export default function Steps({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { setOn(true); return; }
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <ol ref={ref} className={`steps${on ? ' in' : ''}`}>{children}</ol>;
}
