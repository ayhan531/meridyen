import type { ReactNode } from 'react';

/** Dizüstü çerçevesi: içinde canlı platform ekranı gösterilir. */
export default function Laptop({ children, url = 'meridyen-1.onrender.com/piyasalar' }: { children: ReactNode; url?: string }) {
  return (
    <div className="laptop">
      <div className="lp-lid">
        <div className="lp-bar"><i /><i /><i /><span>{url}</span></div>
        <div className="lp-screen">{children}</div>
      </div>
      <div className="lp-base"><b /></div>
    </div>
  );
}
