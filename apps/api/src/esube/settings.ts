import { Conn } from './db';
import { now, pyRound, Row } from './common';

export async function settingsMap(conn: Conn): Promise<Record<string, string>> {
  const rows = await conn.all('SELECT setting_key, setting_value FROM system_settings');
  const out: Record<string, string> = {};
  for (const r of rows) out[r.setting_key] = r.setting_value;
  return out;
}

export async function setSystemSetting(conn: Conn, key: string, value: string): Promise<void> {
  await conn.run(
    'INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at',
    [key, value, now()],
  );
}

export async function commissionFor(conn: Conn, grossTotal: number): Promise<number> {
  const settings = await settingsMap(conn);
  const rateBps = Math.max(0, Number(settings.commission_rate_bps || 0));
  const minimum = Math.max(0, Number(settings.minimum_commission || 0));
  if (Number.isNaN(rateBps) || Number.isNaN(minimum)) return 0;
  if (grossTotal <= 0 || rateBps <= 0) return 0;
  return pyRound(Math.max(minimum, (grossTotal * rateBps) / 10_000), 2);
}

export type { Row };
