/**
 * E-şube veritabanı katmanı. Python sürümü her istekte sqlite3 bağlantısı açıp `with` bloğuyla
 * işlemi tamamlıyordu; burada aynı şey PostgreSQL üzerinde yapılır (ayrı `esube` şeması):
 *  - her istek tek işlem (transaction) içinde çalışır, hata olursa geri alınır, `conn.commit()` gerçekten commit eder;
 *  - SQL'deki `?` yer tutucuları PostgreSQL'in `$1, $2…` biçimine çevrilir;
 *  - SQLite yazıcıları sıraya sokuyordu; burada ilk yazma ifadesinde (INSERT/UPDATE/DELETE) tek bir
 *    danışma kilidi (advisory lock) alınarak aynı sıralı yazma davranışı korunur.
 */
import { Pool, PoolClient, types } from 'pg';
import { config } from '../config';
import { Row } from './common';

const LOCK_KEY = 7470001;

const parsers = {
  getTypeParser: (oid: number, format?: any) => {
    if (oid === 20) return (v: string) => Number(v); // int8
    if (oid === 1700) return (v: string) => parseFloat(v); // numeric
    return types.getTypeParser(oid as any, format);
  },
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      max: 12,
      types: parsers as any,
    });
    pool.on('connect', (client) => { client.query('SET search_path TO esube, public').catch(() => undefined); });
    pool.on('error', () => undefined);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) { const p = pool; pool = null; await p.end().catch(() => undefined); }
}

/** `?` → `$n` (tırnak içindekiler hariç). */
export function toPg(sql: string): string {
  let out = '';
  let n = 0;
  let q: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (q) {
      out += c;
      if (c === q) { if (sql[i + 1] === q) { out += sql[++i]; } else q = null; }
      continue;
    }
    if (c === "'" || c === '"') { q = c; out += c; continue; }
    if (c === '?') { out += '$' + (++n); continue; }
    out += c;
  }
  return out;
}

const norm = (v: any) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

export class Conn {
  private locked = false;
  constructor(readonly client: PoolClient) {}

  private async maybeLock(sql: string) {
    if (!this.locked && /^\s*(insert|update|delete)\b/i.test(sql)) await this.lock();
  }

  /** Yazma sırasını başlatır (SQLite'ın yazma kilidi gibi); işlem bitince ya da commit'te bırakılır. */
  async lock() {
    if (!this.locked) {
      await this.client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
      this.locked = true;
    }
  }

  async all(sql: string, params: any[] = []): Promise<Row[]> {
    await this.maybeLock(sql);
    const r = await this.client.query(toPg(sql), params.map(norm));
    return r.rows;
  }

  async get(sql: string, params: any[] = []): Promise<Row | undefined> {
    const rows = await this.all(sql, params);
    return rows[0];
  }

  /** Etkilenen satır sayısı. */
  async run(sql: string, params: any[] = []): Promise<number> {
    await this.maybeLock(sql);
    const r = await this.client.query(toPg(sql), params.map(norm));
    return r.rowCount ?? 0;
  }

  /** INSERT ... RETURNING id → cursor.lastrowid karşılığı. */
  async insert(sql: string, params: any[] = []): Promise<number> {
    await this.maybeLock(sql);
    const r = await this.client.query(toPg(sql) + ' RETURNING id', params.map(norm));
    return Number(r.rows[0].id);
  }

  /** conn.commit(): işlemi bitirir, yenisini açar. */
  async commit() {
    await this.client.query('COMMIT');
    await this.client.query('BEGIN');
    this.locked = false;
  }
}

/** `with connect_db() as conn:` — başarıda commit, hatada rollback. */
export async function withConn<T>(fn: (conn: Conn) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const conn = new Conn(client);
  try {
    await client.query('BEGIN');
    const result = await fn(conn);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* bağlantı koptuysa yok say */ }
    throw err;
  } finally {
    client.release();
  }
}
