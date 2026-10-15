/**
 * Web Push (VAPID) — içeriksiz "uyandırma" bildirimi. Python sürümündeki webpush.py + push_* işlevlerinin karşılığı;
 * P-256 imzası Node'un yerleşik crypto modülüyle yapılır, anahtarlar Python sürümüyle aynı biçimdedir (base64url).
 */
import { createPrivateKey, generateKeyPairSync, sign } from 'crypto';
import { Conn, withConn } from './db';
import { cfg, now } from './common';

const b64 = (buf: Buffer) => buf.toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url');

export function generateKeys(): [string, string] {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' }) as { d: string; x: string; y: string };
  const raw = Buffer.concat([Buffer.from([4]), unb64(jwk.x), unb64(jwk.y)]);
  return [jwk.d, b64(raw)];
}

function es256(signingInput: string, privateB64: string, publicB64: string): Buffer {
  const raw = unb64(publicB64);
  const key = createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: privateB64, x: b64(raw.subarray(1, 33)), y: b64(raw.subarray(33, 65)) }, format: 'jwk' });
  return sign('sha256', Buffer.from(signingInput, 'ascii'), { key, dsaEncoding: 'ieee-p1363' });
}

const jwtCache = new Map<string, [number, string]>();

export function vapidHeader(endpoint: string, subject: string, privateB64: string, publicB64: string): string {
  const u = new URL(endpoint);
  const audience = `${u.protocol}//${u.host}`;
  const cached = jwtCache.get(audience);
  let token: string;
  if (cached && cached[0] > Date.now() / 1000) {
    token = cached[1];
  } else {
    const expires = now() + 12 * 60 * 60;
    const header = b64(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const payload = b64(Buffer.from(JSON.stringify({ aud: audience, exp: expires, sub: subject })));
    const signature = es256(`${header}.${payload}`, privateB64, publicB64);
    token = `${header}.${payload}.${b64(signature)}`;
    jwtCache.set(audience, [Date.now() / 1000 + 11 * 60 * 60, token]);
  }
  return `vapid t=${token}, k=${publicB64}`;
}

/** İçeriksiz push gönderir. 201/200 başarılı; 404/410 abonelik ölmüş demektir; 0: ağ hatası. */
export async function pushSend(endpoint: string, subject: string, privateB64: string, publicB64: string, ttl = 86400, timeoutMs = 10_000): Promise<number> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { TTL: String(ttl), Urgency: 'normal', Authorization: vapidHeader(endpoint, subject, privateB64, publicB64) },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.status;
  } catch {
    return 0;
  }
}

export async function pushKeys(conn: Conn): Promise<[string, string]> {
  const row = await conn.get('SELECT private_key, public_key FROM push_keys WHERE id=1');
  if (row) return [row.private_key, row.public_key];
  const [priv, pub] = generateKeys();
  await conn.run(
    'INSERT INTO push_keys (id, private_key, public_key, created_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET private_key=excluded.private_key, public_key=excluded.public_key, created_at=excluded.created_at',
    [priv, pub, now()],
  );
  await conn.commit();
  return [priv, pub];
}

const PUSH_CATEGORY_KEYS: Record<string, string> = {
  fiyat: 'price', price: 'price', haber: 'news', news: 'news',
  islem: 'trade', 'işlem': 'trade', emir: 'trade', trade: 'trade', referral: 'referral', referans: 'referral',
};

/** Kullanıcı o türü kapattıysa cihaza push gitmez; genel bildirimler hep gider. */
export function pushAllows(prefsJson: string, category: string): boolean {
  const key = PUSH_CATEGORY_KEYS[String(category || '').trim().toLowerCase()];
  if (!key || !prefsJson) return true;
  try {
    const prefs = JSON.parse(prefsJson);
    return prefs[key] === undefined ? true : !!prefs[key];
  } catch {
    return true;
  }
}

async function pushWorker(endpoints: string[], priv: string, pub: string): Promise<void> {
  const dead: string[] = [];
  for (const endpoint of endpoints) {
    const status = await pushSend(endpoint, cfg.pushSubject, priv, pub);
    if (status === 404 || status === 410) dead.push(endpoint);
  }
  if (!dead.length) return;
  try {
    await withConn(async (conn) => {
      for (const endpoint of dead) await conn.run('DELETE FROM push_subscriptions WHERE endpoint=?', [endpoint]);
    });
  } catch { /* yok say */ }
}

/** Kullanıcının kayıtlı cihazlarını uyandırır (arka planda; istek akışını bekletmez). */
export async function sendPush(conn: Conn, userId: number, category = 'genel'): Promise<void> {
  try {
    const rows = await conn.all('SELECT endpoint, prefs FROM push_subscriptions WHERE user_id=?', [userId]);
    if (!rows.length) return;
    const endpoints = rows.filter((r) => pushAllows(r.prefs, category)).map((r) => r.endpoint as string);
    if (!endpoints.length) return;
    const [priv, pub] = await pushKeys(conn);
    void pushWorker(endpoints, priv, pub);
  } catch { /* bildirim kaydı yazıldı; push başarısızlığı isteği düşürmemeli */ }
}
