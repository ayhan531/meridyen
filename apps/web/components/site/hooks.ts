'use client';
import { useEffect, useState } from 'react';
import { MeridyenMarket } from '@/lib/market';
import { sessionText, skyKind, type Sky } from './format';

/** Canlı fiyat geldikçe bileşeni yeniden çizer. */
export function useMarketTick(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const off = MeridyenMarket.onTick(() => setN((x) => x + 1));
    void MeridyenMarket.refresh().then(() => setN((x) => x + 1));
    MeridyenMarket.start();
    return () => { off(); };
  }, []);
  return n;
}

/** Seans durumu (yarım dakikada bir tazelenir). İlk çizim sunucuda boş gelir, tarayıcıda dolar. */
export function useSession() {
  const [s, setS] = useState<ReturnType<typeof sessionText> | null>(null);
  useEffect(() => { const f = () => setS(sessionText(new Date())); f(); const t = setInterval(f, 30000); return () => clearInterval(t); }, []);
  return s;
}

/** Saate göre manzara (sabah / gündüz / akşam / gece). */
export function useSky(): Sky {
  const [k, setK] = useState<Sky>('day');
  useEffect(() => { const f = () => setK(skyKind()); f(); const t = setInterval(f, 60000); return () => clearInterval(t); }, []);
  return k;
}
