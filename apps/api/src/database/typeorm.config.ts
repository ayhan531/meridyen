import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from '../config';
import { AppState } from '../state/app-state.entity';
import { User } from '../users/user.entity';
import { Init1760440000000 } from './migrations/1760440000000-Init';

/** Şema migration ile kurulur; uygulama her açılışta bekleyen migration'ları çalıştırır. */
export const typeormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  entities: [User, AppState],
  migrations: [Init1760440000000],
  migrationsRun: true,
  synchronize: false,
  retryAttempts: 10,
  retryDelay: 3000,
  extra: { max: 10 },
};
