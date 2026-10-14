import { Body, Controller, Get, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsInt, IsObject, IsOptional } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentUser, SessionGuard } from '../auth/session.guard';
import { ApiError } from '../common/api-error';
import { User } from '../users/user.entity';
import { AppState } from './app-state.entity';

class PutStateDto {
  @IsObject() data: Record<string, unknown>;
  /** İstemcinin bildiği sürüm; sunucudaki daha yeniyse çakışma döner (başka sekme / cihaz yazmış). */
  @IsOptional() @IsInt() rev?: number;
}

const MAX_BYTES = 900 * 1024;

/** Kullanıcının uygulama durumu: portföy, emirler, hesap hareketleri, takip listesi, tercihler. */
@Controller('state')
@UseGuards(SessionGuard)
export class StateController {
  constructor(@InjectRepository(AppState) private readonly states: Repository<AppState>) {}

  @Get()
  async get(@CurrentUser() user: User) {
    const s = await this.states.findOne({ where: { userNo: user.no } });
    return { data: s ? s.data : null, rev: s ? s.rev : 0, updatedAt: s ? s.updatedAt : null };
  }

  @Put()
  async put(@CurrentUser() user: User, @Body() d: PutStateDto) {
    if (Buffer.byteLength(JSON.stringify(d.data)) > MAX_BYTES) throw new ApiError(HttpStatus.PAYLOAD_TOO_LARGE, { message: 'Kayıt çok büyük.' });
    const cur = await this.states.findOne({ where: { userNo: user.no } });
    if (cur && d.rev !== undefined && d.rev < cur.rev) {
      return { conflict: true, data: cur.data, rev: cur.rev };
    }
    const rev = (cur ? cur.rev : 0) + 1;
    await this.states.save({ userNo: user.no, data: d.data, rev });
    return { ok: true, rev };
  }
}
