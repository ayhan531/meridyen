/** Yönetici uçları (Python: AppHandler.api_admin_* ve admin_*_action). */
import * as fs from 'fs';
import * as path from 'path';
import { zipSync } from 'fflate';
import { withConn, Conn } from './db';
import {
  pyFloatCell, flt, cfg, fmt2, HttpError, isoTime, lookup, now, or0, pget, pyBool, pyFloat, pyInt, pyIntOfFloat, pyJson, pyRound, pyStr, Row, strip,
  SUSPENDED_MESSAGE, ValueError,
} from './common';
import { Ctx, Reply } from './ctx';
import { audit } from './audit';
import { hashPassword, identityNumberIsReal, passwordIsStrong, turkishIban, verifyPassword } from './security';
import { createNotification, notifyReferralsOfSale } from './notify';
import { settingsMap } from './settings';
import { findQuote, marketStatus } from './market';
import { participationSyncStatus, syncParticipationIndex } from './participation';
import {
  accountFor, adminPositionRows, creditSaleProceeds, documentRows, filteredTransactions, moneyRows, orderRows, positionAvgPrice,
  positionQuantity, publicUser, Query, reducePosition, releaseOrderReservation, settleDueT2, settleOneT2, syncUserKyc,
  systemBankAccountRows, t2SettlementRows, transactionRows, upsertPosition, userBankAccountRows, writeTransaction,
} from './trading';

const ok = (ctx: Ctx, data: any = { ok: true }, status = 200, extra: Record<string, string> = {}) => ctx.json(data, status, extra);
const plen = (s: string) => Array.from(s).length;
const sl = (s: string, n: number) => (plen(s) <= n ? s : Array.from(s).slice(0, n).join(''));
/** str(payload.get(key, default)).strip()[:n] */
const sfield = (p: Row, key: string, n: number, dflt: any = '') => sl(strip(pyStr(pget(p, key, dflt))), n);
const symbolOf = (v: any) => pyStr(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
const TRUTHY = new Set(['1', 'true', 'on', 'yes']);
const USER_STATUSES = new Set(['pending', 'under_review', 'awaiting_back', 'approved', 'rejected', 'suspended']);
/** Python float repr'inde tam sayı değerleri ".0" taşır (CSV hücreleri için). */
const pf = pyFloatCell;
const gmRef = (id: any, w: number, prefix: string) => `${prefix}${String(Math.trunc(Number(id))).padStart(w, '0')}`;
/** `x or default` ile int(...) */
const intOr0 = (v: any) => pyInt(or0(v));
const floatOr0 = (v: any) => pyFloat(or0(v));

const AUDIT_JOIN = 'SELECT a.*, u.full_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id';

/* ------------------------------------------------------------ özet / listeler */

export async function apiAdminStepUp(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    if (!(await verifyPassword(pyStr(pget(payload, 'password', '')), admin.password_salt, admin.password_hash))) throw new HttpError(401, 'Admin şifresi hatalı');
    await conn.run('UPDATE sessions SET step_up_until=? WHERE sid=?', [now() + 600, ctx.sessionId()]);
    await audit(conn, admin.id, 'admin_step_up', 'session', null, null, ctx.ip(), ctx.ua());
    await conn.commit();
    return ok(ctx, { ok: true, valid_for_seconds: 600 });
  });
}

async function count(conn: Conn, sql: string): Promise<number> {
  return (await conn.get(sql))!.c;
}

export async function apiAdminSummary(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await settleDueT2(conn);
    const admin = await ctx.requireAdmin(conn);
    const counts = {
      users: await count(conn, "SELECT COUNT(*) AS c FROM users WHERE role='user'"),
      pending_users: await count(conn, "SELECT COUNT(*) AS c FROM users WHERE role='user' AND status='pending'"),
      pending_orders: await count(conn, "SELECT COUNT(*) AS c FROM orders WHERE status='pending'"),
      pending_money: await count(conn, "SELECT COUNT(*) AS c FROM money_requests WHERE status='pending'"),
      pending_deposits: await count(conn, "SELECT COUNT(*) AS c FROM money_requests WHERE request_type='deposit' AND status='pending'"),
      pending_withdrawals: await count(conn, "SELECT COUNT(*) AS c FROM money_requests WHERE request_type='withdraw' AND status='pending'"),
      pending_t2: await count(conn, "SELECT COUNT(*) AS c FROM t2_settlements WHERE status='pending'"),
      cash_total: await count(conn, 'SELECT COALESCE(SUM(cash_balance),0) AS c FROM accounts'),
      blocked_total: await count(conn, 'SELECT COALESCE(SUM(blocked_balance),0) AS c FROM accounts'),
      pending_balance_total: await count(conn, 'SELECT COALESCE(SUM(pending_balance),0) AS c FROM accounts'),
    };
    await audit(conn, admin.id, 'view_summary', 'report', null);
    return ok(ctx, { summary: counts });
  });
}

const BALANCE_SUBQUERIES = `
  (SELECT COALESCE(SUM(o2.cash_reserved + o2.pending_reserved), 0) FROM orders o2 WHERE o2.user_id=u.id AND o2.status='pending') AS orders_reserved,
  (SELECT COALESCE(SUM(m2.amount), 0) FROM money_requests m2 WHERE m2.user_id=u.id AND m2.request_type='withdraw' AND m2.status='pending') AS pending_withdrawals`;

export async function apiAdminUsers(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    const rows = await conn.all(`
      SELECT u.*, a.cash_balance, a.blocked_balance, a.pending_balance, a.credit_limit,
        ${BALANCE_SUBQUERIES},
        (SELECT COUNT(*) FROM documents d WHERE d.user_id=u.id) AS document_count,
        (SELECT COUNT(*) FROM documents d WHERE d.user_id=u.id AND d.doc_type='identity_front') AS has_front,
        (SELECT COUNT(*) FROM documents d WHERE d.user_id=u.id AND d.doc_type='identity_back') AS has_back,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS order_count,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id AND o.side='buy') AS buy_count,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id AND o.side='sell') AS sell_count,
        (SELECT COUNT(*) FROM user_transactions t WHERE t.user_id=u.id) AS transaction_count
      FROM users u
      LEFT JOIN accounts a ON a.user_id=u.id
      WHERE u.role='user'
      ORDER BY u.created_at DESC`);
    return ok(ctx, { users: rows.map((r) => publicUser({ ...r }, true)) });
  });
}

export async function apiAdminOrders(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => { await ctx.requireAdmin(conn); return ok(ctx, { orders: await orderRows(conn, '', []) }); });
}

export async function apiAdminMoney(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => { await ctx.requireAdmin(conn); return ok(ctx, { money_requests: await moneyRows(conn, '', []) }); });
}

export async function apiAdminReports(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    const orderTotals = await conn.all('SELECT side, status, COUNT(*) AS count, COALESCE(SUM(total),0) AS total FROM orders GROUP BY side, status');
    const moneyTotals = await conn.all('SELECT request_type, status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM money_requests GROUP BY request_type, status');
    const usersByStatus = await conn.all("SELECT status, COUNT(*) AS count FROM users WHERE role='user' GROUP BY status");
    const auditRows = (await conn.all(`${AUDIT_JOIN} ORDER BY a.created_at DESC LIMIT 120`)).map((r) => ({ ...r }));
    for (const row of auditRows) {
      row.created_at_label = isoTime(row.created_at);
      row.reference = gmRef(row.id, 8, 'GM-DNT-');
    }
    const accountTotals = await conn.get('SELECT COALESCE(SUM(cash_balance),0) AS cash, COALESCE(SUM(blocked_balance),0) AS blocked, COALESCE(SUM(pending_balance),0) AS pending, COALESCE(SUM(credit_limit),0) AS credit FROM accounts');
    const transactionTotals = await conn.all('SELECT transaction_type, COUNT(*) AS count, COALESCE(SUM(total),0) AS total FROM user_transactions GROUP BY transaction_type');
    return ok(ctx, { orders: orderTotals, money: moneyTotals, users: usersByStatus, audit: auditRows, reconciliation: { ...accountTotals }, transactions: transactionTotals });
  });
}

