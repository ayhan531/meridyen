'use client';
import { NEWS, NEWSFEED } from '@/lib/market-data';
import { useMarketTick } from './hooks';

/** Canlı haber akışı. Kaynaklar bağlantıyla yeni sekmede açılır. */
export default function NewsList({ limit = 6, full = false }: { limit?: number; full?: boolean }) {
  const n = useMarketTick();
  const list = (full ? NEWS.default : NEWSFEED).slice(0, limit);
  if (!list.length) return <div className="empty">{n <= 1 ? "Haberler yükleniyor…" : "Haber akışı şu an alınamıyor. Birazdan yeniden denenecek."}</div>;
  return (
    <ul className="news">
      {list.map((x, k) => (
        <li key={k}>
          {x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer"><b>{x.t}</b><span>{x.s}</span></a> : <div><b>{x.t}</b><span>{x.s}</span></div>}
        </li>
      ))}
    </ul>
  );
}
