'use client';
import { useEffect, useRef } from 'react';

/** Telefon çerçevesinde uygulamanın kendisi (/app?demo=1, oturum gerektirmez). */
export default function DevicePreview() {
  const scr = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const el = scr.current, f = frame.current; if (!el || !f) return;
    const fit = () => { const s = el.clientWidth / 390; f.style.transform = `scale(${s})`; f.style.height = el.clientHeight / s + 'px'; };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="device">
      <div className="cap" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 11V6a2 2 0 0 1 4 0v5m0-1a2 2 0 0 1 4 0v3a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 13a1.8 1.8 0 0 1 2.9-2.1L9 13" /></svg>Uygulama canlı, dokunun</div>
      <div className="frame">
        <span className="notch" />
        <div className="screen" ref={scr}>
          <iframe ref={frame} title="Meridyen Yatırım uygulaması" src="/app?demo=1" loading="lazy" tabIndex={-1} />
        </div>
      </div>
    </div>
  );
}
