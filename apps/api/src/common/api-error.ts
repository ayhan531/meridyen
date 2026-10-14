import { HttpException, HttpStatus } from '@nestjs/common';

/** Arayüzün beklediği hata biçimi: { message, errors?: {alan: mesaj}, field?, locked?, expired? } */
export class ApiError extends HttpException {
  constructor(status: HttpStatus, body: { message: string; errors?: Record<string, string>; field?: string; locked?: boolean; expired?: boolean }) {
    super(body, status);
  }
  static fields(errors: Record<string, string>) {
    return new ApiError(HttpStatus.BAD_REQUEST, { message: Object.values(errors)[0] || 'Bilgileri kontrol edin.', errors });
  }
}