export async function apiAdminReportsExport(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    const exportType = ctx.q('type') || 'transactions';
    if (exportType === 'audit') {
      const rows = await conn.all(`${AUDIT_JOIN} ORDER BY a.created_at DESC LIMIT 5000`);
      return ctx.csv('denetim-kaydi.csv', ['Referans', 'Tarih', 'Yetkili', 'İşlem', 'Varlık', 'Varlık No', 'IP', 'Detay'],
        rows.map((r) => [gmRef(r.id, 8, 'GM-DNT-'), isoTime(r.created_at), r.actor_name || 'Sistem', r.action, r.entity_type, r.entity_id || '', r.ip_address, r.payload]));
    }
    const rows = await filteredTransactions(conn, null, ctx.query as Query);
    return ctx.csv('mutabakat-hareketleri.csv', ['Referans', 'Tarih', 'Müşteri', 'İşlem', 'Sembol', 'Adet', 'Fiyat', 'Tutar', 'Önceki Bakiye', 'Sonraki Bakiye', 'Açıklama'],
      rows.map((r) => [r.reference, r.created_at_label, r.full_name, r.type_label, r.code, r.quantity, pf(r.price), pf(r.total), pf(r.balance_before), pf(r.balance_after), r.note]));
  });
}

export async function apiAdminContactMessages(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    const rows = await conn.all('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 500');
    return ok(ctx, { messages: rows.map((r) => ({ ...r, reference: gmRef(r.id, 6, 'GM-DST-'), created_at_label: isoTime(r.created_at) })) });
  });
}

export async function apiAdminDocuments(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => { await ctx.requireAdmin(conn); return ok(ctx, { documents: await documentRows(conn) }); });
}

/* ------------------------------------------------------------- banka hesapları */

export async function apiAdminBankAccounts(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    return ok(ctx, { system_bank_accounts: await systemBankAccountRows(conn, false), user_bank_accounts: await userBankAccountRows(conn) });
  });
}

export async function apiAdminSaveSystemBankAccount(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const bankId = intOr0(pget(payload, 'id', 0));
  const bankName = sfield(payload, 'bank_name', 120);
  const accountHolder = sfield(payload, 'account_holder', 120);
  const iban = turkishIban(pyStr(pget(payload, 'iban', '')));
  const branchName = sfield(payload, 'branch_name', 120);
  const description = sfield(payload, 'description', 240);
  const isActive = TRUTHY.has(pyStr(pget(payload, 'is_active', '1')).toLowerCase()) ? 1 : 0;
  const sortOrder = pyIntOfFloat(or0(pget(payload, 'sort_order', 0)));
  if (!bankName || !accountHolder || !iban) throw new HttpError(400, "Banka adı, hesap sahibi ve geçerli Türkiye IBAN'ı gerekli");
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    let targetId: number;
    if (bankId) {
      await conn.run('UPDATE system_bank_accounts SET bank_name=?, account_holder=?, iban=?, branch_name=?, description=?, is_active=?, sort_order=? WHERE id=?',
        [bankName, accountHolder, iban, branchName, description, isActive, sortOrder, bankId]);
      targetId = bankId;
    } else {
      targetId = await conn.insert(
        'INSERT INTO system_bank_accounts (bank_name, account_holder, iban, branch_name, description, is_active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [bankName, accountHolder, iban, branchName, description, isActive, sortOrder, now()]);
    }
    await audit(conn, admin.id, 'save_system_bank_account', 'system_bank_account', targetId);
    await conn.commit();
    return ok(ctx, { bank_accounts: await systemBankAccountRows(conn, false) });
  });
}

export async function apiAdminBankAccountAction(ctx: Ctx, bankId: number): Promise<Reply> {
  const payload = await ctx.readObject();
  const action = pyStr(pget(payload, 'action', 'toggle')).toLowerCase();
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    const row = await conn.get('SELECT * FROM system_bank_accounts WHERE id=?', [bankId]);
    if (!row) throw new HttpError(404, 'Banka hesabı bulunamadı');
    if (action === 'delete') await conn.run('DELETE FROM system_bank_accounts WHERE id=?', [bankId]);
    else await conn.run('UPDATE system_bank_accounts SET is_active=? WHERE id=?', [Math.trunc(Number(row.is_active)) ? 0 : 1, bankId]);
    await audit(conn, admin.id, `${action}_system_bank_account`, 'system_bank_account', bankId);
    await conn.commit();
    return ok(ctx, { bank_accounts: await systemBankAccountRows(conn, false) });
  });
}

/* ------------------------------------------------------------------- T+2 */

export async function apiAdminT2Settlements(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await settleDueT2(conn);
    await ctx.requireAdmin(conn);
    return ok(ctx, { t2_settlements: await t2SettlementRows(conn, '') });
  });
}

export async function apiAdminSettleT2(ctx: Ctx, settlementId: number): Promise<Reply> {
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    await settleOneT2(conn, settlementId);
    await audit(conn, admin.id, 'manual_settle_t2', 't2_settlement', settlementId);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiAdminDeleteT2(ctx: Ctx, settlementId: number): Promise<Reply> {
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    const kayit = await conn.get('SELECT * FROM t2_settlements WHERE id=?', [settlementId]);
    if (!kayit) throw new HttpError(404, 'Kayıt bulunamadı');
    if (kayit.status === 'pending') {
      await conn.run('UPDATE accounts SET pending_balance=GREATEST(0, pending_balance-?) WHERE user_id=?', [pyFloat(or0(kayit.remaining_amount)), kayit.user_id]);
    }
    await conn.run('DELETE FROM t2_settlements WHERE id=?', [settlementId]);
    await audit(conn, admin.id, 'delete_t2', 't2_settlement', settlementId);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiAdminTransactions(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => { await ctx.requireAdmin(conn); return ok(ctx, { transactions: await transactionRows(conn, '') }); });
}

export async function apiAdminPositions(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => { await ctx.requireAdmin(conn); return ok(ctx, { positions: await adminPositionRows(conn) }); });
}

export async function apiAdminUserBalances(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await settleDueT2(conn);
    await ctx.requireAdmin(conn);
    const rows = await conn.all(`
      SELECT u.id, u.account_no, u.full_name, u.email, u.city, u.district, u.status, a.cash_balance, a.blocked_balance, a.pending_balance, a.credit_limit,
        ${BALANCE_SUBQUERIES}
      FROM users u
      LEFT JOIN accounts a ON a.user_id=u.id
      WHERE u.role='user'
      ORDER BY u.created_at DESC`);
    return ok(ctx, { balances: rows });
  });
}

/* ------------------------------------------------------------------ ayarlar */

export async function apiAdminSystemSettings(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => { await ctx.requireAdmin(conn); return ok(ctx, { settings: await settingsMap(conn) }); });
}

const SETTING_PREFIXES = ['trading_', 'maintenance_', 'credit_', 't2_', 'commission_', 'minimum_', 'official_', 'brand_', 'ui_', 'content_', 'price_', 'market_'];
const UPSERT_SETTING = `INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at`;

