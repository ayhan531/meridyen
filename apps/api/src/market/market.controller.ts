import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get() @SkipThrottle() @Header('Cache-Control', 'no-store')
  get() { return this.market.snapshot(); }
}
