/** Bakiye, emir rezervasyonu, T+2, işlem kayıtları, portföy ve satır dekoratörleri (Python: backend_server.py 1260-1300, 1765-1905, 5126-5570, 5674-5950). */
import { Conn } from './db';
import {
  HttpError, Row, SUSPENDED_MESSAGE, fmt2, documentStatusLabel, httpJson, isoTime, localDay, now, pget, pyBool, pyRound, statusLabel, UA_BROWSER,
} from './common';
import { identityNumberIsReal, turkishIban } from './security';
import { findQuote } from './market';
import { settingsMap } from './settings';

const num = (v: any) => Number(v ?? 0) || 0;

/* ------------------------------------------------------------------ hesap */

export async function pendingWithdrawalsFor(conn: Conn, userId: number): Promise<number> {
  const row = await conn.get(
    "SELECT COALESCE(SUM(amount), 0) AS toplam FROM money_requests WHERE user_id=? AND request_type='withdraw' AND status='pending'",
    [userId],
  );
  return pyRound(num(row?.toplam), 2);
}

export async function ordersReservedFor(conn: Conn, userId: number): Promise<number> {
  const row = await conn.get(
    "SELECT COALESCE(SUM(cash_reserved + pending_reserved), 0) AS toplam FROM orders WHERE user_id=? AND status='pending'",
    [userId],
  );
  return pyRound(num(row?.toplam), 2);
}

export async function accountFor(conn: Conn, userId: number): Promise<Row> {
  let row = await conn.get('SELECT * FROM accounts WHERE user_id=?', [userId]);
  if (!row) {
    await conn.run('INSERT INTO accounts (user_id) VALUES (?)', [userId]);
    row = await conn.get('SELECT * FROM accounts WHERE user_id=?', [userId]);
  }
  const account: Row = { ...row };
  account.orders_reserved = await ordersReservedFor(conn, userId);
  account.pending_withdrawals = await pendingWithdrawalsFor(conn, userId);
  return account;
}

export function buyingPower(account: Row): number {
  const reservedWithdrawals = num(account.pending_withdrawals);
  return pyRound(num(account.cash_balance) + num(account.pending_balance) - reservedWithdrawals, 2);
}

/* --------------------------------------------------------------- pozisyon */

export async function positionQuantity(conn: Conn, userId: number, symbol: string): Promise<number> {
  const row = await conn.get('SELECT quantity FROM positions WHERE user_id=? AND symbol=?', [userId, symbol]);
  return row ? Math.trunc(num(row.quantity)) : 0;
}

export async function reservedSellQuantity(conn: Conn, userId: number, symbol: string, excludeOrderId?: number | null): Promise<number> {
  const params: any[] = [userId, symbol.toUpperCase()];
  let extra = '';
  if (excludeOrderId) { extra = ' AND id<>?'; params.push(excludeOrderId); }
  const row = await conn.get(
    `SELECT COALESCE(SUM(quantity), 0) AS qty FROM orders WHERE user_id=? AND symbol=? AND side='sell' AND status='pending'${extra}`,
    params,
  );
  return Math.trunc(num(row?.qty));
}

export async function availablePositionQuantity(conn: Conn, userId: number, symbol: string, excludeOrderId?: number | null): Promise<number> {
  return Math.max(0, (await positionQuantity(conn, userId, symbol)) - (await reservedSellQuantity(conn, userId, symbol, excludeOrderId)));
}

export async function positionAvgPrice(conn: Conn, userId: number, symbol: string): Promise<number> {
  const row = await conn.get('SELECT avg_price FROM positions WHERE user_id=? AND symbol=?', [userId, symbol]);
  return row ? num(row.avg_price) : 0;
}

export async function upsertPosition(conn: Conn, userId: number, symbol: string, quantity: number, price: number): Promise<void> {
  const row = await conn.get('SELECT * FROM positions WHERE user_id=? AND symbol=?', [userId, symbol]);
  if (row) {
    const currentQty = Math.trunc(num(row.quantity));
    const newQty = currentQty + quantity;
    const avg = (currentQty * num(row.avg_price) + quantity * price) / newQty;
    await conn.run('UPDATE positions SET quantity=?, avg_price=?, updated_at=? WHERE id=?', [newQty, avg, now(), row.id]);
  } else {
    await conn.run('INSERT INTO positions (user_id, symbol, quantity, avg_price, updated_at) VALUES (?, ?, ?, ?, ?)', [userId, symbol, quantity, price, now()]);
  }
}

