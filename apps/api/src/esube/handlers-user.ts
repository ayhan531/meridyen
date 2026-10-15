/** Müşteri tarafı uçları (Python: AppHandler.api_* — oturum, profil, bildirim, piyasa, haber, portföy, emir, para talepleri). */
import { createHash, randomBytes, randomInt } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { withConn } from './db';
import {
  pyFloatCell, flt, cfg, envInt, fmt2, HttpError, httpBytes, isoTime, lookup, statusLabel, MARKET_URLS, now, OFFICIAL_COMPANY_DOMAINS, or0, pget, pyBool, pyFloat,
  pyInt, pyIntOfFloat, pyJson, pyRound, pyStr, Row, TRADINGVIEW_LOGO_BASE, UA_BACKEND, casefold,
} from './common';
import { Ctx, fieldValue, fileItem, MultipartForm, readUploadBytes, Reply, storeUpload, tokenHex, transcodeUploadedImage } from './ctx';
import { audit } from './audit';
import { b32encode, generateAccountNo, hashPassword, identityNumberIsReal, passwordIsStrong, riskProfileFor, sendResetEmail, turkishIban, verifyPassword, verifyTotp } from './security';
import { createNotification, notificationRows, notifyReferralsOfSale } from './notify';
import { pushKeys } from './push';
import { settingsMap, commissionFor } from './settings';
import { cleanSymbol, findQuote, marketStatus, refreshMarket } from './market';
import { latestNews, companyNews, marketNews, MARKET_NEWS_QUERIES } from './news';
import { quotePlus } from './xml';
import {
  accountFor, availablePositionQuantity, buyingPower, creditSaleProceeds, decorateOrder, documentRows, ensureNotSuspended, filteredTransactions,
  moneyRows, orderRows, pendingWithdrawalsFor, portfolioHistoryRows, portfolioRows, positionAvgPrice, priceHistoryFor, publicUser,
  recordPortfolioSnapshot, releaseOrderReservation, reducePosition, reserveBuyingPower, systemBankAccountRows, t2SettlementRows, transactionRows,
  upsertPosition, userBankAccountRows, writeTransaction, settleDueT2, Query,
} from './trading';

const ok = (ctx: Ctx, data: any = { ok: true }, status = 200, extra: Record<string, string> = {}) => ctx.json(data, status, extra);
const plen = (s: string) => Array.from(s).length;
const sl = (s: string, n: number) => (plen(s) <= n ? s : Array.from(s).slice(0, n).join(''));
const sha256 = (s: string) => createHash('sha256').update(s, 'utf-8').digest('hex');
const strip = (s: string) => s.trim();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TRUTHY = new Set(['1', 'true', 'on', 'yes']);
const baseName = (n: string) => { const t = n.replace(/\/+$/, ''); const i = t.lastIndexOf('/'); return i >= 0 ? t.slice(i + 1) : t; };
const suffixOf = (n: string) => { const b = baseName(n); const i = b.lastIndexOf('.'); return i > 0 && i < b.length - 1 ? b.slice(i) : ''; };
/** `a or b or c` — ilk doğru (truthy) değer */
const firstTruthy = (...vals: any[]) => { for (const v of vals) if (pyBool(v)) return v; return vals[vals.length - 1]; };
const urlSafeToken = (n: number) => randomBytes(n).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ------------------------------------------------------------- oturum */

export async function apiMe(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await settleDueT2(conn);
    const user = await ctx.currentUser(conn);
    if (!user) return ok(ctx, { user: null });
    const account = await accountFor(conn, user.id);
    return ok(ctx, { user: publicUser(user), account });
  });
}

export async function apiLogin(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const tc = pyStr(pget(payload, 'tc', '')).replace(/\D/g, '');
  const password = pyStr(pget(payload, 'password', ''));
  const remember = pyBool(payload.remember);
  if (!/^\d{11}$/.test(tc) || plen(password) < 6) throw new HttpError(400, 'T.C. ve şifre hatalı');
  return withConn(async (conn) => {
    const user = await conn.get('SELECT * FROM users WHERE tc=?', [tc]);
    if (user && Math.trunc(Number(user.locked_until) || 0) > now()) throw new HttpError(429, 'Çok sayıda hatalı deneme nedeniyle giriş geçici olarak kilitlendi');
    if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      if (user) {
        const attempts = Math.trunc(Number(user.failed_login_count) || 0) + 1;
        const lockedUntil = attempts >= cfg.loginMaxAttempts ? now() + cfg.loginLockSeconds : 0;
        await conn.run('UPDATE users SET failed_login_count=?, locked_until=? WHERE id=?', [attempts, lockedUntil, user.id]);
        await audit(conn, user.id, 'login_failed', 'session', null, { attempt: attempts }, ctx.ip(), ctx.ua());
        await conn.commit();
      }
      throw new HttpError(401, 'Giriş bilgileri hatalı');
    }
    if (user.role !== 'admin' && user.status === 'rejected') throw new HttpError(403, `Kayıt durumu: ${statusLabel(user.status)}`);
    const sid = urlSafeToken(32);
    const ttl = remember ? 60 * 60 * 24 * 30 : cfg.sessionTtl;
    await conn.run('DELETE FROM sessions WHERE expires_at<=?', [now()]);
    await conn.run(
      'INSERT INTO sessions (sid, user_id, expires_at, created_at, last_seen_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sid, user.id, now() + ttl, now(), now(), ctx.ip(), sl(ctx.ua(), 240)],
    );
    await conn.run('UPDATE users SET failed_login_count=0, locked_until=0, last_login_at=? WHERE id=?', [now(), user.id]);
    await audit(conn, user.id, 'login', 'session', null, null, ctx.ip(), ctx.ua(), sid.slice(0, 16));
    await conn.commit();
    const cookie = `${cfg.cookieName}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}`;
    return ok(ctx, { user: publicUser({ ...user }), token: sid }, 200, { 'Set-Cookie': cookie });
  });
}

export async function apiForgotPassword(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const tc = pyStr(pget(payload, 'tc', '')).replace(/\D/g, '');
  const email = pyStr(pget(payload, 'email', '')).trim().toLowerCase();
  await withConn(async (conn) => {
    const user = await conn.get('SELECT * FROM users WHERE tc=? AND lower(email)=?', [tc, email]);
    if (user) {
      const token = urlSafeToken(32);
      const tokenHash = sha256(token);
      await conn.run('UPDATE password_reset_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL', [now(), user.id]);
      await conn.run('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)', [user.id, tokenHash, now() + cfg.passwordResetTtl, now()]);
      const baseUrl = (process.env.PUBLIC_BASE_URL ?? `https://${ctx.header('host')}`).replace(/\/+$/, '');
      let delivered = false;
      try { delivered = await sendResetEmail(email, `${baseUrl}/esube/giris?reset=${token}`); } catch { delivered = false; }
      await audit(conn, user.id, 'password_reset_requested', 'user', user.id, { delivered }, ctx.ip(), ctx.ua());
      await conn.commit();
    }
  });
  return ok(ctx, { ok: true, message: 'Bilgiler eşleşiyorsa şifre yenileme bağlantısı e-posta adresinize gönderildi.' });
}

