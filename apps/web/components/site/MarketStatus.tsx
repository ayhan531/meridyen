'use client';
import { useSession } from './hooks';

export default function MarketStatus({ className = 'status' }: { className?: string }) {
  const s = useSession();
  return (
    <div className={`${className}${s?.open ? ' on' : ''}`} role="status"><i /><b>{s ? s.label : 'Borsa'}</b><span>{s?.sub || ''}</span></div>
  );
}
