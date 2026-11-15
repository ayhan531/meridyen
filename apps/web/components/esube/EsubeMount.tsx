'use client';
import dynamic from 'next/dynamic';

const Shell = dynamic(() => import('@/esube-ui/Root.jsx'), { ssr: false, loading: () => <div className="mrdn-boot" aria-busy="true"><span /></div> });

export default function EsubeMount({ mode }: { mode: 'app' | 'admin' }) {
  return <Shell mode={mode} />;
}