export async function apiResetPassword(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const token = pyStr(pget(payload, 'token', ''));
  const newPassword = pyStr(pget(payload, 'new_password', ''));
  if (!token || !passwordIsStrong(newPassword)) throw new HttpError(400, 'Geçerli bağlantı ve güçlü bir şifre gerekli');
  const tokenHash = sha256(token);
  await withConn(async (conn) => {
    const row = await conn.get('SELECT * FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>?', [tokenHash, now()]);
    if (!row) throw new HttpError(400, 'Şifre yenileme bağlantısı geçersiz veya süresi dolmuş');
    const [salt, digest] = await hashPassword(newPassword);
    await conn.run('UPDATE users SET password_salt=?, password_hash=?, failed_login_count=0, locked_until=0 WHERE id=?', [salt, digest, row.user_id]);
    await conn.run('UPDATE password_reset_tokens SET used_at=? WHERE id=?', [now(), row.id]);
    await conn.run('DELETE FROM sessions WHERE user_id=?', [row.user_id]);
    await audit(conn, row.user_id, 'password_reset_completed', 'user', row.user_id, null, ctx.ip(), ctx.ua());
    await conn.commit();
  });
  return ok(ctx, { ok: true, message: 'Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.' });
}

export async function apiProfileSecurity(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const rows = await conn.all(
      'SELECT sid, created_at, last_seen_at, ip_address, user_agent, expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY last_seen_at DESC',
      [user.id, now()],
    );
    const currentSid = ctx.sessionId();
    return ok(ctx, {
      two_factor_enabled: pyBool(user.two_factor_enabled),
      sessions: rows.map((r) => ({
        id: String(r.sid).slice(0, 12),
        current: r.sid === currentSid,
        created_at: isoTime(r.created_at),
        last_seen_at: isoTime(r.last_seen_at),
        ip_address: r.ip_address,
        device: sl(r.user_agent || '', 120) || 'Bilinmeyen cihaz',
      })),
    });
  });
}

