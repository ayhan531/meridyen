import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/blog';
const base = (process.env.PUBLIC_BASE_URL || 'https://meridyen-1.onrender.com').replace(/\/$/, '');
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/kurumsal', '/hizmetler', '/piyasalar', '/platform', '/guvenlik', '/ucretler', '/araclar', '/haberler', '/hesap-acma', '/destek', '/gizlilik', '/site-haritasi', '/blog', '/sss', '/iletisim', '/sozlesmeler', '/kvkk', '/risk-bildirimi', '/giris', '/kayit'];
  return [...pages.map((p) => ({ url: base + p })), ...POSTS.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date }))];
}
