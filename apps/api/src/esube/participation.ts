/** BIST Katılım Tüm endeksi üyeliği (Python: katilim_feed.py + backend_server.py participation_*). */
import { Conn, withConn } from './db';
import { cfg, gmDMY, httpBytes, isoTime, now, pyJson, Row, sleep } from './common';
import { PARTICIPATION_BUILTIN_TS, PARTICIPATION_SEED_SYMBOLS } from './participation-data';
import { setSystemSetting } from './settings';

const INDEX_CODE = 'XKTUM';
const MIN_SYMBOLS = 150;
const MAX_SHRINK = 0.30;
const NOTE_PREFIX = 'BIST Katilim';
const OLD_SEED_NOTE = 'Baslangic listesi - admin panelinden dogrulayin/guncelleyin';
const PARTICIPATION_STALE_SECONDS = 4 * 86400;

export class FeedValueError extends Error { name = 'ValueError'; }

export function parseCsv(text: string): [Set<string>, number] {
  const symbols = new Set<string>();
  let stamp = '';
  for (const line of text.split(LINE_BREAK)) {
    const parts = line.split(';');
    if (parts.length < 6 || parts[2].trim().toUpperCase() !== INDEX_CODE) continue;
    const code = parts[0].trim().split('.')[0].toUpperCase();
    if (/^[A-Z0-9]{2,8}$/.test(code)) symbols.add(code);
    stamp = stamp || parts[5].trim();
  }
  if (symbols.size < MIN_SYMBOLS) {
    throw new FeedValueError(`${INDEX_CODE} icin yalnizca ${symbols.size} sembol bulundu (en az ${MIN_SYMBOLS} beklenir); dosya bozuk ya da bicim degismis olabilir`);
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(stamp);
  if (!m) throw new FeedValueError(`liste tarihi okunamadi: '${stamp}'`);
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return [symbols, Date.UTC(y, mo - 1, d) / 1000];
}

const LINE_BREAK = new RegExp('\\r\\n|\\n|\\r|\\u000b|\\u000c|\\u001c|\\u001d|\\u001e|\\u0085|\\u2028|\\u2029');

const managed = (note: string | null | undefined) => {
  const n = note || '';
  return n === OLD_SEED_NOTE || n.startsWith(NOTE_PREFIX);
};

export async function applyList(conn: Conn, symbols: Set<string>, listTs: number): Promise<Row> {
  const date = gmDMY(listTs);
  const yesNote = `BIST Katilim Tum resmi listesi (${date})`;
  const noNote = `BIST Katilim Tum resmi listesinde yok (${date})`;
  const rows = new Map<string, [number, string | null]>();
  for (const r of await conn.all('SELECT symbol, compliant, note FROM participation_index ORDER BY symbol')) rows.set(r.symbol, [Math.trunc(Number(r.compliant)), r.note]);

  let previous = 0;
  for (const [compliant, note] of rows.values()) if (compliant && managed(note)) previous++;
  if (previous >= MIN_SYMBOLS && symbols.size < previous * (1 - MAX_SHRINK)) {
    throw new FeedValueError(`yeni liste (${symbols.size}) onceki listeden (${previous}) cok kucuk; supheli, uygulanmadi`);
  }
  const added: string[] = []; const removed: string[] = []; const kept: string[] = [];
  for (const symbol of [...symbols].sort()) {
    const was = rows.get(symbol);
    if (was && !managed(was[1])) { kept.push(symbol); continue; }
    if (!was || !was[0]) added.push(symbol);
    await conn.run(
      'INSERT INTO participation_index (symbol, compliant, note, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(symbol) DO UPDATE SET compliant=1, note=excluded.note, updated_at=excluded.updated_at',
      [symbol, yesNote, listTs],
    );
  }
  for (const [symbol, [compliant, note]] of rows) {
    if (symbols.has(symbol) || !managed(note)) continue;
    if (compliant) removed.push(symbol);
    await conn.run('UPDATE participation_index SET compliant=0, note=?, updated_at=? WHERE symbol=?', [noNote, listTs, symbol]);
  }
  return { total: symbols.size, added, removed, kept_manual: kept };
}

function safeParse(v: any): Row {
  try { const x = JSON.parse(v); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { return {}; }
}

export async function participationSyncStatus(conn: Conn): Promise<Row> {
  const row = await conn.get("SELECT setting_value FROM system_settings WHERE setting_key='participation_sync'");
  const status = row ? safeParse(row.setting_value) : {};
  const lastOk = Math.trunc(Number(status.last_ok_at) || 0);
  status.stale = !lastOk || now() - lastOk > PARTICIPATION_STALE_SECONDS;
  status.last_ok_label = lastOk ? isoTime(lastOk) : '';
  status.last_attempt_label = status.last_attempt_at ? isoTime(Math.trunc(Number(status.last_attempt_at))) : '';
  status.list_date_label = status.list_ts ? gmDMY(Math.trunc(Number(status.list_ts))) : '';
  return status;
}

async function saveStatus(conn: Conn, ok: boolean, source: string, result: Row | null, error: string, listTs: number | null, trusted = true) {
  const row = await conn.get("SELECT setting_value FROM system_settings WHERE setting_key='participation_sync'");
  const old = row ? safeParse(row.setting_value) : {};
  const status = {
    last_attempt_at: now(),
    last_ok_at: ok ? (trusted ? now() : 0) : (old.last_ok_at ?? 0),
    ok,
    source: ok ? source : (old.source ?? source),
    error: ok ? '' : Array.from(error).slice(0, 300).join(''),
    list_ts: ok ? listTs : (old.list_ts ?? null),
    total: ok && result ? result.total : (old.total ?? null),
    added: ok && result ? result.added.slice(0, 60) : (old.added ?? []),
    removed: ok && result ? result.removed.slice(0, 60) : (old.removed ?? []),
  };
  await setSystemSetting(conn, 'participation_sync', pyJson(status));
}

export async function syncParticipationIndex(text?: string | null, source = 'otomatik'): Promise<Row> {
  try {
    if (text === undefined || text === null) {
      const { body } = await httpBytes(cfg.participationFeedUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OttomanYatirim/1.0)' }, timeoutMs: 40_000, maxBytes: 8_000_000 });
      text = body.toString('utf-8');
    }
    const [symbols, listTs] = parseCsv(text);
    const result = await withConn(async (conn) => {
      const r = await applyList(conn, symbols, listTs);
      await saveStatus(conn, true, source, r, '', listTs);
      return r;
    });
    return { ok: true, ...result, list_ts: listTs };
  } catch (e: any) {
    const message = `${e?.name || 'Error'}: ${e?.message || e}`;
    try { await withConn((conn) => saveStatus(conn, false, source, null, message, null)); } catch { /* yoksay */ }
    return { ok: false, error: message };
  }
}

export async function seedParticipationIndex(conn: Conn): Promise<void> {
  if (await conn.get("SELECT 1 FROM system_settings WHERE setting_key='participation_sync'")) return;
  const result = await applyList(conn, new Set(PARTICIPATION_SEED_SYMBOLS), PARTICIPATION_BUILTIN_TS);
  await saveStatus(conn, true, 'gomulu liste (06.10.2026)', result, '', PARTICIPATION_BUILTIN_TS, false);
}

export function katilimiEsitle(): void {
  const run = async () => {
    await sleep(15_000);
    for (;;) {
      await syncParticipationIndex();
      await sleep(Math.max(600, cfg.participationSyncSeconds) * 1000);
    }
  };
  void run();
}