export async function reducePosition(conn: Conn, userId: number, symbol: string, quantity: number): Promise<void> {
  const row = await conn.get('SELECT * FROM positions WHERE user_id=? AND symbol=?', [userId, symbol]);
  if (!row || num(row.quantity) < quantity) throw new HttpError(422, 'Portföy adedi yetersiz');
  const remaining = num(row.quantity) - quantity;
  if (remaining) await conn.run('UPDATE positions SET quantity=?, updated_at=? WHERE id=?', [remaining, now(), row.id]);
  else await conn.run('DELETE FROM positions WHERE id=?', [row.id]);
}

/* ---------------------------------------------------------- KYC / askı */

export function ensureNotSuspended(user: Row): void {
  if (user.role !== 'admin' && user.status === 'suspended') throw new HttpError(403, SUSPENDED_MESSAGE);
}

const REQUIRED_IDENTITY_DOCUMENTS = ['identity_front', 'identity_back'];

export async function kycDocumentState(conn: Conn, userId: number): Promise<Row> {
  const rows = await conn.all('SELECT doc_type, status FROM documents WHERE user_id=? ORDER BY created_at DESC, id DESC', [userId]);
  const latest: Record<string, string> = {};
  for (const r of rows) if (!(String(r.doc_type) in latest)) latest[String(r.doc_type)] = String(r.status);
  const missing = REQUIRED_IDENTITY_DOCUMENTS.filter((d) => !(d in latest)).sort();
  const rejected = Object.entries(latest)
    .filter(([t, s]) => REQUIRED_IDENTITY_DOCUMENTS.includes(t) && (s === 'rejected' || s === 'awaiting_back'))
    .map(([t]) => t).sort();
  const approved = !missing.length && !rejected.length && REQUIRED_IDENTITY_DOCUMENTS.every((d) => latest[d] === 'approved');
  return { approved, missing, rejected, latest };
}

export async function syncUserKyc(conn: Conn, userId: number): Promise<Row> {
  const user = await conn.get('SELECT * FROM users WHERE id=?', [userId]);
  if (!user) throw new HttpError(404, 'Kullanıcı bulunamadı');
  if (user.status === 'suspended') return kycDocumentState(conn, userId);
  if (Math.trunc(num(user.is_test_user))) {
    await conn.run("UPDATE users SET status='approved', kyc_status='test_account' WHERE id=?", [userId]);
    return { approved: true, test_account: true, missing: [] };
  }
  const state = await kycDocumentState(conn, userId);
  if (state.approved) {
    await conn.run("UPDATE users SET status='approved', kyc_status='approved', kyc_note='', approved_at=COALESCE(approved_at, ?) WHERE id=?", [now(), userId]);
  } else if (state.rejected.length) {
    await conn.run("UPDATE users SET status='awaiting_back', kyc_status='awaiting_back' WHERE id=?", [userId]);
  } else if (state.missing.length) {
    await conn.run("UPDATE users SET status='pending', kyc_status='awaiting_back' WHERE id=?", [userId]);
  } else {
    await conn.run("UPDATE users SET status='pending', kyc_status='under_review' WHERE id=?", [userId]);
  }
  return state;
}

/* ------------------------------------------------------ işlem kaydı / T+2 */