export async function apiAdminSaveSystemSettings(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    for (const [key, value] of Object.entries(payload)) {
      if (!SETTING_PREFIXES.some((p) => key.startsWith(p))) continue;
      await conn.run(UPSERT_SETTING, [key, pyStr(value), now()]);
    }
    if (!cfg.allowPriceSimulation) await conn.run("UPDATE system_settings SET setting_value='0', updated_at=? WHERE setting_key='price_simulation'", [now()]);
    if (((await settingsMap(conn)).t2_enabled ?? '0') !== '1') await settleDueT2(conn);
    await audit(conn, admin.id, 'save_system_settings', 'system_settings', null);
    await conn.commit();
    return ok(ctx, { settings: await settingsMap(conn) });
  });
}

/* ----------------------------------------------------- proje / APK dışa aktarma */

const PROJECT_ROOT = () => path.resolve(process.env.PROJECT_EXPORT_ROOT || path.join(process.cwd(), '..', '..'));
const SECURITY_DL: Record<string, string> = {};
const apkIn = (root: string, name: string) => { const p = path.join(root, name); try { return fs.statSync(p).isFile() ? p : null; } catch { return null; } };

function walk(root: string, rel: string[], excludedDirs: Set<string>, out: Array<[string[], string]>) {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(path.join(root, ...rel), { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) { if (!excludedDirs.has(e.name)) walk(root, [...rel, e.name], excludedDirs, out); } else if (e.isFile()) out.push([[...rel, e.name], path.join(root, ...rel, e.name)]);
  }
}

export async function apiAdminProjectExport(ctx: Ctx): Promise<Reply> {
  const [settings, adminId] = await withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    const s = await settingsMap(conn);
    const brand = strip(s.brand_name ?? 'Ottoman');
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'investment-platform';
    await audit(conn, admin.id, `export_project_${slug}`, 'system_settings', null);
    await conn.commit();
    return [s, admin.id] as const;
  });
  void adminId;
  const brandName = strip(settings.brand_name ?? 'Ottoman');
  const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'investment-platform';
  const root = PROJECT_ROOT();
  const excludedDirs = new Set(['node_modules', '.git', 'artifacts', '.gradle', 'build', '.next', 'dist', 'coverage']);
  const excludedFiles = new Set(['.env', '.env.local', 'local.properties']);
  const zenith = apkIn(root, 'Zenith-Menkul-Degerler.apk');
  const ottoman = apkIn(root, 'Ottoman-Esube.apk');
  const matchingApk = slug.includes('zenith') && zenith ? zenith : slug.includes('ottoman') && ottoman ? ottoman : ottoman;
  const exportSettings: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) if (['brand_', 'ui_', 'content_', 'official_', 'commission_', 'minimum_', 'trading_', 't2_', 'credit_'].some((p) => k.startsWith(p))) exportSettings[k] = v;
  const files: Array<[string[], string]> = [];
  walk(root, [], excludedDirs, files);
  const zipped: Record<string, Uint8Array> = {};
  const MAX_FILE = 25 * 1024 * 1024;
  for (const [rel, abs] of files) {
    const name = rel[rel.length - 1];
    if (excludedFiles.has(name) || rel.join('/') === 'render.yaml') continue;
    if (name.endsWith('.apk') && (!matchingApk || abs !== matchingApk)) continue;
    let st: fs.Stats;
    try { st = fs.statSync(abs); } catch { continue; }
    if (st.size > MAX_FILE) continue;
    zipped[`${slug}/${rel.join('/')}`] = new Uint8Array(fs.readFileSync(abs));
  }
  const te = (s: string) => new TextEncoder().encode(s);
  zipped[`${slug}/render.yaml`] = te(`services:
  - type: web
    runtime: node
    name: ${slug}
    buildCommand: npm ci && npm run build
    startCommand: npm run start
    healthCheckPath: /healthz
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: PUBLIC_BASE_URL
        sync: false
      - key: ADMIN_TC
        sync: false
      - key: ADMIN_PASSWORD
        sync: false
      - key: REQUIRE_LIVE_MARKET_FOR_TRADING
        value: "1"
      - key: ALLOW_PRICE_SIMULATION
        value: "0"
`);
  zipped[`${slug}/brand-config.json`] = te(pyJson(exportSettings));
  zipped[`${slug}/RENDER-DEPLOY.md`] = te(`# ${brandName} Render Dağıtım Kılavuzu\n\n1. Bu paketi Git deposuna pushlayın.\n2. Render Dashboard > New > Blueprint seçeneğine tıklayın.\n3. Depoyu bağlayın; render.yaml servisi otomatik kurar.\n4. Sistemde admin şifresini Render Environment Variables altından ADMIN_PASSWORD olarak belirleyin.\n5. Veriler PostgreSQL veritabanında (DATABASE_URL) saklanır.\n6. Uygulama APK'sı proje kök dizininde yer almaktadır.\n`);
  const body = Buffer.from(zipSync(zipped, { level: 6 }));
  return { status: 200, headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${slug}-fullstack-project.zip"`, ...SECURITY_DL }, body };
}

export async function apiAdminProjectExportApk(ctx: Ctx): Promise<Reply> {
  const brand = ctx.q('brand').toLowerCase();
  const root = PROJECT_ROOT();
  const zenith = apkIn(root, 'Zenith-Menkul-Degerler.apk');
  const ottoman = apkIn(root, 'Ottoman-Esube.apk');
  let apkPath: string; let filename: string;
  if (brand === 'zenith' && zenith) { apkPath = zenith; filename = 'Zenith-Menkul-Degerler.apk'; }
  else if (brand === 'ottoman' && ottoman) { apkPath = ottoman; filename = 'Ottoman-Esube.apk'; }
  else {
    const activeBrand = (await withConn(async (conn) => (await settingsMap(conn)).brand_name ?? '')).toUpperCase();
    if (activeBrand.includes('ZENITH') && zenith) { apkPath = zenith; filename = 'Zenith-Menkul-Degerler.apk'; }
    else if (ottoman) { apkPath = ottoman; filename = 'Ottoman-Esube.apk'; }
    else throw new HttpError(404, "APK dosyasi bulunamadi. Once 'npm run android:apk' ile derleyin.");
  }
  await withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await audit(conn, admin.id, `export_project_apk_${filename}`, 'system_settings', null);
    await conn.commit();
  });
  return { status: 200, headers: { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': `attachment; filename="${filename}"` }, body: fs.readFileSync(apkPath) };
}

/* ----------------------------------------------------- hisse açıklama / adları */

export async function apiAdminStockDescriptions(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    return ok(ctx, { descriptions: await conn.all('SELECT * FROM stock_descriptions ORDER BY symbol ASC') });
  });
}

export async function apiAdminSaveStockDescription(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const symbol = symbolOf(pget(payload, 'symbol', ''));
  const description = sfield(payload, 'description', 1000);
  const riskNote = sfield(payload, 'risk_note', 500);
  if (!symbol) throw new HttpError(400, 'Hisse kodu gerekli');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await conn.run(`INSERT INTO stock_descriptions (symbol, description, risk_note, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET description=excluded.description, risk_note=excluded.risk_note, updated_at=excluded.updated_at`, [symbol, description, riskNote, now()]);
    await audit(conn, admin.id, 'save_stock_description', 'stock_description', null, { symbol });
    await conn.commit();
    return ok(ctx);
  });
}