export async function apiSetupTwoFactor(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const password = pyStr(pget(payload, 'current_password', ''));
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    if (!(await verifyPassword(password, user.password_salt, user.password_hash))) throw new HttpError(401, 'Mevcut şifre hatalı');
    const secret = b32encode(randomBytes(20));
    await conn.run('UPDATE users SET two_factor_secret=?, two_factor_enabled=0 WHERE id=?', [secret, user.id]);
    await conn.commit();
    const issuer = quotePlus('Ottoman Yatırım');
    const account = quotePlus(user.email);
    return ok(ctx, { secret, otpauth_url: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&digits=6&period=30` });
  });
}

export async function apiConfirmTwoFactor(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    if (!verifyTotp(pyStr(user.two_factor_secret || ''), pyStr(pget(payload, 'otp', '')))) throw new HttpError(400, 'Doğrulama kodu geçersiz');
    await conn.run('UPDATE users SET two_factor_enabled=1 WHERE id=?', [user.id]);
    await audit(conn, user.id, 'enable_two_factor', 'user', user.id);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiDisableTwoFactor(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    if (!(await verifyPassword(pyStr(pget(payload, 'current_password', '')), user.password_salt, user.password_hash))) throw new HttpError(401, 'Mevcut şifre hatalı');
    await conn.run("UPDATE users SET two_factor_enabled=0, two_factor_secret='' WHERE id=?", [user.id]);
    await audit(conn, user.id, 'disable_two_factor', 'user', user.id);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiRevokeSessions(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    await conn.run('DELETE FROM sessions WHERE user_id=? AND sid<>?', [user.id, ctx.sessionId()]);
    await audit(conn, user.id, 'revoke_other_sessions', 'session', null);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiChangePassword(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const currentPassword = pyStr(pget(payload, 'current_password', ''));
  const newPassword = pyStr(pget(payload, 'new_password', ''));
  if (!passwordIsStrong(newPassword)) throw new HttpError(400, 'Yeni şifre en az 10 karakter, büyük/küçük harf ve rakam içermeli');
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const row = await conn.get('SELECT * FROM users WHERE id=?', [user.id]);
    if (!row || !(await verifyPassword(currentPassword, row.password_salt, row.password_hash))) throw new HttpError(401, 'Mevcut şifre hatalı');
    const [salt, digest] = await hashPassword(newPassword);
    await conn.run('UPDATE users SET password_salt=?, password_hash=? WHERE id=?', [salt, digest, user.id]);
    await conn.run('DELETE FROM sessions WHERE user_id=? AND sid<>?', [user.id, ctx.sessionId()]);
    await audit(conn, user.id, 'change_password', 'user', user.id);
    await conn.commit();
    return ok(ctx, { ok: true, message: 'Şifre güncellendi' });
  });
}

async function saveDocument(conn: any, form: MultipartForm, userId: number, docType: string): Promise<void> {
  const item = fileItem(form, docType);
  if (!item) throw new HttpError(400, `${docType} dosyası gerekli`);
  const contentType = item.type || 'application/octet-stream';
  if (!contentType.startsWith('image/')) throw new HttpError(400, 'Kimlik dosyaları görsel olmalı');
  const raw = readUploadBytes(item, 'Tek dosya 100 MB üstünde olamaz');
  const [encoded, ext] = await transcodeUploadedImage(raw);
  const storedName = `${userId}_${docType}_${tokenHex(8)}${ext}`;
  await storeUpload(conn, storedName, ext === '.png' ? 'image/png' : 'image/jpeg', encoded);
  await conn.run(
    "INSERT INTO documents (user_id, doc_type, original_name, stored_name, content_type, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
    [userId, docType, baseName(item.filename), storedName, contentType, now()],
  );
}

export async function apiUploadDocuments(ctx: Ctx): Promise<Reply> {
  const form = await ctx.readMultipart();
  const sent = ['identity_front', 'identity_back'].filter((t) => form.has(t));
  if (!sent.length) throw new HttpError(400, 'En az bir belge seçmelisin');
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    for (const t of sent) await saveDocument(conn, form, user.id, t);
    if (user.role !== 'admin') await conn.run("UPDATE users SET status='pending', kyc_status='under_review', kyc_note='' WHERE id=?", [user.id]);
    await audit(conn, user.id, 'upload_identity_documents', 'document', user.id);
    await conn.commit();
    return ok(ctx, { ok: true, message: 'Kimlik belgeleri onaya gönderildi', documents: await documentRows(conn, 'WHERE d.user_id=?', [user.id]) }, 201);
  });
}

export async function apiUploadAvatar(ctx: Ctx): Promise<Reply> {
  const form = await ctx.readMultipart();
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const item = fileItem(form, 'avatar');
    if (!item) throw new HttpError(400, 'avatar dosyası gerekli');
    const contentType = item.type || 'application/octet-stream';
    if (!contentType.startsWith('image/')) throw new HttpError(400, 'Profil fotoğrafı görsel olmalı');
    const raw = readUploadBytes(item, 'Dosya çok büyük');
    const [encoded, ext] = await transcodeUploadedImage(raw);
    const storedName = `${user.id}_avatar_${tokenHex(8)}${ext}`;
    await storeUpload(conn, storedName, ext === '.png' ? 'image/png' : 'image/jpeg', encoded);
    const avatarUrl = `/uploads/${storedName}`;
    await conn.run('UPDATE users SET avatar_url=? WHERE id=?', [avatarUrl, user.id]);
    await audit(conn, user.id, 'upload_avatar', 'user', user.id);
    await conn.commit();
    return ok(ctx, { ok: true, avatar_url: avatarUrl }, 201);
  });
}

/* --------------------------------------------------------- bildirimler */

export async function apiNotifications(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const rows = await notificationRows(conn, user.id);
    return ok(ctx, { notifications: rows, unread_count: rows.filter((r) => !r.read_at).length });
  });
}

const NOTIFICATION_EVENTS: Record<string, [string, string, string]> = {
  installed: ['Uygulama eklendi', 'Ottoman e-şube ana ekranına eklendi; bildirimleri buradan takip edebilirsin.', 'genel'],
};

export async function apiNotificationEvent(ctx: Ctx): Promise<Reply> {
  const [payload] = await ctx.readJsonOrMultipart();
  const kind = pyStr(pget(payload, 'kind', '') || '').trim();
  const event = Object.prototype.hasOwnProperty.call(NOTIFICATION_EVENTS, kind) ? NOTIFICATION_EVENTS[kind] : undefined;
  if (!event) throw new HttpError(400, 'Bilinmeyen bildirim olayı');
  const [title, body, category] = event;
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const recent = await conn.get('SELECT id FROM notifications WHERE user_id=? AND title=? AND created_at>? LIMIT 1', [user.id, title, now() - 60 * 60 * 24]);
    if (!recent) { await createNotification(conn, user.id, title, body, category); await conn.commit(); }
    return ok(ctx);
  });
}

export async function apiPushKey(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => { const [, pub] = await pushKeys(conn); return ok(ctx, { key: pub }); });
}

/** `(payload or {})` — null/boş değerler {} olur */
async function payloadOrEmpty(ctx: Ctx): Promise<Row> {
  const v = await ctx.readJson();
  if (!pyBool(v)) return {};
  if (typeof v !== 'object' || Array.isArray(v)) throw new TypeError('payload is not a dict');
  return v;
}

export async function apiPushSubscribe(ctx: Ctx): Promise<Reply> {
  const payload = await payloadOrEmpty(ctx);
  const endpoint = pyStr(firstTruthy(payload.endpoint, '')).trim();
  if (!endpoint.startsWith('https://')) throw new HttpError(400, 'Geçersiz abonelik adresi');
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    await conn.run(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, agent, prefs, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth,
         agent=excluded.agent, prefs=excluded.prefs, last_seen_at=excluded.last_seen_at`,
      [
        user.id, endpoint,
        sl(pyStr(firstTruthy(payload.p256dh, '')), 200), sl(pyStr(firstTruthy(payload.auth, '')), 100), sl(pyStr(firstTruthy(payload.agent, '')), 200),
        sl(pyJson(firstTruthy(payload.prefs, {})), 400), now(), now(),
      ],
    );
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiPushUnsubscribe(ctx: Ctx): Promise<Reply> {
  const payload = await payloadOrEmpty(ctx);
  const endpoint = pyStr(firstTruthy(payload.endpoint, '')).trim();
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    await conn.run('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?', [user.id, endpoint]);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiPushTest(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const cihaz = Number((await conn.get('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id=?', [user.id]))!.n);
    if (!cihaz) throw new HttpError(400, 'Bu hesapta kayıtlı cihaz yok');
    await createNotification(conn, user.id, 'Bildirimler açık', 'Ottoman E-Şube bildirimleri bu cihazda çalışıyor.', 'genel');
    await conn.commit();
    return ok(ctx, { ok: true, cihaz });
  });
}

export async function apiNotificationsRead(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    await conn.run('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL', [now(), user.id]);
    await conn.commit();
    return ok(ctx);
  });
}

export async function apiLogout(ctx: Ctx): Promise<Reply> {
  await withConn(async (conn) => {
    const user = await ctx.currentUser(conn);
    if (user) {
      await conn.run('DELETE FROM sessions WHERE user_id=?', [user.id]);
      await audit(conn, user.id, 'logout', 'session', null);
      await conn.commit();
    }
  });
  return ok(ctx, { ok: true }, 200, { 'Set-Cookie': `${cfg.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` });
}

/* -------------------------------------------------------------- kayıt */

