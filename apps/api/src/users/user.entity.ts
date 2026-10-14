import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class User {
  /** 8 haneli müşteri numarası */
  @PrimaryColumn({ type: 'varchar', length: 12 })
  no: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Index('users_email_unique', { unique: true })
  @Column({ type: 'varchar', length: 120 })
  email: string;

  @Column({ type: 'varchar', length: 10 })
  phone: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ type: 'boolean', default: false })
  marketing: boolean;

  @Column({ type: 'boolean', default: false })
  demo: boolean;

  @Column({ name: 'two_fa', type: 'boolean', default: false })
  twoFA: boolean;

  @Column({ name: 'twofa_code_hash', type: 'varchar', length: 200, nullable: true })
  twofaCodeHash: string | null;

  @Column({ name: 'twofa_expires', type: 'timestamptz', nullable: true })
  twofaExpires: Date | null;

  @Column({ name: 'twofa_tries', type: 'int', default: 0 })
  twofaTries: number;

  @Column({ name: 'failed_logins', type: 'int', default: 0 })
  failedLogins: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  /** Şifre değişince artar; eski oturum çerezleri geçersiz olur. */
  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ name: 'last_login', type: 'timestamptz', nullable: true })
  lastLogin: Date | null;

  @Column({ name: 'prev_login', type: 'timestamptz', nullable: true })
  prevLogin: Date | null;

  @Column({ name: 'pw_changed_at', type: 'timestamptz', nullable: true })
  pwChangedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/** İstemciye giden kullanıcı bilgisi (şifre özeti ve güvenlik alanları yok). */
export interface PublicUser {
  no: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  demo: boolean;
  twoFA: boolean;
  lastLogin: string | null;
  prevLogin: string | null;
  marketing: boolean;
  pwChangedAt: string | null;
}

export function toPublic(u: User): PublicUser {
  const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
  return {
    no: u.no, name: u.name, email: u.email, phone: u.phone, createdAt: new Date(u.createdAt).toISOString(),
    demo: u.demo, twoFA: u.twoFA, lastLogin: iso(u.lastLogin), prevLogin: iso(u.prevLogin),
    marketing: u.marketing, pwChangedAt: iso(u.pwChangedAt),
  };
}