const searchClause = (arama: string, first: string, withWhere: boolean): [string, string[]] => {
  if (!arama) return ['', []];
  const like = `%${arama}%`;
  return [withWhere ? ` WHERE ${first} ` : ` AND (${first})`, [like, like]];
};

export async function apiAdminStockNames(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    const arama = strip(ctx.q('q')).toUpperCase();
    const [kosul, params] = searchClause(arama, 'm.symbol ILIKE ? OR UPPER(m.name) LIKE ?', true);
    const rows = await conn.all(
      'SELECT m.symbol, m.name, m.asset_class, n.name AS custom_name, n.updated_at AS custom_at FROM market_cache m LEFT JOIN instrument_names n ON n.symbol=m.symbol' + kosul + ' ORDER BY m.symbol ASC', params);
    const toplam = await count(conn, 'SELECT COUNT(*) AS c FROM market_cache');
    const duzenlenen = await count(conn, 'SELECT COUNT(*) AS c FROM instrument_names');
    return ok(ctx, {
      total: toplam, edited: duzenlenen,
      names: rows.map((r) => ({ symbol: r.symbol, name: r.name || r.symbol, asset_class: r.asset_class, custom: pyBool(r.custom_name), updated_at: r.custom_at ? isoTime(r.custom_at) : '' })),
    });
  });
}

export async function apiAdminSaveStockName(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const symbol = symbolOf(pget(payload, 'symbol', ''));
  const name = sfield(payload, 'name', 120);
  if (!symbol) throw new HttpError(400, 'Hisse kodu gerekli');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    if (!(await conn.get('SELECT 1 FROM market_cache WHERE symbol=?', [symbol]))) throw new HttpError(404, 'Bu kodla bir enstrüman yok');
    if (name) {
      await conn.run('INSERT INTO instrument_names (symbol, name, updated_at) VALUES (?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at', [symbol, name, now()]);
      await conn.run('UPDATE market_cache SET name=? WHERE symbol=?', [name, symbol]);
    } else {
      await conn.run('DELETE FROM instrument_names WHERE symbol=?', [symbol]);
    }
    await audit(conn, admin.id, 'save_stock_name', 'instrument', null, { symbol, name });
    await conn.commit();
    return ok(ctx, { ok: true, symbol, name });
  });
}

/* ------------------------------------------------------ katılım endeksi */

export async function apiAdminParticipationList(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    const arama = strip(ctx.q('q')).toUpperCase();
    const [kosul, params] = searchClause(arama, 'm.symbol ILIKE ? OR UPPER(m.name) LIKE ?', false);
    const rows = await conn.all(
      'SELECT m.symbol, m.name, m.asset_class, COALESCE(p.compliant, 0) AS compliant, p.note AS note, p.updated_at AS updated_at'
      + " FROM market_cache m LEFT JOIN participation_index p ON p.symbol = m.symbol WHERE m.asset_class='stock'" + kosul
      + ' ORDER BY compliant DESC, m.symbol ASC', params);
    const toplam = await count(conn, 'SELECT COUNT(*) AS c FROM participation_index WHERE compliant=1');
    return ok(ctx, {
      compliant_total: toplam,
      sync: await participationSyncStatus(conn),
      items: rows.map((r) => ({ symbol: r.symbol, name: r.name || r.symbol, compliant: pyBool(r.compliant), note: r.note || '', updated_at: r.updated_at ? isoTime(r.updated_at) : '' })),
    });
  });
}

export async function apiAdminSaveParticipation(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const symbol = symbolOf(pget(payload, 'symbol', ''));
  const compliant = pyBool(payload.compliant) ? 1 : 0;
  const note = sfield(payload, 'note', 300);
  if (!symbol) throw new HttpError(400, 'Hisse kodu gerekli');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    if (!(await conn.get('SELECT 1 FROM market_cache WHERE symbol=?', [symbol]))) throw new HttpError(404, 'Bu kodla bir enstrüman yok');
    await conn.run('INSERT INTO participation_index (symbol, compliant, note, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET compliant=excluded.compliant, note=excluded.note, updated_at=excluded.updated_at', [symbol, compliant, note, now()]);
    await audit(conn, admin.id, 'save_participation', 'instrument', null, { symbol, compliant });
    await conn.commit();
    return ok(ctx, { ok: true, symbol, compliant: !!compliant });
  });
}

export async function apiAdminParticipationSync(ctx: Ctx): Promise<Reply> {
  const admin = await withConn((conn) => ctx.requireAdmin(conn));
  const sonuc = await syncParticipationIndex(null, 'admin (elle tetiklendi)');
  return withConn(async (conn) => {
    await audit(conn, admin.id, 'participation_sync', 'instrument', null, { ok: sonuc.ok });
    await conn.commit();
    return ok(ctx, { ...sonuc, sync: await participationSyncStatus(conn) });
  });
}

export async function apiAdminParticipationImport(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const text = pyStr(pget(payload, 'text', ''));
  if (plen(text) < 1000) throw new HttpError(400, 'Dosya icerigi bos ya da cok kisa');
  const admin = await withConn((conn) => ctx.requireAdmin(conn));
  const sonuc = await syncParticipationIndex(sl(text, 8_000_000), 'admin (dosya yuklendi)');
  return withConn(async (conn) => {
    await audit(conn, admin.id, 'participation_import', 'instrument', null, { ok: sonuc.ok });
    await conn.commit();
    if (!sonuc.ok) throw new HttpError(422, sonuc.error ?? 'Dosya uygulanamadi');
    return ok(ctx, { ...sonuc, sync: await participationSyncStatus(conn) });
  });
}

/* ----------------------------------------------------------------- fiyatlar */

export async function apiAdminPrices(ctx: Ctx): Promise<Reply> {
  const arama = strip(ctx.q('q')).toUpperCase();
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    const [kosul, params] = searchClause(arama, 'm.symbol ILIKE ? OR UPPER(m.name) LIKE ?', true);
    const rows = await conn.all(
      'SELECT m.symbol, m.name, m.price, m.change_pct, m.asset_class, m.updated_at, e.price AS manual_price, e.change_pct AS manual_change, e.updated_at AS manual_at'
      + ' FROM market_cache m LEFT JOIN instrument_prices e ON e.symbol=m.symbol' + kosul + ' ORDER BY m.symbol ASC LIMIT 1000', params);
    const elle = await count(conn, 'SELECT COUNT(*) AS c FROM instrument_prices');
    const ayarlar = await settingsMap(conn);
    return ok(ctx, {
      feed_enabled: (ayarlar.market_feed_enabled ?? '1') !== '0',
      manual_count: elle,
      total: await count(conn, 'SELECT COUNT(*) AS c FROM market_cache'),
      status: await marketStatus(conn),
      prices: rows.map((r) => ({
        symbol: r.symbol, name: r.name || r.symbol, price: r.price, change_pct: r.change_pct, asset_class: r.asset_class,
        manual: r.manual_price !== null && r.manual_price !== undefined, updated_at: isoTime(r.manual_at || r.updated_at),
      })),
    });
  });
}

