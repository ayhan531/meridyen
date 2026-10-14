import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },   // tanıtım sayfası /app'i kendi içinde gösterir
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/(img|fonts)/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    ];
  },
  /* Eski .html adresleri yeni sayfalara gider. */
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/giris.html', destination: '/giris', permanent: true },
      { source: '/kayit.html', destination: '/kayit', permanent: true },
      { source: '/app/index.html', destination: '/app', permanent: true },
    ];
  },
};

export default nextConfig;
