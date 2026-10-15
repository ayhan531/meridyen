/** Yol tablosu: Python AppHandler.route_api / dispatch ile aynı sıra ve aynı eşleşme kuralları. */
import { withConn } from './db';
import { HttpError, isoTime, Row, now, pyInt } from './common';
import { canViewUpload, Ctx, mimeFor, Reply } from './ctx';
import * as U from './handlers-user';
import * as A from './handlers-admin';

const isDigit = (s: string) => /^\d+$/.test(s);
/** int(x): sayı değilse ValueError (→ 500) */
const toInt = (s: string) => pyInt(s);

export async function apiHealth(ctx: Ctx): Promise<Reply> {
  await withConn((conn) => conn.get('SELECT 1'));
  return ctx.json({ ok: true, db: true, storage: true, time: isoTime(now()) }, 200);
}

export async function serveUpload(ctx: Ctx, urlPath: string): Promise<Reply> {
  const filename = urlPath.replace(/\/+$/, '').split('/').pop() ?? '';
  const row: Row | undefined = await withConn(async (conn) => {
    const user = await ctx.requireUser(conn);
    if (!(await canViewUpload(conn, user, filename))) throw new HttpError(403, 'Dosya erişim yetkisi yok');
    return conn.get('SELECT content_type, data FROM uploaded_files WHERE name=?', [filename]);
  });
  if (!row) throw new HttpError(404, 'Dosya bulunamadı');
  const data: Buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
  return { status: 200, headers: { 'Content-Type': mimeFor(filename), 'Cache-Control': 'no-cache' }, body: data };
}

type Handler = (ctx: Ctx) => Promise<Reply>;

const GET: Record<string, Handler> = {
  '/api/me': U.apiMe,
  '/api/profile/security': U.apiProfileSecurity,
  '/api/public/config': U.apiPublicConfig,
  '/api/market': U.apiMarket,
  '/api/market/sparklines': U.apiMarketSparklines,
  '/api/news': U.apiNews,
  '/api/market-news': U.apiMarketNews,
  '/api/system-bank-accounts': U.apiSystemBankAccounts,
  '/api/notifications': U.apiNotifications,
  '/api/push/key': U.apiPushKey,
  '/api/portfolio': U.apiPortfolio,
  '/api/portfolio/history': U.apiPortfolioHistory,
  '/api/orders': U.apiOrders,
  '/api/transactions/export': U.apiTransactionsExport,
  '/api/money-requests': U.apiMoneyRequests,
  '/api/admin/summary': A.apiAdminSummary,
  '/api/admin/users': A.apiAdminUsers,
  '/api/admin/orders': A.apiAdminOrders,
  '/api/admin/money': A.apiAdminMoney,
  '/api/admin/reports': A.apiAdminReports,
  '/api/admin/reports/export': A.apiAdminReportsExport,
  '/api/admin/project-export': A.apiAdminProjectExport,
  '/api/admin/project-export/apk': A.apiAdminProjectExportApk,
  '/api/admin/contact-messages': A.apiAdminContactMessages,
  '/api/admin/documents': A.apiAdminDocuments,
  '/api/admin/bank-accounts': A.apiAdminBankAccounts,
  '/api/admin/t2-settlements': A.apiAdminT2Settlements,
  '/api/admin/transactions': A.apiAdminTransactions,
  '/api/admin/positions': A.apiAdminPositions,
  '/api/admin/user-balances': A.apiAdminUserBalances,
  '/api/admin/system-settings': A.apiAdminSystemSettings,
  '/api/admin/prices': A.apiAdminPrices,
  '/api/admin/stock-names': A.apiAdminStockNames,
  '/api/admin/participation': A.apiAdminParticipationList,
  '/api/admin/audit': A.apiAdminAudit,
  '/api/admin/stock-descriptions': A.apiAdminStockDescriptions,
  '/api/admin/render/status': A.apiAdminRenderStatus,
};

const POST: Record<string, Handler> = {
  '/api/login': U.apiLogin,
  '/api/password/forgot': U.apiForgotPassword,
  '/api/password/reset': U.apiResetPassword,
  '/api/logout': U.apiLogout,
  '/api/profile/password': U.apiChangePassword,
  '/api/profile/2fa/setup': U.apiSetupTwoFactor,
  '/api/profile/2fa/confirm': U.apiConfirmTwoFactor,
  '/api/profile/2fa/disable': U.apiDisableTwoFactor,
  '/api/profile/sessions/revoke': U.apiRevokeSessions,
  '/api/profile/documents': U.apiUploadDocuments,
  '/api/profile/avatar': U.apiUploadAvatar,
  '/api/register': U.apiRegister,
  '/api/contact': U.apiContact,
  '/api/notifications/event': U.apiNotificationEvent,
  '/api/notifications/read': U.apiNotificationsRead,
  '/api/push/subscribe': U.apiPushSubscribe,
  '/api/push/unsubscribe': U.apiPushUnsubscribe,
  '/api/push/test': U.apiPushTest,
  '/api/orders': U.apiCreateOrder,
  '/api/money-requests': U.apiCreateMoneyRequest,
  '/api/admin/step-up': A.apiAdminStepUp,
  '/api/admin/bank-accounts': A.apiAdminSaveSystemBankAccount,
  '/api/admin/system-settings': A.apiAdminSaveSystemSettings,
  '/api/admin/prices': A.apiAdminSavePrice,
  '/api/admin/market-feed': A.apiAdminFeedSwitch,
  '/api/admin/stock-names': A.apiAdminSaveStockName,
  '/api/admin/participation': A.apiAdminSaveParticipation,
  '/api/admin/participation/sync': A.apiAdminParticipationSync,
  '/api/admin/participation/import': A.apiAdminParticipationImport,
  '/api/admin/create-user': A.apiAdminCreateUser,
  '/api/admin/stock-descriptions': A.apiAdminSaveStockDescription,
  '/api/admin/render/deploy': A.apiAdminRenderDeploy,
  '/api/admin/render/domain': A.apiAdminRenderDomain,
  '/api/admin/reset-account': U.apiBrokenReset,
  '/api/my/reset': U.apiBrokenReset,
};

