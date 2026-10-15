import { Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { closePool } from './db';
import { initDb } from './schema';
import { haberleriIsit } from './news';
import { katilimiEsitle } from './participation';

/** Python `__main__` karşılığı: veritabanını hazırlar, arka plan ısıtıcılarını başlatır. */
@Injectable()
export class EsubeService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Esube');
  async onModuleInit() {
    await initDb();
    haberleriIsit();
    katilimiEsitle();
    this.log.log('E-şube arka ucu hazır (şema: esube)');
  }
  async onModuleDestroy() { await closePool(); }
}

@Module({ providers: [EsubeService] })
export class EsubeModule {}
