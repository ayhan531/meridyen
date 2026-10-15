import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/blog';
const base = (process.env.PUBLIC_BASE_URL || 'https://meridyen-1.onrender.com').replace(/\/$/, '');
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/kurumsal', '/hizmetler', '/ucretler', '/blog', '/sss', '/iletisim', '/sozlesmeler', '/giris', '/kayit'];
  return [...pages.map((p) => ({ url: base + p })), ...POSTS.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date }))];
}
