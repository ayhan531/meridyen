'use client';
import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

/** Görünür olunca içeriği sırayla belirir. stagger: doğrudan çocuklar 80 ms arayla girer. */
export default function Reveal({ children, stagger, className = '', delay = 0, style, as = 'div', spot }: { children: ReactNode; stagger?: boolean; className?: string; delay?: number; style?: CSSProperties; as?: 'div' | 'ul' | 'ol' | 'dl'; spot?: boolean }) {
  const ref = useRef<any>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (stagger) Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(i)));
    const show = () => el.classList.add('in');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { show(); return; }
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { show(); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    io.observe(el); return () => io.disconnect();
  }, [stagger]);
  const Tag = as as any;
  const move = spot ? (e: React.PointerEvent) => {
    const c = (e.target as HTMLElement).closest('.bn') as HTMLElement | null; if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`);
  } : undefined;
  return <Tag ref={ref} onPointerMove={move} className={`rv${stagger ? ' stg' : ''} ${className}`} style={{ ...style, ['--d' as any]: `${delay}ms` }}>{children}</Tag>;
}
