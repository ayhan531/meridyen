import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AppState } from './app-state.entity';
import { StateController } from './state.controller';

@Module({ imports: [TypeOrmModule.forFeature([AppState]), AuthModule], controllers: [StateController] })
export class StateModule {}
