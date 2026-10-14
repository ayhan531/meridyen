import { HttpStatus, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import { Repository } from 'typeorm';
import { ApiError } from '../common/api-error';
import { config } from '../config';
import { User } from '../users/user.entity';
import { burnTime, customerNo, hashPassword, sixDigitCode, verifyPassword } from './password';
import { maskPhone, normName, normPhone, trLower, V } from './validators';
import { ChangePasswordDto, LoginDto, ProfileDto, RegisterDto, ResetDto } from './dto';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const CODE_MS = 5 * 60 * 1000;
const DEMO = { no: '48273621', name: 'Demo Kullanıcı', email: 'demo@meridyen.app', phone: '5000000000', password: 'Meridyen2026' };

export interface SessionClaims { sub: string; v: number; r: boolean }
export interface PendingClaims { sub: string; r: boolean; p: '2fa' }

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly log = new Logger('Auth');
  /** Kayıtlı olmayan tanımlayıcılar için hatalı deneme sayacı (kullanıcı varlığı mesajdan anlaşılmasın). */
  private readonly unknownAttempts = new Map<string, { n: number; until: number }>();

  constructor(@InjectRepository(User) private readonly users: Repository<User>, private readonly jwt: JwtService) {}

  async onApplicationBootstrap() {
    if (!config.seedDemo) return;
    const exists = await this.users.findOne({ where: { no: DEMO.no } });
    if (exists) return;
    await this.users.save(this.users.create({
      no: DEMO.no, name: DEMO.name, email: DEMO.email, phone: DEMO.phone,
      passwordHash: await hashPassword(DEMO.password), demo: true,
    }));
    this.log.log(`Hazır hesap oluşturuldu: ${DEMO.no}`);
  }

  /* ---------- oturum belirteçleri ---------- */
  signSession(u: User, remember: boolean): string {
    const claims: SessionClaims = { sub: u.no, v: u.tokenVersion, r: remember };
    return this.jwt.sign(claims, { expiresIn: remember ? '30d' : '12h' });
  }
  signPending(u: User, remember: boolean): string {
    const claims: PendingClaims = { sub: u.no, r: remember, p: '2fa' };
    return this.jwt.sign(claims, { expiresIn: '5m' });
  }
  async userFromSession(token: string | undefined): Promise<{ user: User; remember: boolean } | null> {
    if (!token) return null;
    try {
      const c = this.jwt.verify<SessionClaims>(token);
      const user = await this.users.findOne({ where: { no: c.sub } });
      if (!user || user.tokenVersion !== c.v) return null;
      return { user, remember: !!c.r };
    } catch { return null; }
  }
  private codeHash(code: string, no: string) { return createHmac('sha256', config.jwtSecret).update(`${no}:${code}`).digest('base64'); }

  /* ---------- kayıt ---------- */
  async register(d: RegisterDto): Promise<User> {
    const data = { name: normName(d.name), email: trLower(d.email), phone: normPhone(d.phone), password: String(d.password || '') };
    const errors: Record<string, string> = {};
    (['name', 'email', 'phone', 'password'] as const).forEach((f) => { const e = V[f](data[f]); if (e) errors[f] = e; });
    if (d.passwordConfirm !== undefined && d.passwordConfirm !== data.password) errors.passwordConfirm = 'Şifreler aynı değil.';
    if (!d.consent) errors.consent = 'Devam etmek için aydınlatma metnini onaylayın.';
    if (!errors.email && (await this.users.exist({ where: { email: data.email } }))) errors.email = 'Bu e-posta ile açılmış bir hesap var. Giriş yapmayı deneyin.';
    if (!errors.phone && (await this.users.exist({ where: { phone: data.phone, demo: false } }))) errors.phone = 'Bu telefon numarası başka bir hesapta kayıtlı.';
    if (Object.keys(errors).length) throw ApiError.fields(errors);
    let no = customerNo();
    while (await this.users.exist({ where: { no } })) no = customerNo();
    const now = new Date();
    return this.users.save(this.users.create({
      no, name: data.name, email: data.email, phone: data.phone, marketing: !!d.marketing,
      passwordHash: await hashPassword(data.password), lastLogin: now,
    }));
  }

  /* ---------- giriş ---------- */
  async login(d: LoginDto): Promise<{ user: User; needCode?: false } | { user: User; needCode: true; code: string | null }> {
    const key = trLower(d.identifier).replace(/\s/g, '');
    if (!key) throw new ApiError(HttpStatus.BAD_REQUEST, { message: 'Müşteri numaranızı ya da e-posta adresinizi yazın.', field: 'identifier' });
    if (!d.password) throw new ApiError(HttpStatus.BAD_REQUEST, { message: 'Şifrenizi yazın.', field: 'password' });
    const user = await this.users.findOne({ where: key.includes('@') ? { email: key } : { no: key } });
    const now = Date.now();
    const lockedMsg = (until: number) => `Çok sayıda hatalı deneme yapıldı. ${Math.ceil((until - now) / 60000)} dakika sonra yeniden deneyin.`;

    if (!user) {
      await burnTime(d.password);
      const a = this.unknownAttempts.get(key) || { n: 0, until: 0 };
      if (a.until > now) throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, { message: lockedMsg(a.until), locked: true });
      a.n = (a.until && a.until <= now ? 0 : a.n) + 1; a.until = a.n >= MAX_ATTEMPTS ? now + LOCK_MS : 0;
      this.unknownAttempts.set(key, a);
      if (this.unknownAttempts.size > 10000) this.unknownAttempts.clear();
      throw this.badCredentials(MAX_ATTEMPTS - a.n);
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > now) {
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, { message: lockedMsg(user.lockedUntil.getTime()), locked: true });
    }
    if (!(await verifyPassword(d.password, user.passwordHash))) {
      const n = (user.lockedUntil && user.lockedUntil.getTime() <= now ? 0 : user.failedLogins) + 1;
      user.failedLogins = n >= MAX_ATTEMPTS ? 0 : n;
      user.lockedUntil = n >= MAX_ATTEMPTS ? new Date(now + LOCK_MS) : null;
      await this.users.save(user);
      throw this.badCredentials(MAX_ATTEMPTS - n);
    }
    user.failedLogins = 0; user.lockedUntil = null;
    if (user.twoFA) {
      const code = sixDigitCode();
      user.twofaCodeHash = this.codeHash(code, user.no); user.twofaExpires = new Date(now + CODE_MS); user.twofaTries = 0;
      await this.users.save(user);
      if (config.smsMode === 'log') this.log.log(`İki adımlı doğrulama kodu (${user.no}): ${code}`);
      return { user, needCode: true, code: config.smsMode === 'screen' ? code : null };
    }
    await this.markLogin(user);
    return { user };
  }
  private badCredentials(left: number) {
    return new ApiError(HttpStatus.UNAUTHORIZED, {
      field: 'password',
      locked: left <= 0,
      message: left > 0 ? `Müşteri no / e-posta ya da şifre hatalı. ${left} deneme hakkınız kaldı.` : 'Çok sayıda hatalı deneme yapıldı. 5 dakika sonra yeniden deneyin.',
    });
  }
  async markLogin(user: User) {
    user.prevLogin = user.lastLogin; user.lastLogin = new Date();
    await this.users.save(user);
  }

  async verifyCode(pendingToken: string | undefined, code: string): Promise<{ user: User; remember: boolean }> {
    const expired = (message = 'Kodun süresi doldu. Yeniden giriş yapın.') => new ApiError(HttpStatus.UNAUTHORIZED, { message, expired: true });
    let claims: PendingClaims;
    try { claims = this.jwt.verify<PendingClaims>(pendingToken || ''); } catch { throw expired(); }
    if (claims.p !== '2fa') throw expired();
    const user = await this.users.findOne({ where: { no: claims.sub } });
    if (!user || !user.twofaCodeHash || !user.twofaExpires || user.twofaExpires.getTime() < Date.now()) throw expired();
    if (this.codeHash(String(code || '').replace(/\D/g, ''), user.no) !== user.twofaCodeHash) {
      user.twofaTries += 1;
      if (user.twofaTries >= 5) { user.twofaCodeHash = null; user.twofaExpires = null; await this.users.save(user); throw expired('Çok sayıda hatalı kod girildi. Yeniden giriş yapın.'); }
      await this.users.save(user);
      throw new ApiError(HttpStatus.UNAUTHORIZED, { message: `Kod hatalı. ${5 - user.twofaTries} deneme hakkınız kaldı.`, field: 'code' });
    }
    user.twofaCodeHash = null; user.twofaExpires = null; user.twofaTries = 0;
    await this.markLogin(user);
    return { user, remember: claims.r };
  }

  /* ---------- şifre sıfırlama ---------- */
  async resetPassword(d: ResetDto): Promise<User> {
    const email = trLower(d.email), phone = normPhone(d.phone);
    const errors: Record<string, string> = {};
    if (V.email(email)) errors.email = V.email(email);
    if (V.phone(phone)) errors.phone = V.phone(phone);
    if (V.password(d.password)) errors.password = V.password(d.password);
    if (d.confirm !== undefined && d.confirm !== d.password) errors.confirm = 'Şifreler aynı değil.';
    if (Object.keys(errors).length) throw ApiError.fields(errors);
    const user = await this.users.findOne({ where: { email, phone } });
    if (!user) throw new ApiError(HttpStatus.BAD_REQUEST, { message: 'Bu e-posta ve telefon numarasıyla eşleşen bir hesap bulunamadı.', errors: { form: 'Bu e-posta ve telefon numarasıyla eşleşen bir hesap bulunamadı.' } });
    user.passwordHash = await hashPassword(d.password);
    user.pwChangedAt = new Date(); user.tokenVersion += 1; user.failedLogins = 0; user.lockedUntil = null;
    return this.users.save(user);
  }

  /* ---------- hesap yönetimi ---------- */
  /** Hazır hesap herkesle paylaşılır: şifresi, iki adımlı doğrulaması ve bilgileri değiştirilemez. */
  private guardShared(user: User, field: string) {
    if (user.demo) throw new ApiError(HttpStatus.FORBIDDEN, { message: 'Bu hesapta bu ayar değiştirilemez.', field, errors: { [field]: 'Bu hesapta bu ayar değiştirilemez.' } });
  }
  async updateProfile(user: User, d: ProfileDto): Promise<User> {
    this.guardShared(user, 'form');
    const data = { name: normName(d.name), email: trLower(d.email), phone: normPhone(d.phone) };
    const errors: Record<string, string> = {};
    (['name', 'email', 'phone'] as const).forEach((f) => { const e = V[f](data[f]); if (e) errors[f] = e; });
    if (!errors.email) { const o = await this.users.findOne({ where: { email: data.email } }); if (o && o.no !== user.no) errors.email = 'Bu e-posta başka bir hesapta kayıtlı.'; }
    if (!errors.phone) { const o = await this.users.findOne({ where: { phone: data.phone, demo: false } }); if (o && o.no !== user.no) errors.phone = 'Bu telefon numarası başka bir hesapta kayıtlı.'; }
    if (Object.keys(errors).length) throw ApiError.fields(errors);
    Object.assign(user, data);
    if (d.marketing !== undefined) user.marketing = !!d.marketing;
    return this.users.save(user);
  }
  async changePassword(user: User, d: ChangePasswordDto): Promise<User> {
    this.guardShared(user, 'current');
    const fail = (field: string, message: string) => new ApiError(HttpStatus.BAD_REQUEST, { message, field, errors: { [field]: message } });
    if (!d.current) throw fail('current', 'Mevcut şifrenizi yazın.');
    if (!(await verifyPassword(d.current, user.passwordHash))) throw fail('current', 'Mevcut şifre hatalı.');
    const e = V.password(d.next); if (e) throw fail('next', e);
    if (d.next === d.current) throw fail('next', 'Yeni şifre mevcut şifreyle aynı olamaz.');
    if (d.confirm !== undefined && d.confirm !== d.next) throw fail('confirm', 'Şifreler aynı değil.');
    user.passwordHash = await hashPassword(d.next); user.pwChangedAt = new Date(); user.tokenVersion += 1;
    return this.users.save(user);
  }
  async setTwoFA(user: User, enabled: boolean): Promise<User> { this.guardShared(user, 'twoFA'); user.twoFA = enabled; return this.users.save(user); }
  async deleteAccount(user: User, password: string): Promise<void> {
    if (!(await verifyPassword(password || '', user.passwordHash))) throw new ApiError(HttpStatus.BAD_REQUEST, { message: 'Şifre hatalı.', field: 'password' });
    if (user.demo) throw new ApiError(HttpStatus.BAD_REQUEST, { message: 'Bu hesap kapatılamaz.', field: 'password' });
    await this.users.delete({ no: user.no });
  }
  maskPhone = maskPhone;
}
