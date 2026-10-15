import type { MetadataRoute } from 'next';
const base = (process.env.PUBLIC_BASE_URL || 'https://meridyen-1.onrender.com').replace(/\/$/, '');
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/admin', '/api/'] }], sitemap: `${base}/sitemap.xml` };
}
