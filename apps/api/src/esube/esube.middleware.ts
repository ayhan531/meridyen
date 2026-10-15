/** Express ara katmanı: Python AppHandler.dispatch'in karşılığı. Yalnız e-şube yollarını ele alır, gerisini Nest'e bırakır. */
import type { NextFunction, Request, Response } from 'express';
import { HttpError, ValueError } from './common';
import { corsHeaders, Ctx, Reply, SECURITY_HEADERS } from './ctx';
import { apiHealth, routeApi, serveUpload } from './router';

/** Meridyen'in kendi uçları; /api altında olsalar da e-şubeye girmezler. */
const MERIDYEN_PREFIXES = ['/api/auth', '/api/state', '/api/prices'];

function parseQuery(url: string): Record<string, string[]> {
  const i = url.indexOf('?');
  const out: Record<string, string[]> = {};
  if (i < 0) return out;
  const sp = new URLSearchParams(url.slice(i + 1).split('#')[0]);
  for (const [k, v] of sp) { if (v === '') continue; (out[k] ||= []).push(v); }   // parse_qs boş değerleri atar
  return out;
}

function send(req: Request, res: Response, reply: Reply) {
  const jsonLike = (reply.headers['Content-Type'] || '').startsWith('application/json');
  const headers: Record<string, string> = { ...(jsonLike ? corsHeaders(req) : {}), ...SECURITY_HEADERS, ...reply.headers };
  res.status(reply.status);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader('Content-Length', String(reply.body.length));
  res.end(reply.body);
}

const isMeridyen = (p: string) => MERIDYEN_PREFIXES.some((x) => p === x || p.startsWith(x + '/'));

export function esubeMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawPath = (req.originalUrl || req.url).split('?')[0];
    const path = rawPath.replace(/\/+$/, '') || '/';
    const method = req.method.toUpperCase();
    const healthPath = path === '/healthz' || path === '/api/health';
    const owned = healthPath && method === 'GET'
      || (path.startsWith('/api') && !isMeridyen(path))
      || path.startsWith('/uploads');
    if (!owned) return next();

    if (method === 'OPTIONS') {
      res.status(204);
      for (const [k, v] of Object.entries(corsHeaders(req))) res.setHeader(k, v);
      res.end();
      return;
    }
    if (method !== 'GET' && method !== 'POST') {
      res.status(501).type('text/plain').end(`Unsupported method ('${method}')`);
      return;
    }
    const ctx = new Ctx(req, method, path, parseQuery(req.originalUrl || req.url));
    try {
      let reply: Reply;
      if (method === 'GET' && healthPath) reply = await apiHealth(ctx);
      else if (path.startsWith('/api')) reply = await routeApi(ctx, method, path);
      else reply = await serveUpload(ctx, path);
      send(req, res, reply);
    } catch (err: any) {
      if (res.headersSent) return;
      if (err instanceof HttpError) return send(req, res, ctx.json({ error: err.message }, err.status));
      if (!(err instanceof ValueError)) console.error('Unhandled error:', err?.message ?? err);
      else console.error('Unhandled error:', err.message);
      send(req, res, ctx.json({ error: 'Sunucu hatası' }, 500));
    }
  };
}