/** route_api: eşleşen işleyiciyi çalıştırır; hiçbiri uymazsa 404 "İşlem bulunamadı". */
export async function routeApi(ctx: Ctx, method: string, path: string): Promise<Reply> {
  if (path === '/api/profile/reset' && (method === 'GET' || method === 'POST')) {
    if (method === 'POST') await ctx.readJson();   // Python önce read_json() çağırır; ardından self.db() yüzünden 500
    return U.apiBrokenReset(ctx);
  }
  if (method === 'GET' && GET[path]) return GET[path](ctx);
  if (method === 'POST' && POST[path]) return POST[path](ctx);

  const parts = path.replace(/^\/+|\/+$/g, '').split('/');
  if (method === 'GET') {
    if (path.startsWith('/api/logo/') && parts.length === 3) return U.apiCompanyLogo(ctx, parts[2]);
    if (path.startsWith('/api/company/') && parts.length === 3) return U.apiCompany(ctx, parts[2]);
    if (parts.length === 5 && parts[0] === 'api' && parts[1] === 'admin' && parts[2] === 'users' && isDigit(parts[3]) && parts[4] === 'sessions') return A.apiAdminUserSessions(ctx, toInt(parts[3]));
  }
  if (method === 'POST') {
    const adminSeg = parts[0] === 'api' && parts[1] === 'admin';
    if (parts.length === 6 && adminSeg && parts[2] === 'users' && isDigit(parts[3]) && parts[4] === 'sessions' && parts[5] === 'revoke') return A.apiAdminRevokeUserSession(ctx, toInt(parts[3]));
    if (parts.length === 4 && parts[0] === 'api' && parts[1] === 'orders' && parts[3] === 'cancel') return U.apiCancelOrder(ctx, toInt(parts[2]));
    if (parts.length === 4 && parts[0] === 'api' && parts[1] === 'orders' && parts[3] === 'edit') return U.apiEditOrder(ctx, toInt(parts[2]));
    if (parts.length === 4 && parts[0] === 'api' && parts[1] === 'money-requests' && parts[3] === 'cancel') return U.apiCancelMoneyRequest(ctx, toInt(parts[2]));
    if (parts.length === 4 && adminSeg && parts[2] === 'bank-accounts') return A.apiAdminBankAccountAction(ctx, toInt(parts[3]));
    if (parts.length === 5 && adminSeg && parts[2] === 'documents' && isDigit(parts[3])) return A.apiAdminDocumentAction(ctx, toInt(parts[3]), parts[4]);
    if (parts.length === 5 && adminSeg && parts[2] === 't2-settlements' && isDigit(parts[3]) && parts[4] === 'delete') return A.apiAdminDeleteT2(ctx, toInt(parts[3]));
    if (parts.length === 4 && adminSeg && parts[2] === 't2-settlements' && isDigit(parts[3])) return A.apiAdminSettleT2(ctx, toInt(parts[3]));
    if (parts.length === 5 && adminSeg && parts[2] === 'users' && isDigit(parts[3]) && parts[4] === 'password') return A.apiAdminSetPassword(ctx, toInt(parts[3]));
    if (parts.length === 5 && adminSeg && parts[2] === 'users' && isDigit(parts[3]) && parts[4] === 'delete') return A.apiAdminDeleteUser(ctx, toInt(parts[3]));
    if (parts.length === 4 && adminSeg && parts[2] === 'users' && isDigit(parts[3])) return A.apiAdminUpdateUser(ctx, toInt(parts[3]));
    if (parts.length === 3 && adminSeg && parts[2] === 'balances') return A.apiAdminAdjustBalance(ctx);
    if (parts.length === 3 && adminSeg && parts[2] === 'positions') return A.apiAdminAdjustPosition(ctx);
    if (parts.length === 5 && adminSeg && ['users', 'orders', 'money'].includes(parts[2])) return A.apiAdminAction(ctx, parts[2], toInt(parts[3]), parts[4]);
  }
  throw new HttpError(404, 'İşlem bulunamadı');
}
