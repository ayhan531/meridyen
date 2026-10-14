/**
 * API vekili: tarayıcı yalnızca bu siteyle konuşur (/api/...), istek NestJS servisine iletilir.
 * Böylece oturum çerezi aynı kökte kalır (Render'da iki servis farklı alan adlarında çalışır).
 * API adresi çalışma anında okunur: API_URL (ör. https://meridyen-api.onrender.com).
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_URL = () => (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const FORWARD_REQ = ['content-type', 'cookie', 'accept', 'user-agent', 'accept-language'];
const FORWARD_RES = ['content-type', 'cache-control', 'retry-after'];

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${API_URL()}/api/${path.map(encodeURIComponent).join('/')}${url.search}`;

  const headers = new Headers();
  for (const h of FORWARD_REQ) { const v = req.headers.get(h); if (v) headers.set(h, v); }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  if (ip) headers.set('x-forwarded-for', ip);

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  let res: Response;
  try {
    res = await fetch(target, { method: req.method, headers, body: hasBody ? await req.arrayBuffer() : undefined, redirect: 'manual', cache: 'no-store' });
  } catch {
    return Response.json({ message: 'Sunucu şu anda yanıt vermiyor. Biraz sonra yeniden deneyin.' }, { status: 502 });
  }

  const out = new Headers();
  for (const h of FORWARD_RES) { const v = res.headers.get(h); if (v) out.set(h, v); }
  for (const c of res.headers.getSetCookie()) out.append('set-cookie', c);
  return new Response(res.body, { status: res.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