export async function writeTransaction(
  conn: Conn, userId: number, transactionType: string, total: number, balanceBefore: number, balanceAfter: number,
  o: { orderId?: number | null; moneyRequestId?: number | null; code?: string; name?: string; quantity?: number; price?: number; note?: string } = {},
): Promise<number> {
  return conn.insert(
    `INSERT INTO user_transactions
       (user_id, order_id, money_request_id, code, name, transaction_type, quantity, price, total, balance_before, balance_after, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, o.orderId ?? null, o.moneyRequestId ?? null, o.code ?? '', o.name ?? '', transactionType, o.quantity ?? 0, o.price ?? 0, total, balanceBefore, balanceAfter, o.note ?? '', now()],
  );
}

/** İki iş günü sonrası (yerel saatte hafta içi). */
export function t2DueTs(startTs?: number | null): number {
  let current = startTs || now();
  let added = 0;
  while (added < 2) {
    current += 86400;
    const wd = new Date(current * 1000).getDay(); // 0=Paz
    if (wd >= 1 && wd <= 5) added += 1;
  }
  return current;
}

export async function createT2Settlement(
  conn: Conn, userId: number, orderId: number, transactionId: number, code: string, name: string, amount: number, quantity: number, salePrice: number,
): Promise<void> {
  await conn.run(
    `INSERT INTO t2_settlements
       (user_id, order_id, transaction_id, code, name, amount, remaining_amount, quantity, sale_price, settlement_date, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [userId, orderId, transactionId, code, name, amount, amount, quantity, salePrice, t2DueTs(), now()],
  );
}

export async function t2IsEnabled(conn: Conn): Promise<boolean> {
  return ((await settingsMap(conn)).t2_enabled ?? '0') === '1';
}

export async function ensurePendingAllocations(conn: Conn, userId: number): Promise<void> {
  const account = await accountFor(conn, userId);
  const row = await conn.get("SELECT COALESCE(SUM(remaining_amount),0) AS amount FROM t2_settlements WHERE user_id=? AND status='pending'", [userId]);
  const missing = pyRound(num(account.pending_balance) - num(row?.amount), 2);
  if (missing <= 0) return;
  await conn.run(
    `INSERT INTO t2_settlements
       (user_id, code, name, amount, remaining_amount, quantity, sale_price, settlement_date, status, created_at)
     VALUES (?, 'NAKİT', 'Satış bakiyesi', ?, ?, 0, 0, ?, 'pending', ?)`,
    [userId, missing, missing, t2DueTs(), now()],
  );
}

export async function reserveBuyingPower(conn: Conn, userId: number, orderId: number, amount: number): Promise<[number, number]> {
  const account = await accountFor(conn, userId);
  if (buyingPower(account) + 0.001 < amount) throw new HttpError(422, 'Yetersiz işlem bakiyesi');
  await ensurePendingAllocations(conn, userId);
  const pendingTarget = Math.min(num(account.pending_balance), amount);
  let pendingUsed = 0;
  const rows = await conn.all(
    "SELECT id, remaining_amount FROM t2_settlements WHERE user_id=? AND status='pending' AND remaining_amount>0 ORDER BY settlement_date ASC, id ASC",
    [userId],
  );
  for (const row of rows) {
    if (pendingUsed + 0.001 >= pendingTarget) break;
    const use = Math.min(num(row.remaining_amount), pendingTarget - pendingUsed);
    if (use <= 0) continue;
    await conn.run('UPDATE t2_settlements SET remaining_amount=GREATEST(remaining_amount-?,0) WHERE id=?', [use, row.id]);
    await conn.run('INSERT INTO t2_consumptions (order_id, settlement_id, amount, created_at) VALUES (?, ?, ?, ?)', [orderId, row.id, use, now()]);
    pendingUsed = pyRound(pendingUsed + use, 2);
  }
  const cashUsed = pyRound(amount - pendingUsed, 2);
  if (num(account.cash_balance) + 0.001 < cashUsed) throw new HttpError(422, 'Yetersiz işlem bakiyesi');
  await conn.run('UPDATE accounts SET cash_balance=cash_balance-?, pending_balance=pending_balance-? WHERE user_id=?', [cashUsed, pendingUsed, userId]);
  await conn.run('UPDATE orders SET cash_reserved=cash_reserved+?, pending_reserved=pending_reserved+? WHERE id=?', [cashUsed, pendingUsed, orderId]);
  return [cashUsed, pendingUsed];
}

export async function releaseOrderReservation(conn: Conn, orderId: number, amount?: number | null): Promise<void> {
  const order = await conn.get('SELECT * FROM orders WHERE id=?', [orderId]);
  if (!order) return;
  const cashReserved = num(order.cash_reserved);
  const pendingReserved = num(order.pending_reserved);
  const refund = Math.min(cashReserved + pendingReserved, amount != null ? amount : cashReserved + pendingReserved);
  const cashRefund = Math.min(cashReserved, refund);
  const pendingRefund = pyRound(refund - cashRefund, 2);
  let pendingFuture = 0;
  let pendingDue = 0;
  let remaining = pendingRefund;
  const consumptions = await conn.all(
    `SELECT c.*, s.status AS settlement_status, s.settlement_date
       FROM t2_consumptions c JOIN t2_settlements s ON s.id=c.settlement_id
      WHERE c.order_id=? ORDER BY c.id DESC`,
    [orderId],
  );
  for (const item of consumptions) {
    if (remaining <= 0) break;
    const restore = Math.min(num(item.amount), remaining);
    if (item.settlement_status === 'pending') {
      await conn.run('UPDATE t2_settlements SET remaining_amount=remaining_amount+? WHERE id=?', [restore, item.settlement_id]);
      pendingFuture = pyRound(pendingFuture + restore, 2);
    } else {
      pendingDue = pyRound(pendingDue + restore, 2);
    }
    const left = pyRound(num(item.amount) - restore, 2);
    if (left > 0) await conn.run('UPDATE t2_consumptions SET amount=? WHERE id=?', [left, item.id]);
    else await conn.run('DELETE FROM t2_consumptions WHERE id=?', [item.id]);
    remaining = pyRound(remaining - restore, 2);
  }
  if (remaining > 0) pendingFuture = pyRound(pendingFuture + remaining, 2);
  await conn.run('UPDATE accounts SET cash_balance=cash_balance+?, pending_balance=pending_balance+? WHERE user_id=?', [cashRefund + pendingDue, pendingFuture, order.user_id]);
  await conn.run('UPDATE orders SET cash_reserved=GREATEST(cash_reserved-?,0), pending_reserved=GREATEST(pending_reserved-?,0) WHERE id=?', [cashRefund, pendingRefund, orderId]);
}

export async function creditSaleProceeds(
  conn: Conn, userId: number, orderId: number, symbol: string, name: string, total: number, quantity: number, price: number, note: string,
): Promise<number> {
  const account = await accountFor(conn, userId);
  const before = num(account.pending_balance);
  const after = pyRound(before + total, 2);
  await conn.run('UPDATE accounts SET pending_balance=? WHERE user_id=?', [after, userId]);
  const txId = await writeTransaction(conn, userId, 'trade_sell', total, before, after, { orderId, code: symbol, name, quantity, price, note });
  await createT2Settlement(conn, userId, orderId, txId, symbol, name, total, quantity, price);
  return txId;
}

/** Süresiz T+2: otomatik takas yok (Python sürümüyle aynı). */
export async function settleDueT2(_conn: Conn): Promise<void> { /* bilerek boş */ }

export async function settleOneT2(conn: Conn, settlementId: number): Promise<void> {
  const row = await conn.get("SELECT * FROM t2_settlements WHERE id=? AND status='pending'", [settlementId]);
  if (!row) throw new HttpError(404, 'Bekleyen satış bakiyesi bulunamadı');
  const account = await accountFor(conn, row.user_id);
  const pendingBefore = num(account.pending_balance);
  const cashBefore = num(account.cash_balance);
  const amount = Math.min(num(row.remaining_amount), pendingBefore);
  await conn.run('UPDATE accounts SET pending_balance=GREATEST(pending_balance-?,0), cash_balance=cash_balance+? WHERE user_id=?', [amount, amount, row.user_id]);
  await writeTransaction(conn, row.user_id, 't2_settlement', amount, cashBefore, cashBefore + amount, {
    orderId: row.order_id, code: row.code, name: row.name, quantity: row.quantity, price: row.sale_price,
    note: `Satış bakiyesi aktarımı öncesi bekleyen tutar: ${fmt2(pendingBefore)}`,
  });
  await conn.run('UPDATE t2_settlements SET remaining_amount=0, status=?, reviewed_at=? WHERE id=?', [amount > 0 ? 'approved' : 'consumed', now(), settlementId]);
}

/* --------------------------------------------------------- satır üreticileri */

export function normalizeIban(value: string): string { return turkishIban(value); }

export async function systemBankAccountRows(conn: Conn, activeOnly = true): Promise<Row[]> {
  const where = activeOnly ? "WHERE is_active=1 AND iban NOT LIKE 'TR00%'" : '';
  const rows = await conn.all(`SELECT * FROM system_bank_accounts ${where} ORDER BY sort_order ASC, id ASC`);
  return rows.map((r) => ({ ...r, created_at_label: isoTime(r.created_at), status_label: r.is_active ? 'Aktif' : 'Pasif' }));
}

export async function userBankAccountRows(conn: Conn, userId?: number | null): Promise<Row[]> {
  const where = userId ? 'WHERE b.user_id=?' : '';
  const rows = await conn.all(
    `SELECT b.*, u.full_name FROM bank_accounts b JOIN users u ON u.id=b.user_id ${where} ORDER BY b.created_at DESC`,
    userId ? [userId] : [],
  );
  return rows.map((r) => ({ ...r, created_at_label: isoTime(r.created_at) }));
}

const TX_LABELS: Record<string, string> = {
  admin_add: 'TL Yükleme', admin_subtract: 'Admin Çıkarma', deposit: 'Para Yatırma', withdrawal: 'Para Çekme',
  deposit_request: 'Para Yatırma Talebi', withdrawal_request: 'Para Çekme Talebi', trade_buy: 'Hisse Alım',
  trade_sell: 'Hisse Satım', stock_sale: 'Hisse Satımı', t2_settlement: 'Satış Bakiyesi Aktarımı', credit_limit: 'Kredi Limiti',
};

export async function transactionRows(conn: Conn, where: string, params: any[] = [], limit = 300): Promise<Row[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 10000));
  const rows = await conn.all(
    `SELECT t.*, u.full_name FROM user_transactions t JOIN users u ON u.id=t.user_id ${where} ORDER BY t.created_at DESC LIMIT ?`,
    [...params, safeLimit],
  );
  return rows.map((r) => ({
    ...r,
    reference: `GM-HRK-${String(Math.trunc(num(r.id))).padStart(8, '0')}`,
    type_label: TX_LABELS[r.transaction_type] ?? r.transaction_type,
    created_at_label: isoTime(r.created_at),
  }));
}