export async function apiAdminSavePrice(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const symbol = symbolOf(pget(payload, 'symbol', ''));
  const hamFiyat = strip(pyStr(pget(payload, 'price', ''))).replace(/\./g, '').replace(/,/g, '.');
  const hamDegisim = strip(pyStr(pget(payload, 'change_pct', ''))).replace(/,/g, '.');
  if (!symbol) throw new HttpError(400, 'Hisse kodu gerekli');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    const satir = await conn.get('SELECT * FROM market_cache WHERE symbol=?', [symbol]);
    if (!satir) throw new HttpError(404, 'Bu kodla bir enstrüman yok');
    if (hamFiyat === '') {
      await conn.run('DELETE FROM instrument_prices WHERE symbol=?', [symbol]);
      await audit(conn, admin.id, 'reset_price', 'instrument', null, { symbol });
      await conn.commit();
      return ok(ctx, { ok: true, symbol, manual: false });
    }
    let fiyat: number; let degisim: number;
    try { fiyat = pyFloat(hamFiyat); degisim = hamDegisim ? pyFloat(hamDegisim) : 0.0; } catch (e) {
      if (e instanceof ValueError) throw new HttpError(400, 'Fiyat sayı olmalı');
      throw e;
    }
    if (!(fiyat > 0 && fiyat <= 10_000_000)) throw new HttpError(400, 'Fiyat 0 ile 10.000.000 arasında olmalı');
    await conn.run('INSERT INTO instrument_prices (symbol, price, change_pct, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET price=excluded.price, change_pct=excluded.change_pct, updated_at=excluded.updated_at', [symbol, fiyat, degisim, now()]);
    await conn.run('UPDATE market_cache SET price=?, change_pct=?, updated_at=? WHERE symbol=?', [fiyat, degisim, now(), symbol]);
    await audit(conn, admin.id, 'set_price', 'instrument', null, { symbol, price: flt(fiyat) });
    await conn.commit();
    return ok(ctx, { ok: true, symbol, price: fiyat, manual: true });
  });
}

export async function apiAdminFeedSwitch(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const acik = pyBool(payload.enabled);
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    await conn.run(UPSERT_SETTING, ['market_feed_enabled', acik ? '1' : '0', now()]);
    await audit(conn, admin.id, 'market_feed_' + (acik ? 'on' : 'off'), 'system_settings', null);
    await conn.commit();
    return ok(ctx, { ok: true, feed_enabled: acik });
  });
}

/* ----------------------------------------------- müşteri oluşturma / şifre / oturum */

export async function apiAdminCreateUser(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const tc = pyStr(pget(payload, 'tc', '')).replace(/\D/g, '');
  const fullName = sfield(payload, 'full_name', 120);
  const phone = sfield(payload, 'phone', 40);
  const email = sfield(payload, 'email', 120);
  const city = sfield(payload, 'city', 80);
  const district = sfield(payload, 'district', 80);
  const password = pyStr(pget(payload, 'password', ''));
  const status = strip(pyStr(pget(payload, 'status', 'pending'))) || 'pending';
  const opening = floatOr0(pget(payload, 'opening_balance', 0));
  if (!identityNumberIsReal(tc)) throw new HttpError(400, 'T.C. kimlik numarası algoritmaya uymuyor');
  if (!fullName || !phone) throw new HttpError(400, 'Ad soyad ve telefon gerekli');
  if (!passwordIsStrong(password)) throw new HttpError(400, 'Şifre en az 10 karakter olmalı; büyük harf, küçük harf ve rakam içermeli');
  if (!USER_STATUSES.has(status)) throw new HttpError(400, 'Durum hatalı');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    if (await conn.get('SELECT id FROM users WHERE tc=?', [tc])) throw new HttpError(409, 'Bu T.C. ile kayıt var');
    const [salt, digest] = await hashPassword(password);
    const uid = await conn.insert(
      "INSERT INTO users (tc, password_salt, password_hash, full_name, phone, email, city, district, role, status, kyc_status, kyc_note, created_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?, '', ?, ?)",
      [tc, salt, digest, fullName, phone, email, city, district, status, status === 'approved' ? 'approved' : 'pending', now(), status === 'approved' ? now() : null]);
    await conn.run('INSERT INTO accounts (user_id, cash_balance, blocked_balance, credit_limit) VALUES (?, ?, 0, 0) ON CONFLICT DO NOTHING', [uid, opening]);
    if (opening) await conn.run('UPDATE accounts SET cash_balance=? WHERE user_id=?', [opening, uid]);
    await audit(conn, admin.id, 'create_user', 'user', uid, { tc: tc.slice(0, 3) + '*****' });
    await conn.commit();
    return ok(ctx, { ok: true, id: uid }, 201);
  });
}

export async function apiAdminSetPassword(ctx: Ctx, userId: number): Promise<Reply> {
  const payload = await ctx.readObject();
  const password = pyStr(pget(payload, 'password', ''));
  if (!passwordIsStrong(password)) throw new HttpError(400, 'Şifre en az 10 karakter olmalı; büyük harf, küçük harf ve rakam içermeli');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    if (!(await conn.get("SELECT 1 FROM users WHERE id=? AND role='user'", [userId]))) throw new HttpError(404, 'Kullanıcı bulunamadı');
    const [salt, digest] = await hashPassword(password);
    await conn.run('UPDATE users SET password_salt=?, password_hash=?, failed_login_count=0, locked_until=0 WHERE id=?', [salt, digest, userId]);
    await conn.run('DELETE FROM sessions WHERE user_id=?', [userId]);
    await audit(conn, admin.id, 'reset_password', 'user', userId);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiAdminUserSessions(ctx: Ctx, userId: number): Promise<Reply> {
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    if (!(await conn.get("SELECT 1 FROM users WHERE id=? AND role='user'", [userId]))) throw new HttpError(404, 'Kullanıcı bulunamadı');
    const rows = await conn.all('SELECT sid, created_at, last_seen_at, ip_address, user_agent FROM sessions WHERE user_id=? AND expires_at>? ORDER BY last_seen_at DESC', [userId, now()]);
    return ok(ctx, {
      sessions: rows.map((r) => ({
        id: r.sid, created_at: isoTime(r.created_at), last_seen_at: isoTime(r.last_seen_at), ip_address: r.ip_address,
        device: sl(pyStr(r.user_agent || ''), 120) || 'Bilinmeyen cihaz',
      })),
    });
  });
}

