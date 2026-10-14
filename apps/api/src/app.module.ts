import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JsonOnlyMiddleware } from './common/json-only.middleware';
import { ClientIpThrottlerGuard } from './common/throttler.guard';
import { typeormConfig } from './database/typeorm.config';
import { HealthController } from './health.controller';
import { MarketModule } from './market/market.module';
import { StateModule } from './state/state.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeormConfig),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 240 }]),
    AuthModule,
    StateModule,
    MarketModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(JsonOnlyMiddleware).forRoutes('*'); }
}
