import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MarketService } from './market.service';

@Controller('prices')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get() @SkipThrottle() @Header('Cache-Control', 'no-store')
  get(@Query('full') full?: string) { return this.market.snapshot(full === '1'); }

  @Get('history/:symbol') @SkipThrottle() @Header('Cache-Control', 'no-store')
  history(@Param('symbol') symbol: string, @Query('days') days?: string) { return this.market.history(symbol, Math.min(400, Math.max(1, Number(days) || 1))); }
}