function parseYmd(value: string): number {
  const m = /^\s*(\d{1,4})-(\d{1,2})-(\d{1,2})\s*$/.exec(value);
  if (!m) throw new Error('bad date');
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (y < 1 || mo < 1 || mo > 12 || d < 1 || dt.getDate() !== d || dt.getMonth() !== mo - 1) throw new Error('bad date');
  return Math.floor(dt.getTime() / 1000);
}

export type Query = Record<string, string[]>;
export const q1 = (query: Query | undefined, key: string): string => (query?.[key]?.[0] ?? '');

export async function filteredTransactions(conn: Conn, userId?: number | null, query: Query = {}, limit = 10000): Promise<Row[]> {
  const clauses: string[] = [];
  const params: any[] = [];
  if (userId != null) { clauses.push('t.user_id=?'); params.push(userId); }
  const dateFrom = q1(query, 'from');
  const dateTo = q1(query, 'to');
  const transactionType = q1(query, 'type');
  const search = q1(query, 'q').trim();
  try {
    if (dateFrom) { clauses.push('t.created_at>=?'); params.push(parseYmd(dateFrom)); }
    if (dateTo) { clauses.push('t.created_at<?'); params.push(parseYmd(dateTo) + 86400); }
  } catch {
    throw new HttpError(400, 'Tarih filtresi hatalı');
  }
  if (transactionType && transactionType !== 'all') { clauses.push('t.transaction_type=?'); params.push(transactionType); }
  if (search) {
    clauses.push("(t.code ILIKE ? OR t.name ILIKE ? OR t.note ILIKE ? OR u.full_name ILIKE ? OR ('GM-HRK-' || lpad(t.id::text, 8, '0')) ILIKE ?)");
    const token = `%${search}%`;
    params.push(token, token, token, token, token);
  }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  return transactionRows(conn, where, params, limit);
}