export async function apiRegister(ctx: Ctx): Promise<Reply> {
  const form = await ctx.readMultipart();
  const fullName = fieldValue(form, 'full_name');
  const tc = fieldValue(form, 'tc').replace(/\D/g, '');
  const phone = fieldValue(form, 'phone');
  const email = fieldValue(form, 'email');
  const city = fieldValue(form, 'city');
  const district = fieldValue(form, 'district');
  const birthDate = fieldValue(form, 'birth_date');
  const address = fieldValue(form, 'address');
  const password = fieldValue(form, 'password');
  const referralCode = fieldValue(form, 'referral_code').trim().toUpperCase();
  const accepted: Record<string, boolean> = {
    kvkk: TRUTHY.has(fieldValue(form, 'accept_kvkk')),
    distance_contract: TRUTHY.has(fieldValue(form, 'accept_distance_contract')),
    risk_disclosure: TRUTHY.has(fieldValue(form, 'accept_risk_disclosure')),
  };
  const numericKeys = ['risk_experience', 'risk_horizon', 'risk_loss', 'risk_income', 'trade_frequency', 'knowledge_level'];
  const suitabilityAnswers: Record<string, string> = {};
  for (const k of numericKeys) suitabilityAnswers[k] = fieldValue(form, k);
  suitabilityAnswers.education = fieldValue(form, 'education');
  suitabilityAnswers.occupation = fieldValue(form, 'occupation');
  suitabilityAnswers.traded_products = fieldValue(form, 'traded_products');
  suitabilityAnswers.investment_goal = fieldValue(form, 'investment_goal');
  let suitabilityScore: number;
  try { suitabilityScore = numericKeys.reduce((a, k) => a + Math.max(0, Math.min(3, pyInt(suitabilityAnswers[k]))), 0); } catch { suitabilityScore = -1; }
  if (!fullName) throw new HttpError(400, 'Ad soyad gerekli');
  if (tc.length !== 11) throw new HttpError(400, 'T.C. kimlik numarası 11 haneli olmalı');
  if (!identityNumberIsReal(tc)) throw new HttpError(400, 'T.C. kimlik numarası geçersiz. Lütfen kimliğinizdeki numarayı girin.');
  if (!phone || phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'Telefon numarası eksik');
  if (!passwordIsStrong(password)) throw new HttpError(400, 'Şifre en az 10 karakter olmalı; büyük harf, küçük harf ve rakam içermeli');
  if (email && !EMAIL_RE.test(email)) throw new HttpError(400, 'E-posta adresi geçersiz');
  if (!Object.values(accepted).every(Boolean)) throw new HttpError(400, 'KVKK, sözleşme ve risk bildirimleri kabul edilmelidir');
  if (suitabilityScore < 0 || ['education', 'occupation', 'traded_products', 'investment_goal'].some((k) => !suitabilityAnswers[k])) {
    throw new HttpError(400, 'Yatırım uygunluk soruları tamamlanmalıdır');
  }
  return withConn(async (conn) => {
    if (await conn.get('SELECT id FROM users WHERE tc=?', [tc])) throw new HttpError(409, 'Bu T.C. ile kayıt var');
    let referrer: Row | undefined;
    if (referralCode) referrer = await conn.get('SELECT id FROM users WHERE UPPER(account_no)=?', [referralCode]);
    const [salt, digest] = await hashPassword(password);
    const userId = await conn.insert(
      `INSERT INTO users
         (tc, password_salt, password_hash, full_name, phone, email, city, district, birth_date, address, role, status, kyc_status, kyc_note, risk_profile, suitability_score, suitability_completed_at, agreements_version, agreements_accepted_at, referred_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'pending', 'awaiting_back', 'Kimlik belgelerinizi profilinizden yükleyin.', ?, ?, ?, ?, ?, ?, ?)`,
      [tc, salt, digest, fullName, phone, email, city, district, birthDate, address, riskProfileFor(suitabilityScore), suitabilityScore, now(), cfg.agreementsVersion, now(), referrer ? referrer.id : null, now()],
    );
    await conn.run('UPDATE users SET account_no=? WHERE id=?', [await generateAccountNo(conn), userId]);
    await conn.run('INSERT INTO accounts (user_id, cash_balance, blocked_balance, credit_limit) VALUES (?, 0, 0, 0)', [userId]);
    for (const key of Object.keys(accepted)) {
      await conn.run('INSERT INTO user_agreements (user_id, agreement_type, agreement_version, accepted_at, ip_address) VALUES (?, ?, ?, ?, ?)', [userId, key, cfg.agreementsVersion, now(), ctx.ip()]);
    }
    await conn.run(
      'INSERT INTO suitability_assessments (user_id, answers_json, score, risk_profile, completed_at) VALUES (?, ?, ?, ?, ?)',
      [userId, pyJson(suitabilityAnswers), suitabilityScore, riskProfileFor(suitabilityScore), now()],
    );
    await audit(conn, userId, 'register', 'user', userId);
    await conn.commit();
    return ok(ctx, { ok: true, status: 'pending', message: 'Hesap oluşturuldu. Kimlik belgeleri profilden yüklenmeli.' }, 201);
  });
}

/* ------------------------------------------------------ piyasa / haber */

export async function apiMarket(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const quotes = await refreshMarket(conn);
    return ok(ctx, { quotes, source: 'trrealapi-market', updated_at: isoTime(), meta: await marketStatus(conn) });
  });
}

export async function apiMarketSparklines(ctx: Ctx): Promise<Reply> {
  const raw = ctx.q('symbols');
  let symbols: string[] = [];
  for (const piece of raw.split(',')) {
    const sym = cleanSymbol(piece);
    if (sym && !symbols.includes(sym)) symbols.push(sym);
  }
  symbols = symbols.slice(0, 40);
  if (!symbols.length) throw new HttpError(400, 'symbols parametresi gerekli');
  const limit = Math.max(2, Math.min(40, envInt('SPARKLINE_POINTS', 20)));
  const series: Record<string, number[]> = {};
  await withConn(async (conn) => {
    for (const symbol of symbols) {
      const rows = await conn.all('SELECT price FROM market_history WHERE symbol=? ORDER BY recorded_at DESC LIMIT ?', [symbol, limit]);
      series[symbol] = rows.map((r) => r.price).reverse();
    }
  });
  return ok(ctx, { series });
}

export async function apiPublicConfig(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const s = await settingsMap(conn);
    const company = {
      name: s.official_company_name ?? '', registry_number: s.official_registry_number ?? '', mersis_number: s.official_mersis_number ?? '',
      address: s.official_address ?? '', phone: s.official_phone ?? '', email: s.official_email ?? '', license_text: s.official_license_text ?? '',
    };
    const rateBps = Math.max(0, pyFloat(firstTruthy(s.commission_rate_bps ?? '0', 0)));
    return ok(ctx, {
      company,
      branding: {
        name: s.brand_name ?? 'Ottoman',
        descriptor: s.brand_descriptor ?? 'ÖZEL PORTFÖY & YATIRIM',
        symbol: s.brand_symbol ?? 'A',
        logo_url: s.brand_logo_url ?? '/favicon.svg',
        tagline: s.brand_tagline ?? 'Prestijli Varlık ve Fon Yönetimi',
        primary: s.ui_primary_color ?? '#007b53',
        accent: s.ui_accent_color ?? '#00a875',
        danger: s.ui_danger_color ?? '#ef4444',
        font: s.ui_font_family ?? 'Inter',
        radius: s.ui_radius ?? '16',
        support_email: s.content_support_email ?? s.official_email ?? 'destek@ottoman.local',
        support_phone: s.content_support_phone ?? s.official_phone ?? '0850 888 7000',
      },
      company_information_complete: ['name', 'registry_number', 'address', 'phone', 'email', 'license_text'].every((k) => pyBool((company as any)[k])),
      fees: {
        stock_commission_rate_bps: rateBps,
        stock_commission_rate_percent: rateBps / 100,
        minimum_commission: Math.max(0, pyFloat(firstTruthy(s.minimum_commission ?? '0', 0))),
        configured: rateBps > 0,
      },
      agreements_version: cfg.agreementsVersion,
    });
  });
}

