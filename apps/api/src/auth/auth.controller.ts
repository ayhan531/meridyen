import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { config } from '../config';
import { toPublic, User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { ChangePasswordDto, DeleteAccountDto, LoginDto, ProfileDto, RegisterDto, RememberDto, ResetDto, TwoFaDto, VerifyCodeDto } from './dto';
import { AuthedRequest, CurrentUser, PENDING_COOKIE, SESSION_COOKIE, SessionGuard } from './session.guard';

const base: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/' };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** "Beni hatırla" açıksa 30 günlük kalıcı çerez, kapalıysa tarayıcı kapanınca silinen çerez. */
  private issue(res: Response, user: User, remember: boolean) {
    res.cookie(SESSION_COOKIE, this.auth.signSession(user, remember), remember ? { ...base, maxAge: 30 * 24 * 3600 * 1000 } : base);
    res.clearCookie(PENDING_COOKIE, base);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const s = await this.auth.userFromSession(req.cookies?.[SESSION_COOKIE]);
    return { user: s ? toPublic(s.user) : null, remember: s ? s.remember : false };
  }

  @Post('register') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() d: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(d);
    this.issue(res, user, !!d.remember);
    return { user: toPublic(user) };
  }

  @Post('login') @HttpCode(200) @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(@Body() d: LoginDto, @Res({ passthrough: true }) res: Response) {
    const r = await this.auth.login(d);
    if (r.needCode) {
      res.cookie(PENDING_COOKIE, this.auth.signPending(r.user, !!d.remember), { ...base, maxAge: 5 * 60 * 1000 });
      return { needCode: true, phone: this.auth.maskPhone(r.user.phone), code: r.code };
    }
    this.issue(res, r.user, !!d.remember);
    return { user: toPublic(r.user) };
  }

  @Post('verify-code') @HttpCode(200) @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async verify(@Body() d: VerifyCodeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, remember } = await this.auth.verifyCode(req.cookies?.[PENDING_COOKIE], d.code);
    this.issue(res, user, remember);
    return { user: toPublic(user) };
  }

  @Post('logout') @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, base); res.clearCookie(PENDING_COOKIE, base);
    return { ok: true };
  }

  @Post('reset-password') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async reset(@Body() d: ResetDto) {
    const user = await this.auth.resetPassword(d);
    return { ok: true, no: user.no };
  }

  @UseGuards(SessionGuard) @Post('remember') @HttpCode(200)
  remember(@Req() req: AuthedRequest, @Body() d: RememberDto, @Res({ passthrough: true }) res: Response) {
    this.issue(res, req.user, d.remember);
    return { remember: d.remember };
  }

  @UseGuards(SessionGuard) @Patch('profile')
  async profile(@CurrentUser() user: User, @Body() d: ProfileDto) {
    return { user: toPublic(await this.auth.updateProfile(user, d)) };
  }

  @UseGuards(SessionGuard) @Post('change-password') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async changePassword(@Req() req: AuthedRequest, @Body() d: ChangePasswordDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.changePassword(req.user, d);
    this.issue(res, user, req.remember);   // eski oturumlar düşer, bu oturum yenilenir
    return { user: toPublic(user) };
  }

  @UseGuards(SessionGuard) @Post('two-factor') @HttpCode(200)
  async twoFactor(@CurrentUser() user: User, @Body() d: TwoFaDto) {
    return { user: toPublic(await this.auth.setTwoFA(user, d.enabled)) };
  }

  @UseGuards(SessionGuard) @Delete('account') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async remove(@CurrentUser() user: User, @Body() d: DeleteAccountDto, @Res({ passthrough: true }) res: Response) {
    await this.auth.deleteAccount(user, d.password);
    res.clearCookie(SESSION_COOKIE, base);
    return { ok: true };
  }
}