export async function t2SettlementRows(conn: Conn, where = '', params: any[] = []): Promise<Row[]> {
  const rows = await conn.all(
    `SELECT s.*, u.full_name FROM t2_settlements s JOIN users u ON u.id=s.user_id ${where} ORDER BY s.created_at DESC LIMIT 300`,
    params,
  );
  return rows.map((r) => ({
    ...r,
    display_amount: r.status === 'pending' ? r.remaining_amount : r.amount,
    used_amount: Math.max(0, num(r.amount) - num(r.remaining_amount)),
    status_label: statusLabel(r.status),
    created_at_label: isoTime(r.created_at),
    settlement_date_label: isoTime(r.settlement_date),
    reviewed_at_label: r.reviewed_at ? isoTime(r.reviewed_at) : null,
  }));
}

async function decoratePosition(conn: Conn, item: Row): Promise<Row> {
  const quote = (await findQuote(conn, item.symbol)) || {};
  let currentPrice = num(quote.price) || num(item.avg_price);
  if (item.value_override !== null && item.value_override !== undefined) currentPrice = num(item.value_override);
  item.current_price = currentPrice;
  item.market_value = currentPrice * item.quantity;
  item.pnl = item.market_value - item.avg_price * item.quantity;
  item.updated_at_label = isoTime(item.updated_at);
  return item;
}

