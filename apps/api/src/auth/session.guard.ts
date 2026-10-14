import { CanActivate, createParamDecorator, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from '../common/api-error';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';

export const SESSION_COOKIE = 'mrdyn_session';
export const PENDING_COOKIE = 'mrdyn_2fa';

export interface AuthedRequest extends Request { user: User; remember: boolean }

/** Oturum çerezini doğrular; geçerliyse kullanıcıyı isteğe ekler. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const s = await this.auth.userFromSession(req.cookies?.[SESSION_COOKIE]);
    if (!s) throw new ApiError(HttpStatus.UNAUTHORIZED, { message: 'Oturumunuz sona erdi. Yeniden giriş yapın.' });
    req.user = s.user; req.remember = s.remember;
    return true;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user);
