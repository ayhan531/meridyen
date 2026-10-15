/**
 * E-şube şeması (PostgreSQL, `esube` şeması) ve ilk veriler. Python sürümündeki init_db/migrate_db/seed_* işlevlerinin
 * karşılığı: tablolar aynı adlarla ve aynı sütunlarla kurulur; her açılışta yinelenebilir (idempotent) çalışır.
 */
import { Conn, getPool, withConn } from './db';
import { cfg, envFloat, now } from './common';
import { generateAccountNo, hashPassword } from './security';
import { audit } from './audit';
import { seedParticipationIndex } from './participation';

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  tc TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  approved_at BIGINT,
  account_no TEXT DEFAULT '',
  district TEXT DEFAULT '',
  birth_date TEXT DEFAULT '',
  address TEXT DEFAULT '',
  kyc_note TEXT DEFAULT '',
  is_test_user INTEGER NOT NULL DEFAULT 0,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until BIGINT NOT NULL DEFAULT 0,
  last_login_at BIGINT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  two_factor_secret TEXT DEFAULT '',
  risk_profile TEXT DEFAULT '',
  suitability_score INTEGER NOT NULL DEFAULT 0,
  suitability_completed_at BIGINT,
  agreements_version TEXT DEFAULT '',
  agreements_accepted_at BIGINT,
  referred_by BIGINT,
  avatar_url TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  review_note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cash_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  blocked_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  pending_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  credit_limit DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS positions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  avg_price DOUBLE PRECISION NOT NULL,
  updated_at BIGINT NOT NULL,
  value_override DOUBLE PRECISION,
  UNIQUE(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'limit',
  quantity BIGINT NOT NULL,
  limit_price DOUBLE PRECISION NOT NULL,
  source_price DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  cash_reserved DOUBLE PRECISION NOT NULL DEFAULT 0,
  pending_reserved DOUBLE PRECISION NOT NULL DEFAULT 0,
  cancel_remaining INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  reviewed_at BIGINT,
  commission DOUBLE PRECISION NOT NULL DEFAULT 0,
  gross_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  client_order_id TEXT DEFAULT '',
  execution_reference TEXT DEFAULT '',
  price_updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS money_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  bank_account_id BIGINT,
  account_ref TEXT DEFAULT '',
  note TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  reviewed_at BIGINT,
  transfer_code TEXT DEFAULT '',
  receipt_name TEXT DEFAULT '',
  receipt_stored_name TEXT DEFAULT '',
  receipt_content_type TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE(user_id, iban)
);

CREATE TABLE IF NOT EXISTS system_bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  iban TEXT NOT NULL,
  branch_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id BIGINT,
  money_request_id BIGINT,
  code TEXT DEFAULT '',
  name TEXT DEFAULT '',
  transaction_type TEXT NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0,
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  total DOUBLE PRECISION NOT NULL DEFAULT 0,
  balance_before DOUBLE PRECISION NOT NULL DEFAULT 0,
  balance_after DOUBLE PRECISION NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS t2_settlements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id BIGINT,
  transaction_id BIGINT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  remaining_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantity BIGINT NOT NULL,
  sale_price DOUBLE PRECISION NOT NULL,
  settlement_date BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  reviewed_at BIGINT
);

