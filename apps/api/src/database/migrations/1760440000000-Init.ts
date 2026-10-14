import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1760440000000 implements MigrationInterface {
  name = 'Init1760440000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "no" varchar(12) PRIMARY KEY,
        "name" varchar(80) NOT NULL,
        "email" varchar(120) NOT NULL,
        "phone" varchar(10) NOT NULL,
        "password_hash" varchar(200) NOT NULL,
        "marketing" boolean NOT NULL DEFAULT false,
        "demo" boolean NOT NULL DEFAULT false,
        "two_fa" boolean NOT NULL DEFAULT false,
        "twofa_code_hash" varchar(200),
        "twofa_expires" timestamptz,
        "twofa_tries" int NOT NULL DEFAULT 0,
        "failed_logins" int NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "token_version" int NOT NULL DEFAULT 0,
        "last_login" timestamptz,
        "prev_login" timestamptz,
        "pw_changed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email")`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "app_states" (
        "user_no" varchar(12) PRIMARY KEY REFERENCES "users"("no") ON DELETE CASCADE,
        "data" jsonb NOT NULL,
        "rev" int NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "app_states"`);
    await q.query(`DROP TABLE IF EXISTS "users"`);
  }
}