export async function apiContact(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const fullName = sl(pyStr(pget(payload, 'full_name', '')).trim(), 120);
  const email = sl(pyStr(pget(payload, 'email', '')).trim().toLowerCase(), 120);
  const phone = sl(pyStr(pget(payload, 'phone', '')).trim(), 40);
  const subject = sl(pyStr(pget(payload, 'subject', 'Genel Bilgi')).trim(), 120);
  const message = sl(pyStr(pget(payload, 'message', '')).trim(), 2000);
  if (!fullName || !EMAIL_RE.test(email) || plen(message) < 10) throw new HttpError(400, 'Ad, geçerli e-posta ve en az 10 karakterlik mesaj gerekli');
  return withConn(async (conn) => {
    const id = await conn.insert('INSERT INTO contact_messages (full_name, email, phone, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [fullName, email, phone, subject, message, now()]);
    await audit(conn, null, 'create_contact_message', 'contact_message', id, null, ctx.ip(), ctx.ua());
    await conn.commit();
    return ok(ctx, { ok: true, reference: `GM-DST-${String(id).padStart(6, '0')}` }, 201);
  });
}

export async function apiNews(ctx: Ctx): Promise<Reply> {
  const [items, meta] = await latestNews();
  return ok(ctx, { items, meta });
}

export async function apiMarketNews(ctx: Ctx): Promise<Reply> {
  let market: number;
  try { market = pyInt(ctx.query.market?.[0] ?? '0'); } catch { market = 0; }
  if (!(market >= 0 && market < MARKET_NEWS_QUERIES.length)) market = 0;
  const [items, live] = await marketNews(market);
  const sources = [...new Set(items.map((h) => String(h.source || '')))].filter(Boolean).sort();
  return ok(ctx, { market, query: MARKET_NEWS_QUERIES[market], items, meta: { ok: live, count: items.length, source: sources.join(', ') || 'Haber akışı' } });
}

function logoReply(ctx: Ctx, body: Buffer, suffix: string): Reply {
  return { status: 200, headers: { 'Content-Type': suffix === 'svg' ? 'image/svg+xml; charset=utf-8' : 'image/png', 'Cache-Control': 'public, max-age=604800, immutable' }, body };
}

export async function apiCompanyLogo(ctx: Ctx, rawSymbol: string): Promise<Reply> {
  const symbol = cleanSymbol(rawSymbol);
  if (!symbol) throw new HttpError(400, 'Hisse kodu hatalı');
  for (const suffix of ['svg', 'png']) {
    const p = path.join(cfg.logoCacheDir, `${symbol}.${suffix}`);
    try { const st = fs.statSync(p); if (st.isFile() && st.size > 0) return logoReply(ctx, fs.readFileSync(p), suffix); } catch { /* yok */ }
  }
  let row = await withConn(async (conn) => {
    let r = await conn.get('SELECT logo_url FROM market_cache WHERE symbol=?', [symbol]);
    if (!r) { await refreshMarket(conn); r = await conn.get('SELECT logo_url FROM market_cache WHERE symbol=?', [symbol]); }
    return r;
  });
  const tradingviewUrl = row ? String(row.logo_url || '') : '';
  const officialDomain = OFFICIAL_COMPANY_DOMAINS[symbol] ?? '';
  let sourceUrl: string; let suffix: string;
  if (tradingviewUrl.startsWith(`${TRADINGVIEW_LOGO_BASE}/`)) { sourceUrl = tradingviewUrl; suffix = 'svg'; }
  else if (officialDomain) { sourceUrl = `https://www.google.com/s2/favicons?domain_url=https%3A%2F%2F${officialDomain}&sz=128`; suffix = 'png'; }
  else throw new HttpError(404, 'Logo bulunamadı');
  let body: Buffer;
  try { ({ body } = await httpBytes(sourceUrl, { headers: { 'User-Agent': UA_BACKEND }, timeoutMs: Math.max(10, cfg.marketTimeout) * 1000, maxBytes: 512_001 })); }
  catch { throw new HttpError(502, 'Logo kaynağına ulaşılamadı'); }
  const valid = suffix === 'svg' ? body.subarray(0, 2048).toString('latin1').toLowerCase().includes('<svg') : body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (body.length > 512_000 || !valid) throw new HttpError(502, 'Logo kaynağı geçersiz');
  fs.mkdirSync(cfg.logoCacheDir, { recursive: true });
  fs.writeFileSync(path.join(cfg.logoCacheDir, `${symbol}.${suffix}`), body);
  return logoReply(ctx, body, suffix);
}

export async function companyProfile(conn: any, quote: Row): Promise<Row> {
  const symbol = quote.symbol;
  const custom = await conn.get('SELECT * FROM stock_descriptions WHERE symbol=?', [symbol]);
  let description = custom ? String(custom.description || '').trim() : '';
  const activity = String(quote.industry || quote.sector || 'sermaye piyasaları').trim();
  if (!description) {
    description =
      `${quote.name}, Borsa İstanbul'da ${symbol} koduyla işlem gören halka açık bir şirkettir. ` +
      `Şirketin güncel faaliyet sınıflandırması ${activity} alanındadır. Finansal sonuçlar, özel durum açıklamaları ` +
      've yönetim duyuruları resmi KAP bildirimleriyle birlikte değerlendirilmelidir.';
  }
  return {
    description,
    risk_note: custom ? String(custom.risk_note || '').trim() : '',
    sector: String(quote.sector || 'Belirtilmemiş'),
    industry: String(quote.industry || quote.sector || 'Belirtilmemiş'),
    official_site: symbol in OFFICIAL_COMPANY_DOMAINS ? `https://${OFFICIAL_COMPANY_DOMAINS[symbol]}/` : '',
  };
}

export async function apiCompany(ctx: Ctx, rawSymbol: string): Promise<Reply> {
  const symbol = cleanSymbol(rawSymbol);
  if (!symbol) throw new HttpError(400, 'Hisse kodu hatalı');
  return withConn(async (conn) => {
    await ctx.requireUser(conn);
    await refreshMarket(conn);
    const quote = await findQuote(conn, symbol);
    if (!quote || quote.asset_class !== 'stock') throw new HttpError(404, 'Hisse bulunamadı');
    const profile = await companyProfile(conn, quote);
    const [news, analysis] = await companyNews(symbol, quote.name);
    const history = (await conn.all('SELECT price, recorded_at FROM market_history WHERE symbol=? ORDER BY recorded_at DESC LIMIT 120', [symbol])).reverse();
    const researchSources: Row[] = [];
    if (profile.official_site) researchSources.push({ name: 'Resmi Şirket Sitesi', description: 'Kurumsal profil, faaliyetler ve yatırımcı ilişkileri', url: profile.official_site });
    researchSources.push(
      { name: 'İş Yatırım Şirket Kartı', description: 'Finansallar, oranlar ve yayımlanmış araştırma raporları', url: `https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=${symbol}` },
      { name: 'TradingView Teknik Görünüm', description: 'Fiyat grafiği ve teknik göstergeler', url: `https://tr.tradingview.com/symbols/BIST-${symbol}/technicals/` },
      { name: 'KAP Bildirimleri', description: 'Resmi şirket bildirimleri ve finansal açıklamalar', url: 'https://www.kap.org.tr/tr/bildirim-sorgu' },
    );
    return ok(ctx, {
      quote, profile, news: news.slice(0, 4), analysis: analysis.slice(0, 3),
      history: history.map((i) => ({ price: i.price, recorded_at: i.recorded_at, recorded_at_label: isoTime(i.recorded_at) })),
      research_sources: researchSources,
      disclaimer: 'Haber ve araştırma bağlantıları bilgi amaçlıdır; yatırım tavsiyesi değildir.',
    });
  });
}

export async function apiSystemBankAccounts(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => ok(ctx, { bank_accounts: await systemBankAccountRows(conn, true) }));
}