export async function adminPositionRows(conn: Conn): Promise<Row[]> {
  const rows = await conn.all('SELECT p.*, u.full_name FROM positions p JOIN users u ON u.id=p.user_id ORDER BY p.updated_at DESC');
  const out: Row[] = [];
  for (const r of rows) out.push(await decoratePosition(conn, { ...r }));
  return out;
}

export async function portfolioRows(conn: Conn, userId: number): Promise<Row[]> {
  const rows = await conn.all('SELECT * FROM positions WHERE user_id=? ORDER BY symbol ASC', [userId]);
  const out: Row[] = [];
  for (const r of rows) out.push(await decoratePosition(conn, { ...r }));
  return out;
}

export async function documentRows(conn: Conn, where = '', params: any[] = []): Promise<Row[]> {
  const rows = await conn.all(`SELECT d.*, u.full_name FROM documents d JOIN users u ON u.id=d.user_id ${where} ORDER BY d.created_at DESC`, params);
  const labels: Record<string, string> = { identity_front: 'Kimlik Ön Yüz', identity_back: 'Kimlik Arka Yüz', selfie: 'Yüz Doğrulama' };
  return rows.map((r) => ({
    ...r,
    created_at_label: isoTime(r.created_at),
    url: `/uploads/${r.stored_name}`,
    type_label: labels[r.doc_type] ?? r.doc_type,
    status_label: documentStatusLabel(r.status),
  }));
}

export function decorateOrder(row: Row): Row {
  row.status_label = statusLabel(row.status);
  row.side_label = row.side === 'buy' ? 'Alış' : 'Satış';
  row.order_type_label = row.order_type === 'market' ? 'Piyasa' : 'Limit';
  row.created_at_label = isoTime(row.created_at);
  row.reviewed_at_label = row.reviewed_at ? isoTime(row.reviewed_at) : null;
  return row;
}

export function decorateMoney(row: Row): Row {
  row.status_label = statusLabel(row.status);
  row.type_label = ({ deposit: 'Para Yatırma', withdraw: 'Para Çekme', credit: 'Kredili Yatırım' } as Record<string, string>)[row.request_type] ?? row.request_type;
  if (row.admin_note && String(row.admin_note).toLowerCase().includes('iptal')) row.status_label = 'İptal';
  if (row.receipt_stored_name) row.receipt_url = `/uploads/${row.receipt_stored_name}`;
  row.created_at_label = isoTime(row.created_at);
  row.reviewed_at_label = row.reviewed_at ? isoTime(row.reviewed_at) : null;
  return row;
}

export async function orderRows(conn: Conn, where: string, params: any[]): Promise<Row[]> {
  const rows = await conn.all(`SELECT o.*, u.full_name FROM orders o JOIN users u ON u.id=o.user_id ${where} ORDER BY o.created_at DESC`, params);
  const result: Row[] = [];
  for (const row of rows) {
    const item = decorateOrder({ ...row });
    if (item.side === 'sell') {
      const tx = await conn.get("SELECT note FROM user_transactions WHERE order_id=? AND transaction_type LIKE 'trade_%' LIMIT 1", [item.id]);
      let avgPrice = 0;
      if (tx && tx.note) {
        const m = /Ortalama maliyet:\s*([\d.]+)/.exec(String(tx.note));
        if (m) { const v = Number(m[1]); avgPrice = Number.isNaN(v) ? 0 : v; }
      }
      if (avgPrice <= 0) avgPrice = num(item.limit_price) || num(item.source_price);
      item.avg_cost_price = pyRound(avgPrice, 2);
      const sellPrice = num(item.limit_price);
      item.per_unit_diff = pyRound(sellPrice - avgPrice, 2);
      const qty = Math.trunc(num(item.quantity));
      const gross = num(item.gross_total);
      const commission = num(item.commission);
      const totalCost = pyRound(avgPrice * qty, 2);
      item.total_cost = totalCost;
      item.net_income = pyRound(gross - commission - totalCost, 2);
    }
    result.push(item);
  }
  return result;
}

