import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/* Tür ve uzunluk sınırı burada; anlamsal doğrulama (Türkçe mesajlarla) AuthService'te. */
export class RegisterDto {
  @IsString() @MaxLength(200) name: string;
  @IsString() @MaxLength(200) email: string;
  @IsString() @MaxLength(40) phone: string;
  @IsString() @MaxLength(200) password: string;
  @IsOptional() @IsString() @MaxLength(200) passwordConfirm?: string;
  @IsBoolean() consent: boolean;
  @IsOptional() @IsBoolean() marketing?: boolean;
  @IsOptional() @IsBoolean() remember?: boolean;
}
export class LoginDto {
  @IsString() @MaxLength(200) identifier: string;
  @IsString() @MaxLength(200) password: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}
export class VerifyCodeDto {
  @IsString() @MaxLength(12) code: string;
}
export class ResetDto {
  @IsString() @MaxLength(200) email: string;
  @IsString() @MaxLength(40) phone: string;
  @IsString() @MaxLength(200) password: string;
  @IsOptional() @IsString() @MaxLength(200) confirm?: string;
}
export class ProfileDto {
  @IsString() @MaxLength(200) name: string;
  @IsString() @MaxLength(200) email: string;
  @IsString() @MaxLength(40) phone: string;
  @IsOptional() @IsBoolean() marketing?: boolean;
}
export class ChangePasswordDto {
  @IsString() @MaxLength(200) current: string;
  @IsString() @MaxLength(200) next: string;
  @IsOptional() @IsString() @MaxLength(200) confirm?: string;
}
export class TwoFaDto { @IsBoolean() enabled: boolean; }
export class RememberDto { @IsBoolean() remember: boolean; }
export class DeleteAccountDto { @IsString() @MaxLength(200) password: string; }
