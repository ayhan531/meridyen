import 'reflect-metadata';
import { Logger, ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { config } from './config';
import { esubeMiddleware } from './esube/esube.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false, bodyParser: false });
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  /* E-şube (ottoman) uçları: kendi gövde okuyucusu ve başlıklarıyla en başta çalışır; /api/auth, /api/state, /api/prices Nest'e geçer. */
  app.use(esubeMiddleware());
  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: () => new BadRequestException({ message: 'İstek biçimi hatalı.' }),
  }));
  app.enableShutdownHooks();
  await app.listen(config.port, '0.0.0.0');
  new Logger('API').log(`Meridyen API ${config.port} portunda (${config.isProd ? 'üretim' : 'geliştirme'})`);
}
bootstrap();