export async function moneyRows(conn: Conn, where: string, params: any[]): Promise<Row[]> {
  const rows = await conn.all(
    `SELECT m.*, u.full_name, u.account_no, u.phone, b.bank_name, b.iban, b.account_holder
       FROM money_requests m JOIN users u ON u.id=m.user_id LEFT JOIN bank_accounts b ON b.id=m.bank_account_id
       ${where} ORDER BY m.created_at DESC`,
    params,
  );
  return rows.map((r) => decorateMoney({ ...r }));
}

/* ------------------------------------------------------------- kullanıcı */

export function publicUser(user: Row, includeSensitive = false): Row {
  const id = Math.trunc(num(user.id));
  const acc = user.account_no || `GM${String(id).padStart(6, '0')}`;
  const data: Row = {
    id: user.id,
    account_no: acc,
    referral_code: acc,
    avatar_url: user.avatar_url || '',
    full_name: user.full_name,
    phone: user.phone,
    email: user.email,
    city: user.city,
    district: pget(user, 'district', ''),
    birth_date: pget(user, 'birth_date', ''),
    address: pget(user, 'address', ''),
    role: user.role,
    status: user.status,
    status_label: statusLabel(user.status),
    kyc_status: user.kyc_status,
    kyc_status_label: statusLabel(user.kyc_status),
    kyc_note: pget(user, 'kyc_note', ''),
    is_test_user: pyBool(pget(user, 'is_test_user', 0)),
    risk_profile: pget(user, 'risk_profile', ''),
    suitability_completed: pyBool(user.suitability_completed_at),
    agreements_version: pget(user, 'agreements_version', ''),
    two_factor_enabled: pyBool(pget(user, 'two_factor_enabled', 0)),
    last_login_at: user.last_login_at ? isoTime(user.last_login_at) : null,
    created_at: isoTime(user.created_at),
    approved_at: user.approved_at ? isoTime(user.approved_at) : null,
  };
  if (includeSensitive) {
    const tc = String(user.tc);
    data.tc_masked = tc.slice(0, 3) + '*****' + tc.slice(-3);
    data.tc = user.tc;
    data.tc_valid = identityNumberIsReal(tc);
    data.cash_balance = pget(user, 'cash_balance', 0);
    data.blocked_balance = pget(user, 'blocked_balance', 0);
    data.orders_reserved = pget(user, 'orders_reserved', 0);
    data.pending_withdrawals = pget(user, 'pending_withdrawals', 0);
    data.pending_balance = pget(user, 'pending_balance', 0);
    data.credit_limit = pget(user, 'credit_limit', 0);
    data.document_count = pget(user, 'document_count', 0);
    if (user.status !== 'approved' && user.status !== 'rejected') {
      const eksik: string[] = [];
      if (!user.has_front) eksik.push('Ön Yüz');
      if (!user.has_back) eksik.push('Arka Yüz');
      data.kyc_missing_label = eksik.length && eksik.length < 2 ? `${eksik.join(', ')} Bekleniyor` : null;
    } else {
      data.kyc_missing_label = null;
    }
    data.order_count = pget(user, 'order_count', 0);
    data.buy_count = pget(user, 'buy_count', 0);
    data.sell_count = pget(user, 'sell_count', 0);
    data.transaction_count = pget(user, 'transaction_count', 0);
    const kilitKalan = Math.trunc(num(user.locked_until)) - now();
    data.login_locked = kilitKalan > 0;
    data.login_locked_minutes = kilitKalan > 0 ? Math.max(1, Math.floor((kilitKalan + 59) / 60)) : 0;
    data.failed_login_count = Math.trunc(num(user.failed_login_count));
  }
  return data;
}

