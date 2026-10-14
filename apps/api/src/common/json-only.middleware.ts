import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Durum değiştiren istekler yalnızca JSON kabul eder. Başka sitelerdeki formlar JSON gönderemediği için
 * SameSite çerezle birlikte siteler arası istek sahteciliğine (CSRF) karşı ek koruma sağlar.
 */
@Injectable()
export class JsonOnlyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) {
      res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).json({ message: 'İstek JSON olmalı.' });
      return;
    }
    next();
  }
}
