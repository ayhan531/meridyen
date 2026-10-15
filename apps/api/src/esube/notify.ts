import { Conn } from './db';
import { isoTime, now, Row } from './common';
import { sendPush } from './push';

export async function createNotification(conn: Conn, userId: number, title: string, body = '', category = 'genel'): Promise<void> {
  await conn.run('INSERT INTO notifications (user_id, category, title, body, created_at) VALUES (?, ?, ?, ?, ?)', [userId, category, title, body, now()]);
  await sendPush(conn, userId, category);
}

export async function notifyReferralsOfSale(conn: Conn, sellerId: number, symbol: string, quantity: number): Promise<void> {
  const seller = await conn.get('SELECT full_name FROM users WHERE id=?', [sellerId]);
  if (!seller) return;
  const referred = await conn.all('SELECT id FROM users WHERE referred_by=?', [sellerId]);
  for (const row of referred) {
    await createNotification(conn, row.id, 'Referans bildirimi', `Referansınız ${seller.full_name}, ${quantity} lot ${symbol} satışı gerçekleştirdi.`, 'referral');
  }
}

export async function notificationRows(conn: Conn, userId: number): Promise<Row[]> {
  const rows = await conn.all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [userId]);
  return rows.map((r) => ({ ...r, created_at_label: isoTime(r.created_at) }));
}
