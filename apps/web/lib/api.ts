/** API istemcisi: istekler aynı kökten /api üzerinden gider (Next.js vekili API servisine iletir). */
export interface ApiErrorBody { message: string; errors?: Record<string, string>; field?: string; locked?: boolean; expired?: boolean }

export class ApiFail extends Error {
  constructor(public status: number, public body: ApiErrorBody) { super(body.message); }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; keepalive?: boolean } = {}): Promise<T> {
  const init: RequestInit = { method: opts.method || 'GET', credentials: 'same-origin', cache: 'no-store', keepalive: opts.keepalive };
  if (opts.body !== undefined) { init.headers = { 'content-type': 'application/json' }; init.body = JSON.stringify(opts.body); }
  let res: Response;
  try { res = await fetch('/api' + path, init); }
  catch { throw new ApiFail(0, { message: 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip yeniden deneyin.' }); }
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* JSON değil */ }
  if (!res.ok) {
    const b = (json && typeof json === 'object' ? json : {}) as Partial<ApiErrorBody>;
    throw new ApiFail(res.status, { ...b, message: b.message || (res.status >= 500 ? 'Sunucu şu anda yanıt vermiyor. Biraz sonra yeniden deneyin.' : 'İstek tamamlanamadı.') } as ApiErrorBody);
  }
  return json as T;
}