CREATE TABLE IF NOT EXISTS t2_consumptions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  settlement_id BIGINT NOT NULL REFERENCES t2_settlements(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'genel',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  read_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_keys (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  private_key TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL DEFAULT '',
  auth TEXT NOT NULL DEFAULT '',
  agent TEXT NOT NULL DEFAULT '',
  prefs TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS instrument_prices (
  symbol TEXT PRIMARY KEY,
  price DOUBLE PRECISION NOT NULL,
  change_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS instrument_names (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_descriptions (
  symbol TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT '',
  risk_note TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL DEFAULT 0,
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  step_up_until BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  payload TEXT DEFAULT '{}',
  created_at BIGINT NOT NULL,
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  request_id TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  used_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_agreements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agreement_type TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  accepted_at BIGINT NOT NULL,
  ip_address TEXT DEFAULT '',
  UNIQUE(user_id, agreement_type, agreement_version)
);

CREATE TABLE IF NOT EXISTS suitability_assessments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  score INTEGER NOT NULL,
  risk_profile TEXT NOT NULL,
  completed_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at BIGINT NOT NULL,
  reviewed_at BIGINT
);

CREATE TABLE IF NOT EXISTS market_history (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  recorded_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_market_history_symbol_time ON market_history(symbol, recorded_at DESC);

CREATE TABLE IF NOT EXISTS market_cache (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  change_pct DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'stock',
  logo_url TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  metadata_updated_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS participation_index (
  symbol TEXT PRIMARY KEY,
  compliant INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS market_status (
  id INTEGER PRIMARY KEY CHECK (id=1),
  source TEXT NOT NULL DEFAULT 'fallback',
  ok INTEGER NOT NULL DEFAULT 0,
  symbol_count INTEGER NOT NULL DEFAULT 0,
  error TEXT DEFAULT '',
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  day TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  UNIQUE(user_id, day)
);

CREATE TABLE IF NOT EXISTS price_history (
  symbol TEXT NOT NULL,
  day TEXT NOT NULL,
  close DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (symbol, day)
);

CREATE TABLE IF NOT EXISTS price_history_meta (
  symbol TEXT PRIMARY KEY,
  fetched_at BIGINT NOT NULL DEFAULT 0
);

-- Yüklenen dosyalar (kimlik görselleri, dekontlar, profil fotoğrafı). Python sürümü diske yazıyordu;
-- Render'da disk kalıcı olmadığından burada veritabanında saklanır.
CREATE TABLE IF NOT EXISTS uploaded_files (
  name TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at BIGINT NOT NULL
);
`;

const VIEWS = `
DROP VIEW IF EXISTS deposit_requests;
DROP VIEW IF EXISTS withdrawal_requests;
DROP VIEW IF EXISTS credit_applications;
DROP VIEW IF EXISTS pending_orders;
DROP VIEW IF EXISTS user_balances;
DROP VIEW IF EXISTS user_positions;
DROP VIEW IF EXISTS identity_documents;
CREATE VIEW deposit_requests AS SELECT * FROM money_requests WHERE request_type='deposit';
CREATE VIEW withdrawal_requests AS SELECT * FROM money_requests WHERE request_type='withdraw';
CREATE VIEW credit_applications AS SELECT * FROM money_requests WHERE request_type='credit';
CREATE VIEW pending_orders AS SELECT * FROM orders WHERE status='pending';
CREATE VIEW user_balances AS SELECT user_id, cash_balance, blocked_balance, pending_balance, credit_limit FROM accounts;
CREATE VIEW user_positions AS SELECT user_id, symbol AS code, quantity, avg_price, updated_at FROM positions;
CREATE VIEW identity_documents AS SELECT id, user_id, doc_type, original_name, stored_name, content_type, status, review_note, created_at FROM documents;
`;

export async function createSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS esube');
    await client.query('SET search_path TO esube, public');
    // Birden çok örnek aynı anda açılırsa şema kurulumu sıraya girsin.
    await client.query('SELECT pg_advisory_lock(7470002)');
    try {
      await client.query(DDL);
      await client.query(VIEWS);
    } finally {
      await client.query('SELECT pg_advisory_unlock(7470002)');
    }
  } finally {
    client.release();
  }
}

/** migrate_db içindeki yinelenebilir düzeltmeler. */
export async function normalizeData(conn: Conn): Promise<void> {
  await conn.run("UPDATE t2_settlements SET remaining_amount=amount WHERE status='pending' AND remaining_amount<=0");
  for (const row of await conn.all("SELECT id FROM users WHERE account_no IS NULL OR account_no=''")) {
    await conn.run('UPDATE users SET account_no=? WHERE id=?', [await generateAccountNo(conn), row.id]);
  }
  await conn.run("UPDATE system_bank_accounts SET is_active=0 WHERE REPLACE(iban, ' ', '') LIKE 'TR00%'");
  await conn.run('UPDATE orders SET gross_total=total WHERE gross_total<=0');
  await conn.run('UPDATE sessions SET last_seen_at=created_at WHERE last_seen_at<=0');
  await conn.run(
    "INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES ('t2_enabled', '1', ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value='1', updated_at=excluded.updated_at",
    [now()],
  );
}

export async function seedSystemBankAccounts(conn: Conn): Promise<void> {
  const row = await conn.get('SELECT COUNT(*) AS c FROM system_bank_accounts');
  if (row && row.c) return;
  await conn.run(
    `INSERT INTO system_bank_accounts (bank_name, account_holder, iban, branch_name, description, is_active, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
    ['Ottoman Bank', 'Ottoman Yatırım A.Ş.', 'TR330006100519786457841326', 'Dijital Şube', '', now()],
  );
}

export async function seedSystemSettings(conn: Conn): Promise<void> {
  const env = process.env;
  const defaults: Record<string, string> = {
    trading_enabled: '1',
    market_feed_enabled: '1',
    maintenance_mode: '0',
    price_simulation: '0',
    t2_enabled: '1',
    commission_rate_bps: env.COMMISSION_RATE_BPS ?? '0',
    minimum_commission: env.MINIMUM_COMMISSION ?? '0',
    official_company_name: env.OFFICIAL_COMPANY_NAME ?? '',
    official_registry_number: env.OFFICIAL_REGISTRY_NUMBER ?? '',
    official_mersis_number: env.OFFICIAL_MERSIS_NUMBER ?? '',
    official_address: env.OFFICIAL_ADDRESS ?? '',
    official_phone: env.OFFICIAL_PHONE ?? '',
    official_email: env.OFFICIAL_EMAIL ?? 'destek@ottoman.local',
    official_license_text: env.OFFICIAL_LICENSE_TEXT ?? '',
    brand_name: 'Ottoman',
    brand_descriptor: 'E-Şube',
    brand_symbol: 'O',
    brand_tagline: 'Yatırımın zarif hali',
    ui_primary_color: '#7657ff',
    ui_accent_color: '#139477',
    ui_danger_color: '#ef3340',
    ui_font_family: 'Inter',
    ui_radius: '18',
    content_support_email: env.OFFICIAL_EMAIL ?? 'destek@ottoman.local',
    content_support_phone: env.OFFICIAL_PHONE ?? '',
    credit_monthly_interest_rate: '2.5',
    credit_loan_term_months: '12',
    credit_late_interest_rate: '4.5',
    credit_multiplier: '7',
    credit_margin_call_ratio: '50',
    credit_contract_text_1: 'Kredili yatirim limiti admin onayi ile aktif edilir.',
    credit_contract_text_2: 'Faiz ve vade kosullari admin panelindeki guncel ayarlara gore hesaplanir.',
    credit_contract_text_3: 'Gecikme halinde gecikme faizi uygulanabilir.',
    credit_contract_text_4: 'Erken kapama talebi admin tarafindan degerlendirilir.',
    credit_contract_text_5: 'Teminat orani dustugunde kullaniciya uyari verilir.',
    credit_contract_text_6: 'Limit kotuye kullanimda pasif hale getirilebilir.',
    credit_contract_text_7: 'Uyusmazliklar ilgili mevzuat cercevesinde cozulur.',
  };
  // Python sürümündeki brand-config.json: BRAND_CONFIG (JSON) ortam değişkeniyle aynı iş görür.
  if (env.BRAND_CONFIG) {
    try {
      const packaged = JSON.parse(env.BRAND_CONFIG) as Record<string, unknown>;
      for (const [k, v] of Object.entries(packaged)) {
        if (/^(brand_|ui_|content_|official_|commission_|minimum_|trading_|t2_|credit_)/.test(k)) defaults[k] = String(v);
      }
    } catch { /* geçersiz JSON yok sayılır */ }
  }
  for (const [key, value] of Object.entries(defaults)) {
    await conn.run('INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?) ON CONFLICT(setting_key) DO NOTHING', [key, value, now()]);
  }
}

export async function seedAdmin(conn: Conn): Promise<void> {
  let adminTc = (process.env.ADMIN_TC || '11111111110').replace(/\D/g, '');
  if (!/^\d{11}$/.test(adminTc)) adminTc = '11111111110';
  const password = process.env.ADMIN_PASSWORD || 'Admin12345';
  const [salt, digest] = await hashPassword(password);
  const name = (process.env.ADMIN_NAME || 'Ottoman Yönetici').slice(0, 120);
  const email = (process.env.ADMIN_EMAIL || 'admin@ottoman.local').slice(0, 120);
  const existing = await conn.get('SELECT id FROM users WHERE tc=?', [adminTc]);
  if (existing) {
    await conn.run(
      `UPDATE users SET password_salt=?, password_hash=?, full_name=?, email=?, role='admin', status='approved', kyc_status='approved',
         approved_at=COALESCE(approved_at, ?) WHERE id=?`,
      [salt, digest, name, email, now(), existing.id],
    );
    await conn.run("UPDATE users SET account_no=? WHERE id=? AND (account_no IS NULL OR account_no='')", [await generateAccountNo(conn), existing.id]);
    await conn.run('INSERT INTO accounts (user_id, cash_balance, blocked_balance, credit_limit) VALUES (?, 0, 0, 0) ON CONFLICT DO NOTHING', [existing.id]);
    await conn.commit();
    return;
  }
  const id = await conn.insert(
    `INSERT INTO users (tc, password_salt, password_hash, full_name, phone, email, city, role, status, kyc_status, created_at, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'approved', 'approved', ?, ?)`,
    [adminTc, salt, digest, name, '08508887000', email, 'Istanbul', now(), now()],
  );
  await conn.run('UPDATE users SET account_no=? WHERE id=?', [await generateAccountNo(conn), id]);
  await conn.run('INSERT INTO accounts (user_id, cash_balance, blocked_balance, credit_limit) VALUES (?, 0, 0, 0)', [id]);
  await conn.commit();
}

export async function seedTestUser(conn: Conn): Promise<void> {
  if (!cfg.seedTestUser) return;
  const env = process.env;
  let testTc = (env.TEST_USER_TC ?? '22222222220').replace(/\D/g, '');
  if (!/^\d{11}$/.test(testTc)) testTc = '22222222220';
  const existing = await conn.get('SELECT id FROM users WHERE tc=?', [testTc]);
  const password = env.TEST_USER_PASSWORD || 'User12345';
  const fullName = (env.TEST_USER_NAME ?? 'Ottoman Test Kullanıcı').slice(0, 120);
  const email = (env.TEST_USER_EMAIL ?? 'test@ottoman.local').slice(0, 120);
  const phone = (env.TEST_USER_PHONE ?? '05550000000').slice(0, 40);
  const city = (env.TEST_USER_CITY ?? 'Istanbul').slice(0, 80);
  const district = (env.TEST_USER_DISTRICT ?? 'Merkez').slice(0, 80);
  const cash = Math.max(0, envFloat('TEST_USER_CASH', 123456.78));
  const credit = Math.max(0, envFloat('TEST_USER_CREDIT', 0));
  const [salt, digest] = await hashPassword(password);
  if (existing) {
    await conn.run(
      `UPDATE users SET password_salt=?, password_hash=?, full_name=?, email=?, phone=?, city=?, district=?,
         role=CASE WHEN role='admin' THEN role ELSE 'user' END, status='approved', kyc_status='approved', is_test_user=1,
         approved_at=COALESCE(approved_at, ?) WHERE id=?`,
      [salt, digest, fullName, email, phone, city, district, now(), existing.id],
    );
    await conn.run("UPDATE users SET account_no=? WHERE id=? AND (account_no IS NULL OR account_no='')", [await generateAccountNo(conn), existing.id]);
    await conn.run(
      'INSERT INTO accounts (user_id, cash_balance, blocked_balance, pending_balance, credit_limit) VALUES (?, ?, 0, 0, ?) ON CONFLICT DO NOTHING',
      [existing.id, cash, credit],
    );
    await audit(conn, existing.id, 'sync_test_user_seed', 'user', existing.id);
    await conn.commit();
    return;
  }
  const userId = await conn.insert(
    `INSERT INTO users (tc, password_salt, password_hash, full_name, phone, email, city, district, role, status, kyc_status, is_test_user, created_at, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', 'approved', 'approved', 1, ?, ?)`,
    [testTc, salt, digest, fullName, phone, email, city, district, now(), now()],
  );
  await conn.run('UPDATE users SET account_no=? WHERE id=?', [await generateAccountNo(conn), userId]);
  await conn.run('INSERT INTO accounts (user_id, cash_balance, blocked_balance, pending_balance, credit_limit) VALUES (?, ?, 0, 0, ?)', [userId, cash, credit]);
  await conn.run("INSERT INTO positions (user_id, symbol, quantity, avg_price, updated_at) VALUES (?, 'THYAO', 292, 248.40, ?) ON CONFLICT DO NOTHING", [userId, now()]);
  await conn.run("INSERT INTO positions (user_id, symbol, quantity, avg_price, updated_at) VALUES (?, 'ASELS', 150, 58.40, ?) ON CONFLICT DO NOTHING", [userId, now()]);
  await audit(conn, userId, 'seed_test_user', 'user', userId);
  await conn.commit();
}

export async function seedMarketStatus(conn: Conn): Promise<void> {
  // FALLBACK_QUOTES boş: ekranda yalnızca kaynaktan gelmiş gerçek veri gösterilir.
  await conn.run(
    "INSERT INTO market_status (id, source, ok, symbol_count, error, updated_at) VALUES (1, 'fallback', 0, 0, 'Canlı kaynak henüz okunmadı', 0) ON CONFLICT DO NOTHING",
  );
}

/** init_db: şema + normalleştirme + ilk veriler (katılım endeksi tohumu bootstrap'ta çağrılır). */
export async function initDb(): Promise<void> {
  await createSchema();
  await withConn(async (conn) => {
    await normalizeData(conn);
    await seedAdmin(conn);
    await seedTestUser(conn);
    await seedMarketStatus(conn);
    await seedSystemBankAccounts(conn);
    await seedSystemSettings(conn);
    await seedParticipationIndex(conn);
  });
}