export async function apiAdminRevokeUserSession(ctx: Ctx, userId: number): Promise<Reply> {
  const payload = await ctx.readObject();
  const sessionId = pyStr(pget(payload, 'session_id', ''));
  if (!sessionId) throw new HttpError(400, 'Oturum kimliği gerekli');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    if (!(await conn.get("SELECT 1 FROM users WHERE id=? AND role='user'", [userId]))) throw new HttpError(404, 'Kullanıcı bulunamadı');
    await conn.run('DELETE FROM sessions WHERE sid=? AND user_id=?', [sessionId, userId]);
    await audit(conn, admin.id, 'revoke_session', 'user', userId);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiAdminDeleteUser(ctx: Ctx, userId: number): Promise<Reply> {
  const payload = await ctx.readObject();
  const onay = strip(pyStr(pget(payload, 'confirm', ''))).toUpperCase();
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    const hedef = await conn.get("SELECT * FROM users WHERE id=? AND role='user'", [userId]);
    if (!hedef) throw new HttpError(404, 'Kullanıcı bulunamadı');
    if (onay !== 'SIL') throw new HttpError(400, 'Silme onayı için SIL yazılmalı');
    await conn.run('DELETE FROM sessions WHERE user_id=?', [userId]);
    await conn.run("DELETE FROM users WHERE id=? AND role='user'", [userId]);
    await audit(conn, admin.id, 'delete_user', 'user', userId, { full_name: hedef.full_name, tc: String(hedef.tc).slice(0, 3) + '*****' });
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiAdminUpdateUser(ctx: Ctx, userId: number): Promise<Reply> {
  const payload = await ctx.readObject();
  let fullName = sfield(payload, 'full_name', 120);
  let phone = sfield(payload, 'phone', 40);
  let email = sfield(payload, 'email', 120);
  const city = sfield(payload, 'city', 80);
  const district = sfield(payload, 'district', 80);
  const birthDate = sfield(payload, 'birth_date', 20);
  const address = sfield(payload, 'address', 240);
  const kycNote = sfield(payload, 'kyc_note', 300);
  const status = strip(pyStr(pget(payload, 'status', '')));
  const tcRaw = pyStr(pget(payload, 'tc', '')).replace(/\D/g, '');
  const isTestUser = pyBool(payload.is_test_user) ? 1 : 0;
  if (!USER_STATUSES.has(status)) throw new HttpError(400, 'Durum hatalı');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    const target = await conn.get("SELECT * FROM users WHERE id=? AND role='user'", [userId]);
    if (!target) throw new HttpError(404, 'Kullanıcı bulunamadı');
    fullName = fullName || pyStr(target.full_name || '');
    phone = phone || pyStr(target.phone || '');
    email = email || pyStr(target.email || '');
    if (tcRaw && tcRaw !== target.tc && !identityNumberIsReal(tcRaw)) throw new HttpError(400, 'Geçersiz T.C. kimlik numarası');
    const tc = tcRaw || target.tc;
    if (tc !== target.tc && (await conn.get('SELECT id FROM users WHERE tc=? AND id!=?', [tc, userId]))) throw new HttpError(409, 'Bu T.C. kimlik numarası başka bir kullanıcıda kayıtlı');
    const tcDegisti = tc !== target.tc ? 1 : 0;
    await conn.run(
      `UPDATE users
       SET full_name=?, phone=?, email=?, city=?, district=?, birth_date=?, address=?, tc=?,
           status=?, kyc_status=CASE WHEN ?::text='suspended' THEN kyc_status ELSE ?::text END, kyc_note=?, is_test_user=?,
           approved_at=CASE WHEN ?::text='approved' THEN COALESCE(approved_at, ?::bigint) ELSE approved_at END,
           failed_login_count=CASE WHEN ?::int=1 THEN 0 ELSE failed_login_count END,
           locked_until=CASE WHEN ?::int=1 THEN 0 ELSE locked_until END
       WHERE id=? AND role='user'`,
      [fullName, phone, email, city, district, birthDate, address, tc, status, status, status, kycNote, isTestUser, status, now(), tcDegisti, tcDegisti, userId]);
    const onceki = target.status;
    if (status === 'suspended' && onceki !== 'suspended') {
      await createNotification(conn, userId, 'Hesabınız askıya alındı', SUSPENDED_MESSAGE, 'hesap');
    } else if (onceki === 'suspended' && status === 'approved') {
      await createNotification(conn, userId, 'Hesabınız yeniden aktif', 'Hesabınızdaki askı kaldırıldı. İşlemlerinizi yeniden yapabilirsiniz.', 'hesap');
    }
    await audit(conn, admin.id, 'update_user', 'user', userId, { is_test_user: isTestUser, tc_changed: !!tcDegisti, status, previous_status: onceki });
    await conn.commit();
    return ok(ctx);
  });
}

/* --------------------------------------------------------------- denetim kaydı */

export async function apiAdminAudit(ctx: Ctx): Promise<Reply> {
  const arama = strip(ctx.q('q'));
  const limit = Math.max(20, Math.min(500, pyInt(ctx.q('limit') || '200')));
  return withConn(async (conn) => {
    await ctx.requireAdmin(conn);
    let kosul = ''; let params: any[] = [];
    if (arama) { kosul = ' WHERE a.action ILIKE ? OR a.entity_type ILIKE ? OR u.full_name ILIKE ? '; params = [`%${arama}%`, `%${arama}%`, `%${arama}%`]; }
    const rows = await conn.all(`${AUDIT_JOIN}${kosul} ORDER BY a.created_at DESC LIMIT ?`, [...params, limit]);
    return ok(ctx, { audit: rows.map((r) => ({ ...r, created_at_label: isoTime(r.created_at), reference: gmRef(r.id, 8, 'GM-DNT-') })) });
  });
}

/* -------------------------------------------------------------------- Render */

function renderEnv(): [string, string] {
  const token = process.env.RENDER_API_TOKEN || '';
  const serviceId = process.env.RENDER_SERVICE_ID || '';
  if (!token || !serviceId) throw new HttpError(500, 'Render API yapılandırması eksik: RENDER_API_TOKEN / RENDER_SERVICE_ID ortam değişkenlerini ayarlayın.');
  return [token, serviceId];
}

async function renderCall(url: string, token: string, timeoutMs: number, body?: any): Promise<any> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
  return JSON.parse(await res.text());
}

export async function apiAdminRenderStatus(ctx: Ctx): Promise<Reply> {
  await withConn((conn) => ctx.requireAdmin(conn));
  const [token, serviceId] = renderEnv();
  try {
    const service = await renderCall(`https://api.render.com/v1/services/${serviceId}`, token, 8000);
    const deploys = await renderCall(`https://api.render.com/v1/services/${serviceId}/deploys?limit=1`, token, 8000);
    const latest = Array.isArray(deploys) && deploys.length ? (deploys[0].deploy ?? {}) : {};
    return ok(ctx, {
      ok: true, service_id: serviceId, service_name: service.name ?? null,
      live_url: (service.serviceDetails ?? {}).url || 'https://ottoman.local',
      status: latest.status ?? 'live', updated_at: latest.updatedAt ?? null,
      auto_deploy: service.autoDeploy ?? 'yes', repo: service.repo ?? null, branch: service.branch ?? null,
    });
  } catch (e: any) {
    return ok(ctx, { ok: false, error: String(e?.message ?? e), live_url: 'https://ottoman.local' });
  }
}

export async function apiAdminRenderDeploy(ctx: Ctx): Promise<Reply> {
  await withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await audit(conn, admin.id, 'render_trigger_deploy', 'system_settings', null);
    await conn.commit();
  });
  const [token, serviceId] = renderEnv();
  try {
    const info = await renderCall(`https://api.render.com/v1/services/${serviceId}/deploys`, token, 10_000, { clearCache: 'do_not_clear' });
    return ok(ctx, { ok: true, message: 'Render dağıtımı başarıyla tetiklendi. Birkaç dakika içinde yayında!', deploy_id: info.id ?? null, status: info.status ?? null, live_url: 'https://ottoman.local' });
  } catch (e: any) {
    return ok(ctx, { ok: false, error: `Render API Dağıtım Hatası: ${e?.message ?? e}`, live_url: 'https://ottoman.local' }, 500);
  }
}

export async function apiAdminRenderDomain(ctx: Ctx): Promise<Reply> {
  await withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await audit(conn, admin.id, 'render_add_domain', 'system_settings', null);
    await conn.commit();
  });
  const body = await ctx.readObject();
  const raw = pget(body, 'domain', '');
  if (typeof raw !== 'string') throw new TypeError("'" + typeof raw + "' object has no attribute 'strip'");
  const domain = strip(raw).toLowerCase();
  if (!domain) throw new HttpError(400, 'Geçerli bir domain giriniz.');
  const [token, serviceId] = renderEnv();
  try {
    const res = await renderCall(`https://api.render.com/v1/services/${serviceId}/custom-domains`, token, 10_000, { name: domain });
    return ok(ctx, { ok: true, message: `Domain ${domain} Render servisine bağlandı! DNS ayarlarınızda Render CNAME/A kaydını doğrulayın.`, data: res });
  } catch (e: any) {
    return ok(ctx, { ok: false, error: `Domain Ekleme Hatası: ${e?.message ?? e}` }, 500);
  }
}