/* ------------------------------------------------------- portföy geçmişi */

export async function portfolioValue(conn: Conn, userId: number): Promise<number> {
  const account = await accountFor(conn, userId);
  let total = num(account.cash_balance);
  for (const row of await portfolioRows(conn, userId)) total += num(row.market_value);
  return pyRound(total, 2);
}

export async function recordPortfolioSnapshot(conn: Conn, userId: number): Promise<void> {
  const day = localDay(now());
  const value = await portfolioValue(conn, userId);
  await conn.run(
    'INSERT INTO portfolio_snapshots (user_id, day, value, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET value=excluded.value, created_at=excluded.created_at',
    [userId, day, value, now()],
  );
  await conn.run("DELETE FROM portfolio_snapshots WHERE user_id=? AND day < to_char((now() AT TIME ZONE 'UTC')::date - 90, 'YYYY-MM-DD')", [userId]);
  await conn.commit();
}

const PRICE_HISTORY_TTL = 60 * 60 * 6;

export async function fetchPriceHistory(symbol: string): Promise<Array<[string, number]>> {
  if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) return [];
  let payload: any;
  try {
    payload = await httpJson(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?range=1mo&interval=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeoutMs: 15_000,
    });
  } catch { return []; }
  let stamps: any[]; let closes: any[];
  try {
    const result = payload.chart.result[0];
    stamps = result.timestamp; closes = result.indicators.quote[0].close;
    if (!Array.isArray(stamps) || !Array.isArray(closes)) return [];
  } catch { return []; }
  const series: Array<[string, number]> = [];
  const n = Math.min(stamps.length, closes.length);
  for (let i = 0; i < n; i++) {
    if (closes[i] === null || closes[i] === undefined) continue;
    const stamp = Number(stamps[i]);
    if (!Number.isFinite(stamp)) continue;
    series.push([localDay(Math.trunc(stamp)), pyRound(Number(closes[i]), 4)]);
  }
  return series;
}

export async function priceHistoryFor(conn: Conn, symbols: string[]): Promise<Record<string, Array<{ day: string; close: number }>>> {
  const stamp = now();
  for (const symbol of symbols) {
    const meta = await conn.get('SELECT fetched_at FROM price_history_meta WHERE symbol=?', [symbol]);
    if (meta && stamp - Math.trunc(num(meta.fetched_at)) < PRICE_HISTORY_TTL) continue;
    const series = await fetchPriceHistory(symbol);
    if (!series.length) {
      await conn.run(
        'INSERT INTO price_history_meta (symbol, fetched_at) VALUES (?, ?) ON CONFLICT(symbol) DO UPDATE SET fetched_at=excluded.fetched_at',
        [symbol, stamp - PRICE_HISTORY_TTL + 600],
      );
      continue;
    }
    for (const [day, close] of series) {
      await conn.run('INSERT INTO price_history (symbol, day, close) VALUES (?, ?, ?) ON CONFLICT(symbol, day) DO UPDATE SET close=excluded.close', [symbol, day, close]);
    }
    await conn.run(
      'INSERT INTO price_history_meta (symbol, fetched_at) VALUES (?, ?) ON CONFLICT(symbol) DO UPDATE SET fetched_at=excluded.fetched_at',
      [symbol, stamp],
    );
  }
  await conn.commit();
  const out: Record<string, Array<{ day: string; close: number }>> = {};
  for (const symbol of symbols) {
    const rows = await conn.all('SELECT day, close FROM price_history WHERE symbol=? ORDER BY day ASC LIMIT 400', [symbol]);
    if (rows.length) out[symbol] = rows.map((r) => ({ day: r.day, close: num(r.close) }));
  }
  return out;
}

export async function portfolioHistoryRows(conn: Conn, userId: number, days = 30): Promise<Row[]> {
  const rows = await conn.all('SELECT day, value FROM portfolio_snapshots WHERE user_id=? ORDER BY day DESC LIMIT ?', [userId, Math.max(2, Math.min(Math.trunc(days), 180))]);
  return rows.reverse().map((r) => ({ day: r.day, value: num(r.value) }));
}

export { UA_BROWSER };