/* ------------------------------------------------- portföy / emir / para */

export async function apiPortfolio(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    await settleDueT2(conn);
    const user = await ctx.requireUser(conn);
    const account = await accountFor(conn, user.id);
    const positions = await portfolioRows(conn, user.id);
    const orders = await orderRows(conn, 'WHERE o.user_id=?', [user.id]);
    const money = await moneyRows(conn, 'WHERE m.user_id=?', [user.id]);
    const bankAccounts = await userBankAccountRows(conn, user.id);
    const transactions = await transactionRows(conn, 'WHERE t.user_id=?', [user.id]);
    const settlements = await t2SettlementRows(conn, 'WHERE s.user_id=?', [user.id]);
    const systemAccounts = await systemBankAccountRows(conn, true);
    const documents = await documentRows(conn, 'WHERE d.user_id=?', [user.id]);
    const settings = await settingsMap(conn);
    await recordPortfolioSnapshot(conn, user.id);
    return ok(ctx, {
      account, positions, orders, money_requests: money, bank_accounts: bankAccounts, transactions, t2_settlements: settlements,
      system_bank_accounts: systemAccounts, documents, settlement_settings: { t2_enabled: (settings.t2_enabled ?? '0') === '1' },
    });
  });
}

export async function apiPortfolioHistory(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    await recordPortfolioSnapshot(conn, user.id);
    let symbols = (await portfolioRows(conn, user.id)).filter((r) => (Number(r.quantity) || 0) > 0).map((r) => String(r.symbol || '').toUpperCase());
    symbols = [...new Set(symbols)].filter(Boolean).slice(0, 25);
    const series = symbols.length ? await priceHistoryFor(conn, symbols) : {};
    return ok(ctx, { history: await portfolioHistoryRows(conn, user.id), series });
  });
}

export async function apiOrders(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    return ok(ctx, { orders: await orderRows(conn, 'WHERE o.user_id=?', [user.id]) });
  });
}

export async function apiTransactionsExport(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const rows = await filteredTransactions(conn, user.id, ctx.query as Query);
    return ctx.csv('hesap-hareketleri.csv', ['Referans', 'Tarih', 'İşlem', 'Sembol', 'Adet', 'Fiyat', 'Tutar', 'Bakiye', 'Açıklama'],
      rows.map((r) => [r.reference, r.created_at_label, r.type_label, r.code, r.quantity, pyFloatCell(r.price), pyFloatCell(r.total), pyFloatCell(r.balance_after), r.note]));
  });
}

export async function apiCancelOrder(ctx: Ctx, orderId: number): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    ensureNotSuspended(user);
    const order = await conn.get('SELECT * FROM orders WHERE id=? AND user_id=?', [orderId, user.id]);
    if (!order || order.status !== 'pending') throw new HttpError(404, 'İptal edilebilir bekleyen emir bulunamadı');
    if (order.side === 'buy') await releaseOrderReservation(conn, orderId);
    await conn.run("UPDATE orders SET status='cancelled', admin_note=?, reviewed_at=? WHERE id=?", ['Kullanıcı tarafından iptal edildi', now(), orderId]);
    await audit(conn, user.id, 'cancel_order', 'order', orderId);
    await conn.commit();
    return ok(ctx, { ok: true, message: 'Emir iptal edildi' });
  });
}

export async function apiEditOrder(ctx: Ctx, orderId: number): Promise<Reply> {
  const payload = await ctx.readObject();
  const quantity = pyIntOfFloat(or0(pget(payload, 'quantity', 0)));
  const price = pyFloat(or0(pget(payload, 'limit_price', 0)));
  if (quantity <= 0 || price <= 0) throw new HttpError(400, 'Emir bilgileri hatalı');
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    const order = await conn.get('SELECT * FROM orders WHERE id=? AND user_id=?', [orderId, user.id]);
    if (!order || order.status !== 'pending') throw new HttpError(404, 'Düzenlenebilir bekleyen emir bulunamadı');
    const grossTotal = pyRound(quantity * price, 2);
    const commission = await commissionFor(conn, grossTotal);
    const total = pyRound(order.side === 'buy' ? grossTotal + commission : Math.max(0, grossTotal - commission), 2);
    if (order.side === 'buy') {
      const diff = pyRound(total - Number(order.total), 2);
      if (diff > 0) await reserveBuyingPower(conn, user.id, orderId, diff);
      else if (diff < 0) await releaseOrderReservation(conn, orderId, Math.abs(diff));
    } else if ((await availablePositionQuantity(conn, user.id, order.symbol, orderId)) < quantity) {
      throw new HttpError(422, 'Yetersiz satılabilir hisse');
    }
    await conn.run('UPDATE orders SET quantity=?, limit_price=?, gross_total=?, commission=?, total=?, reviewed_at=NULL WHERE id=?', [quantity, price, grossTotal, commission, total, orderId]);
    await audit(conn, user.id, 'edit_order', 'order', orderId, { total: flt(total) });
    await conn.commit();
    return ok(ctx, { order: (await orderRows(conn, 'WHERE o.id=?', [orderId]))[0], message: 'Emir güncellendi' });
  });
}