/** Python'da `self.db()` bulunmadığından bu uçlar her zaman AttributeError → 500 verir; aynen korunur. */
export async function apiBrokenReset(_ctx: Ctx): Promise<Reply> {
  throw new TypeError("'AppHandler' object has no attribute 'db'");
}

/* ------------------------------------------------------- bakiye / pozisyon düzeltme */

export async function apiAdminAdjustBalance(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const userId = intOr0(pget(payload, 'user_id', 0));
  const amount = floatOr0(pget(payload, 'amount', 0));
  const action = pyStr(pget(payload, 'action', 'add')).toLowerCase();
  let note = sfield(payload, 'note', 300);
  if (userId <= 0 || amount < 0 || !['add', 'subtract', 'credit', 'set'].includes(action)) throw new HttpError(400, 'Bakiye işlemi hatalı');
  if (!note) note = 'Admin tarafından bakiye düzenlemesi';
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    const account = await accountFor(conn, userId);
    const before = Number(action === 'credit' ? account.credit_limit : account.cash_balance);
    let after: number; let txType: string;
    if (action === 'add') {
      after = pyRound(before + amount, 2);
      await conn.run('UPDATE accounts SET cash_balance=? WHERE user_id=?', [after, userId]);
      txType = 'admin_add';
    } else if (action === 'subtract') {
      after = pyRound(before - amount, 2);
      await conn.run('UPDATE accounts SET cash_balance=? WHERE user_id=?', [after, userId]);
      txType = 'admin_subtract';
    } else if (action === 'credit') {
      after = pyRound(before + amount, 2);
      await conn.run('UPDATE accounts SET credit_limit=? WHERE user_id=?', [after, userId]);
      txType = 'credit_limit';
    } else {
      after = pyRound(amount, 2);
      await conn.run('UPDATE accounts SET cash_balance=? WHERE user_id=?', [after, userId]);
      txType = 'admin_set_balance';
    }
    await writeTransaction(conn, userId, txType, action === 'set' ? Math.abs(after - before) : amount, before, after, { note });
    await audit(conn, admin.id, 'adjust_balance', 'account', userId, { amount: flt(amount), action, reason: note });
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiAdminAdjustPosition(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const userId = intOr0(pget(payload, 'user_id', 0));
  const symbol = symbolOf(pget(payload, 'symbol', ''));
  const quantity = pyIntOfFloat(or0(pget(payload, 'quantity', 0)));
  let price = floatOr0(pget(payload, 'price', 0));
  const totalCostRaw = pget(payload, 'total_cost');
  if (totalCostRaw !== undefined && totalCostRaw !== null && totalCostRaw !== '' && quantity > 0) {
    try {
      const totalCost = pyFloat(pyStr(totalCostRaw).replace(/,/g, '.'));
      if (totalCost > 0) price = totalCost / quantity;
    } catch (e) { if (!(e instanceof ValueError)) throw e; }
  }
  const action = pyStr(pget(payload, 'action', 'set')).toLowerCase();
  let note = sfield(payload, 'note', 300);
  if (userId <= 0 || !symbol || quantity < 0 || price <= 0 || !['set', 'add', 'reduce'].includes(action)) throw new HttpError(400, 'Pozisyon işlemi hatalı');
  if (!note) note = 'Admin tarafından portföy düzenlemesi';
  const valueOverrideRaw = pget(payload, 'value_override');
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    if (action === 'set') {
      if (quantity === 0) await conn.run('DELETE FROM positions WHERE user_id=? AND symbol=?', [userId, symbol]);
      else {
        await conn.run(`INSERT INTO positions (user_id, symbol, quantity, avg_price, updated_at) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, symbol) DO UPDATE SET quantity=excluded.quantity, avg_price=excluded.avg_price, updated_at=excluded.updated_at`, [userId, symbol, quantity, price, now()]);
      }
    } else if (action === 'add') await upsertPosition(conn, userId, symbol, quantity, price);
    else await reducePosition(conn, userId, symbol, quantity);
    if (quantity !== 0 && valueOverrideRaw !== undefined && valueOverrideRaw !== null) {
      const text = strip(pyStr(valueOverrideRaw)).replace(/,/g, '.');
      if (text === '') await conn.run('UPDATE positions SET value_override=NULL WHERE user_id=? AND symbol=?', [userId, symbol]);
      else {
        let v = 0;
        try { v = pyFloat(text); } catch (e) { if (!(e instanceof ValueError)) throw e; v = 0; }
        if (v > 0) await conn.run('UPDATE positions SET value_override=? WHERE user_id=? AND symbol=?', [v, userId, symbol]);
      }
    }
    await audit(conn, admin.id, 'adjust_position', 'position', userId, { symbol, quantity, action, reason: note });
    await conn.commit();
    return ok(ctx);
  });
}

/* ------------------------------------------------------- belge / varlık işlemleri */

export async function apiAdminDocumentAction(ctx: Ctx, documentId: number, action: string): Promise<Reply> {
  const payload = await ctx.readObject();
  if (!['approve', 'reject', 'retry'].includes(action)) throw new HttpError(404, 'Belge işlemi bulunamadı');
  const note = sfield(payload, 'note', 300);
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    const document = await conn.get('SELECT * FROM documents WHERE id=?', [documentId]);
    if (!document) throw new HttpError(404, 'Belge bulunamadı');
    const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'awaiting_back';
    await conn.run('UPDATE documents SET status=?, review_note=? WHERE id=?', [nextStatus, note, documentId]);
    const uid = Math.trunc(Number(document.user_id));
    if (nextStatus === 'awaiting_back') {
      await conn.run("UPDATE users SET status='awaiting_back', kyc_status='awaiting_back', kyc_note=? WHERE id=? AND status<>'suspended'", [note || 'Belge tekrar isteniyor', document.user_id]);
      await createNotification(conn, uid, 'Belge tekrar gerekiyor', note || 'Yüklediğiniz kimlik belgesi tekrar isteniyor. Lütfen belgenizi yeniden yükleyin.', 'hesap');
    } else {
      const oncekiDurum = (await conn.get('SELECT status FROM users WHERE id=?', [document.user_id]))!.status;
      const state = await syncUserKyc(conn, uid);
      if (state.approved && oncekiDurum !== 'approved') {
        await createNotification(conn, uid, 'Hesabınız onaylandı', 'Kimlik doğrulamanız tamamlandı. Artık alım satım, para yatırma ve çekme işlemlerini yapabilirsiniz.', 'hesap');
      } else if (action === 'reject') {
        await createNotification(conn, uid, 'Belgeniz reddedildi', note || 'Yüklediğiniz kimlik belgesi reddedildi. Lütfen tekrar yükleyin.', 'hesap');
      }
    }
    await audit(conn, admin.id, `${action}_document`, 'document', documentId, { note });
    await conn.commit();
    return ok(ctx);
  });
}

/* ---------------------------------------------- kullanıcı / emir / para işlemleri */

export async function apiAdminAction(ctx: Ctx, entity: string, entityId: number, action: string): Promise<Reply> {
  const allowed = entity === 'users' ? ['approve', 'reject', 'make_admin', 'unlock'] : ['approve', 'reject'];
  if (!allowed.includes(action)) throw new HttpError(404, 'İşlem bulunamadı');
  const payload = await ctx.readObject();
  const reason = sfield(payload, 'reason', 300);
  return withConn(async (conn) => {
    const admin = await ctx.requireAdmin(conn);
    await ctx.requireAdminStepUp(conn);
    if (entity === 'users') await adminUserAction(conn, admin, entityId, action, reason);
    else if (entity === 'orders') await adminOrderAction(conn, admin, entityId, action, reason);
    else if (entity === 'money') await adminMoneyAction(conn, admin, entityId, action, reason);
    await conn.commit();
    return ok(ctx);
  });
}

