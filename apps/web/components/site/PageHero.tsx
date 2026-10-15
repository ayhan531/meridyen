import type { ReactNode } from 'react';

export default function PageHero({ title, lead, crumb, children }: { title: string; lead?: string; crumb?: [string, string][]; children?: ReactNode }) {
  return (
    <section className="phero">
      <div className="wrap phero-in">
        <nav className="crumb" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a>{(crumb || []).map(([h, t]) => (<span key={h}>/ <a href={h}>{t}</a></span>))}<span>/ {title}</span></nav>
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