export async function apiCreateOrder(ctx: Ctx): Promise<Reply> {
  const payload = await ctx.readObject();
  const symbol = pyStr(pget(payload, 'symbol', '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const side = pyStr(pget(payload, 'side', '')).toLowerCase();
  const amountMode = pyStr(pget(payload, 'amount_mode', 'quantity')).toLowerCase();
  let quantity: number; let cashAmount: number;
  try {
    quantity = pyIntOfFloat(or0(pget(payload, 'quantity', 0)));
    cashAmount = pyFloat(or0(pget(payload, 'cash_amount', 0)));
  } catch { throw new HttpError(400, 'Emir tutarı veya adedi hatalı'); }
  const orderType = pyStr(pget(payload, 'order_type', 'limit')).toLowerCase();
  const cancelRemaining = TRUTHY.has(pyStr(pget(payload, 'cancel_remaining', '')).toLowerCase()) ? 1 : 0;
  const note = sl(pyStr(pget(payload, 'note', '')), 500);
  const clientOrderId = sl(pyStr(pget(payload, 'client_order_id', '')).replace(/[^A-Za-z0-9_-]/g, ''), 64);
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    ensureNotSuspended(user);
    await settleDueT2(conn);
    const settings = await settingsMap(conn);
    if (settings.maintenance_mode === '1') throw new HttpError(503, 'Platform bakım modunda');
    if (settings.trading_enabled !== '1') throw new HttpError(403, 'Alım-satım işlemleri geçici olarak kapalı');
    if (user.role !== 'admin' && user.status !== 'approved') throw new HttpError(403, 'Kayıt onayı olmadan emir oluşturulamaz');
    if (!['buy', 'sell'].includes(side) || !symbol || !['limit', 'market'].includes(orderType)) throw new HttpError(400, 'Emir bilgileri hatalı');
    const quote = await findQuote(conn, symbol, true);
    if (!quote || quote.asset_class !== 'stock') throw new HttpError(404, 'Hisse bulunamadı');
    const sourceState = await marketStatus(conn);
    if (cfg.requireLiveMarketForTrading && (!pyBool(sourceState.ok) || now() - Math.trunc(Number(quote.updated_at) || 0) > Math.max(300, cfg.marketRefreshSeconds * 5))) {
      throw new HttpError(503, 'Canlı piyasa verisi doğrulanamadığı için emir geçici olarak kapalı');
    }
    if (clientOrderId) {
      const existing = await conn.get('SELECT id FROM orders WHERE user_id=? AND client_order_id=?', [user.id, clientOrderId]);
      if (existing) return ok(ctx, { order: (await orderRows(conn, 'WHERE o.id=?', [existing.id]))[0], duplicate: true });
    }
    const baseQuotePrice = Number(quote.price);
    const clientPrice = pyFloat(or0(firstTruthy(pget(payload, 'price'), pget(payload, 'limit_price'), 0)));
    let price: number;
    if (orderType === 'market') {
      if (clientPrice > 0) {
        const maxAllowedDiff = Math.max(1.5, baseQuotePrice * 0.05);
        price = Math.abs(clientPrice - baseQuotePrice) <= maxAllowedDiff ? pyRound(clientPrice, 2) : pyRound(baseQuotePrice, 2);
      } else price = pyRound(baseQuotePrice, 2);
    } else {
      price = pyFloat(firstTruthy(pget(payload, 'limit_price'), baseQuotePrice));
    }
    if (price <= 0) throw new HttpError(400, 'Fiyat hatalı');
    if (side === 'buy' && amountMode === 'cash') {
      if (cashAmount <= 0) throw new HttpError(400, 'Geçerli TL tutarı girin');
      quantity = Math.trunc(cashAmount / price);
      while (quantity > 0) {
        const candidateGross = pyRound(quantity * price, 2);
        if (candidateGross + (await commissionFor(conn, candidateGross)) <= cashAmount + 0.001) break;
        quantity -= 1;
      }
    }
    if (quantity <= 0) throw new HttpError(400, side === 'buy' && amountMode === 'cash' ? 'TL tutarı en az 1 adet hisse alacak kadar olmalı' : 'Emir adedi hatalı');
    const grossTotal = pyRound(quantity * price, 2);
    const commission = await commissionFor(conn, grossTotal);
    const total = pyRound(side === 'buy' ? grossTotal + commission : Math.max(0, grossTotal - commission), 2);
    const account = await accountFor(conn, user.id);
    if (side === 'buy' && buyingPower(account) < total) throw new HttpError(422, 'Yetersiz işlem bakiyesi');
    if (side === 'sell' && (await availablePositionQuantity(conn, user.id, symbol)) < quantity) throw new HttpError(422, 'Yetersiz satılabilir hisse');
    const status = orderType === 'market' ? 'approved' : 'pending';
    const orderId = await conn.insert(
      `INSERT INTO orders
         (user_id, symbol, side, order_type, quantity, limit_price, source_price, gross_total, commission, total, client_order_id, execution_reference, price_updated_at, cancel_remaining, status, note, created_at, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, symbol, side, orderType, quantity, price, quote.price, grossTotal, commission, total, clientOrderId,
        `GM-EMR-${now()}-${String(randomInt(0, 10000)).padStart(4, '0')}`, Math.trunc(Number(quote.updated_at) || 0) || now(), cancelRemaining, status, note, now(), status === 'approved' ? now() : null],
    );
    if (side === 'buy') {
      const before = buyingPower(account);
      const [cashUsed, pendingUsed] = await reserveBuyingPower(conn, user.id, orderId, total);
      const after = pyRound(before - total, 2);
      if (orderType === 'market') {
        await upsertPosition(conn, user.id, symbol, quantity, price);
        const detail = `Brüt: ${fmt2(grossTotal)} · Komisyon: ${fmt2(commission)} · Çekilebilir: ${fmt2(cashUsed)} · T+2: ${fmt2(pendingUsed)}`;
        await writeTransaction(conn, user.id, 'trade_buy', total, before, after, { orderId, code: symbol, name: quote.name, quantity, price, note: detail });
      }
    } else if (orderType === 'market') {
      const avgPrice = await positionAvgPrice(conn, user.id, symbol);
      await reducePosition(conn, user.id, symbol, quantity);
      await creditSaleProceeds(conn, user.id, orderId, symbol, quote.name, total, quantity, price, `Ortalama maliyet: ${fmt2(avgPrice)} · Brüt: ${fmt2(grossTotal)} · Komisyon: ${fmt2(commission)}`);
      await notifyReferralsOfSale(conn, user.id, symbol, quantity);
    }
    await audit(conn, user.id, 'create_order', 'order', orderId, { symbol, side, total: flt(total), order_type: orderType });
    await conn.commit();
    return ok(ctx, { order: (await orderRows(conn, 'WHERE o.id=?', [orderId]))[0] }, 201);
  });
}

export async function apiMoneyRequests(ctx: Ctx): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    return ok(ctx, { money_requests: await moneyRows(conn, 'WHERE m.user_id=?', [user.id]) });
  });
}

async function saveMoneyReceipt(conn: any, form: MultipartForm | null, userId: number): Promise<Row> {
  if (form === null || !form.has('receipt')) return {};
  const item = fileItem(form, 'receipt');
  if (!item) return {};
  const contentType = item.type || 'application/octet-stream';
  if (!(contentType.startsWith('image/') || contentType === 'application/pdf')) throw new HttpError(400, 'Dekont görsel veya PDF olmalı');
  let ext = suffixOf(item.filename).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)) ext = contentType === 'application/pdf' ? '.pdf' : '.jpg';
  const storedName = `${userId}_receipt_${tokenHex(8)}${ext}`;
  const data = item.data || Buffer.alloc(0);
  if (data.length > cfg.maxUploadBytes) throw new HttpError(413, 'Dekont dosyası 100 MB üstünde olamaz');
  await storeUpload(conn, storedName, contentType, data);
  return { original_name: baseName(item.filename), stored_name: storedName, content_type: contentType };
}

export async function apiCreateMoneyRequest(ctx: Ctx): Promise<Reply> {
  const [payload, form] = await ctx.readJsonOrMultipart();
  const requestType = pyStr(pget(payload, 'request_type', '')).toLowerCase();
  const amount = pyFloat(or0(pget(payload, 'amount', 0)));
  let accountRef = sl(pyStr(pget(payload, 'account_ref', '')), 160);
  let transferCode = sl(pyStr(pget(payload, 'transfer_code', '')).trim(), 80);
  let note = sl(pyStr(pget(payload, 'note', '')), 500);
  if (!['deposit', 'withdraw', 'credit'].includes(requestType) || amount <= 0) throw new HttpError(400, 'Geçerli bir tutar girin');
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    ensureNotSuspended(user);
    if (user.role !== 'admin' && user.status !== 'approved') throw new HttpError(403, 'Hesabınız onaylanmadan para işlemi yapılamaz');
    const account = await accountFor(conn, user.id);
    let bankAccountId: number | null = null;
    if (requestType === 'deposit' && !accountRef) {
      const bankRow = await conn.get('SELECT * FROM system_bank_accounts WHERE is_active=1 ORDER BY sort_order ASC, id ASC LIMIT 1');
      accountRef = bankRow ? bankRow.iban : '';
    }
    let receipt: Row = form !== null && requestType === 'deposit' ? await saveMoneyReceipt(conn, form, user.id) : {};
    if (requestType === 'deposit') {
      transferCode = transferCode || `${user.account_no || 'GM'}-${now()}`;
      const selectedIban = turkishIban(accountRef);
      const bankRow = selectedIban ? await conn.get("SELECT * FROM system_bank_accounts WHERE is_active=1 AND REPLACE(iban, ' ', '')=?", [selectedIban]) : undefined;
      if (!bankRow) throw new HttpError(400, 'Geçerli ve aktif transfer hesabı bulunamadı');
      if (!Object.keys(receipt).length) receipt = { original_name: '', stored_name: '', content_type: '' };
      accountRef = selectedIban;
    }
    if (requestType === 'withdraw') {
      if (amount < 500) throw new HttpError(400, "Minimum çekim tutarı 500 TL'dir");
      const accountHolder = sl(pyStr(pget(payload, 'account_holder', '')).trim(), 120);
      const bankName = sl(pyStr(pget(payload, 'bank_name', '')).trim(), 120);
      const iban = turkishIban(pyStr(pget(payload, 'iban', '')));
      if (!accountHolder) throw new HttpError(400, 'Hesap adı giriniz');
      if (!bankName) throw new HttpError(400, 'Banka adı giriniz');
      if (!iban) throw new HttpError(400, "Geçerli bir Türkiye IBAN'ı giriniz");
      const norm = (s: string) => casefold(s.replace(/\s+/g, ' ').trim());
      if (norm(accountHolder) !== norm(String(user.full_name))) throw new HttpError(400, 'Çekim hesabı sahibi kullanıcı adıyla aynı olmalıdır');
      const cekilebilir = pyRound(Number(account.cash_balance) - (await pendingWithdrawalsFor(conn, user.id)), 2);
      if (cekilebilir + 0.001 < amount) throw new HttpError(422, 'Yetersiz bakiye');
      await conn.run('INSERT INTO bank_accounts (user_id, bank_name, iban, account_holder, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING', [user.id, bankName, iban, accountHolder, now()]);
      const row = await conn.get('SELECT id FROM bank_accounts WHERE user_id=? AND iban=?', [user.id, iban]);
      bankAccountId = row ? row.id : null;
      accountRef = iban;
      note = note || `${bankName} - ${accountHolder}`;
    }
    const id = await conn.insert(
      `INSERT INTO money_requests
         (user_id, request_type, amount, bank_account_id, account_ref, transfer_code, note, receipt_name, receipt_stored_name, receipt_content_type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [user.id, requestType, amount, bankAccountId, accountRef, transferCode, note, receipt.original_name ?? '', receipt.stored_name ?? '', receipt.content_type ?? '', now()],
    );
    await audit(conn, user.id, 'create_money_request', 'money_request', id, { type: requestType, amount: flt(amount) });
    await conn.commit();
    return ok(ctx, { request: (await moneyRows(conn, 'WHERE m.id=?', [id]))[0] }, 201);
  });
}

export async function apiCancelMoneyRequest(ctx: Ctx, requestId: number): Promise<Reply> {
  return withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    ensureNotSuspended(user);
    const item = await conn.get('SELECT * FROM money_requests WHERE id=? AND user_id=?', [requestId, user.id]);
    if (!item || item.status !== 'pending' || item.request_type !== 'withdraw') throw new HttpError(404, 'İptal edilebilir para çekme talebi bulunamadı');
    await conn.run("UPDATE money_requests SET status='rejected', admin_note=?, reviewed_at=? WHERE id=?", ['Kullanıcı tarafından iptal edildi', now(), requestId]);
    await audit(conn, user.id, 'cancel_withdrawal_request', 'money_request', requestId);
    await conn.commit();
    return ok(ctx, { ok: true, message: 'Para çekme talebi iptal edildi' });
  });
}

/** ottoman'da bu uç `self.db()` tanımsız olduğu için her zaman 500 döner; aynı davranış korunur. */
export async function apiBrokenReset(_ctx: Ctx): Promise<Reply> {
  throw new TypeError("'AppHandler' object has no attribute 'db'");
}

export { decorateOrder, MARKET_URLS, strip };