async function adminUserAction(conn: Conn, admin: Row, userId: number, action: string, reason: string): Promise<void> {
  const user = await conn.get("SELECT * FROM users WHERE id=? AND role='user'", [userId]);
  if (!user) throw new HttpError(404, 'Kullanıcı bulunamadı');
  if (action === 'unlock') {
    await conn.run('UPDATE users SET failed_login_count=0, locked_until=0 WHERE id=?', [userId]);
    await audit(conn, admin.id, 'unlock_user', 'user', userId);
    return;
  }
  if (action === 'make_admin') {
    await conn.run("UPDATE users SET role='admin' WHERE id=?", [userId]);
    await createNotification(conn, userId, 'Admin yetkisi verildi', 'Hesabınıza yönetici (admin) yetkisi tanımlandı.', 'hesap');
    await audit(conn, admin.id, 'make_admin', 'user', userId);
    return;
  }
  if (action === 'approve') {
    await conn.run("UPDATE users SET status='approved', kyc_status='approved', kyc_note='', approved_at=COALESCE(approved_at, ?) WHERE id=?", [now(), userId]);
    await createNotification(conn, userId, 'Hesabınız onaylandı', 'Kimlik doğrulamanız tamamlandı. Artık alım satım, para yatırma ve çekme işlemlerini yapabilirsiniz.', 'hesap');
  } else {
    await conn.run("UPDATE users SET status='rejected', kyc_status='rejected', kyc_note=?, approved_at=NULL WHERE id=?", [reason, userId]);
    await createNotification(conn, userId, 'Hesabınız reddedildi', reason || 'Hesap başvurunuz reddedildi. Detaylar için destek ekibiyle iletişime geçin.', 'hesap');
  }
  await audit(conn, admin.id, `${action}_user`, 'user', userId);
}

async function adminOrderAction(conn: Conn, admin: Row, orderId: number, action: string, reason: string): Promise<void> {
  const order = await conn.get('SELECT * FROM orders WHERE id=?', [orderId]);
  if (!order || order.status !== 'pending') throw new HttpError(404, 'Bekleyen emir bulunamadı');
  if (action === 'reject') {
    if (order.side === 'buy') await releaseOrderReservation(conn, orderId);
    await conn.run("UPDATE orders SET status='rejected', admin_note=?, reviewed_at=? WHERE id=?", [reason, now(), orderId]);
    await audit(conn, admin.id, 'reject_order', 'order', orderId, { reason });
    await createNotification(conn, order.user_id, 'Emriniz reddedildi', `${order.symbol} ${order.side === 'buy' ? 'alış' : 'satış'} emriniz reddedildi` + (reason ? `: ${reason}` : '.'), 'islem');
    return;
  }
  const quote = (await findQuote(conn, order.symbol)) || { name: order.symbol };
  if (order.side === 'buy') {
    const account = await accountFor(conn, order.user_id);
    await upsertPosition(conn, order.user_id, order.symbol, order.quantity, order.limit_price);
    await writeTransaction(conn, order.user_id, 'trade_buy', order.total, account.cash_balance, account.cash_balance, {
      orderId, code: order.symbol, name: quote.name, quantity: order.quantity, price: order.limit_price, note: 'Limit alış emri admin onayıyla portföye işlendi',
    });
  } else {
    if ((await positionQuantity(conn, order.user_id, order.symbol)) < order.quantity) throw new HttpError(422, 'Portföy adedi yetersiz');
    const avgPrice = await positionAvgPrice(conn, order.user_id, order.symbol);
    await reducePosition(conn, order.user_id, order.symbol, order.quantity);
    await creditSaleProceeds(conn, order.user_id, orderId, order.symbol, quote.name, Number(order.total), Math.trunc(Number(order.quantity)), Number(order.limit_price), `Ortalama maliyet: ${fmt2(avgPrice)}`);
    await notifyReferralsOfSale(conn, order.user_id, order.symbol, Math.trunc(Number(order.quantity)));
  }
  await conn.run("UPDATE orders SET status='approved', admin_note=?, reviewed_at=? WHERE id=?", [reason, now(), orderId]);
  await audit(conn, admin.id, 'approve_order', 'order', orderId, { total: flt(order.total), reason });
  await createNotification(conn, order.user_id, 'Emriniz gerçekleşti', `${order.quantity} lot ${order.symbol} ${order.side === 'buy' ? 'alış' : 'satış'} emriniz gerçekleşti.`, 'islem');
}

const MONEY_LABELS: Record<string, string> = { deposit: 'Para yatırma', withdraw: 'Para çekme', credit: 'Kredili yatırma' };

async function adminMoneyAction(conn: Conn, admin: Row, requestId: number, action: string, reason: string): Promise<void> {
  const item = await conn.get('SELECT * FROM money_requests WHERE id=?', [requestId]);
  if (!item || item.status !== 'pending') throw new HttpError(404, 'Bekleyen para talebi bulunamadı');
  const turu = lookup(MONEY_LABELS, item.request_type);
  if (action === 'reject') {
    await conn.run("UPDATE money_requests SET status='rejected', admin_note=?, reviewed_at=? WHERE id=?", [reason, now(), requestId]);
    await audit(conn, admin.id, 'reject_money_request', 'money_request', requestId, { reason });
    await createNotification(conn, item.user_id, `${turu} talebiniz reddedildi`, `₺${fmt2(Number(item.amount))} tutarındaki ${turu.toLowerCase()} talebiniz reddedildi` + (reason ? `: ${reason}` : '.'), 'islem');
    return;
  }
  const account = await accountFor(conn, item.user_id);
  if (item.request_type === 'deposit') {
    const before = Number(account.cash_balance);
    const after = pyRound(before + Number(item.amount), 2);
    await conn.run('UPDATE accounts SET cash_balance=? WHERE user_id=?', [after, item.user_id]);
    await writeTransaction(conn, item.user_id, 'deposit', item.amount, before, after, { moneyRequestId: requestId, note: reason || 'Para yatırma talebi onaylandı' });
  } else if (item.request_type === 'withdraw') {
    if (account.cash_balance < item.amount) throw new HttpError(422, 'Bakiye yetersiz');
    const before = Number(account.cash_balance);
    const after = pyRound(before - Number(item.amount), 2);
    await conn.run('UPDATE accounts SET cash_balance=? WHERE user_id=?', [after, item.user_id]);
    await writeTransaction(conn, item.user_id, 'withdrawal', item.amount, before, after, { moneyRequestId: requestId, note: reason || 'Para çekme talebi onaylandı' });
  } else if (item.request_type === 'credit') {
    await conn.run('UPDATE accounts SET credit_limit=credit_limit+? WHERE user_id=?', [item.amount, item.user_id]);
  }
  await conn.run("UPDATE money_requests SET status='approved', admin_note=?, reviewed_at=? WHERE id=?", [reason, now(), requestId]);
  await audit(conn, admin.id, 'approve_money_request', 'money_request', requestId, { amount: flt(item.amount), reason });
  await createNotification(conn, item.user_id, `${turu} talebiniz onaylandı`, `₺${fmt2(Number(item.amount))} tutarındaki ${turu.toLowerCase()} talebiniz onaylandı.`, 'islem');
}
