import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** İstekler web servisinin vekilinden gelir: istemci IP'si X-Forwarded-For'un ilk değeridir. */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const xff = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
    return xff || req.ip || 'yerel';
  }
}
