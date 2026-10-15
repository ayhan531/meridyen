import { Conn } from './db';
import { now, pyJson } from './common';

/** Denetim kaydı (Python: audit). */
export async function audit(
  conn: Conn,
  actorId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  payload: Record<string, any> | null = null,
  ip = '',
  userAgent = '',
  requestId = '',
): Promise<void> {
  await conn.run(
    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, payload, ip_address, user_agent, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [actorId, action, entityType, entityId, pyJson(payload || {}), ip.slice(0, 64), userAgent.slice(0, 240), requestId.slice(0, 80), now()],
  );
}
