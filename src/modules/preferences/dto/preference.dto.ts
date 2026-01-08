import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';

export enum PreferenceChannel {
  EMAIL = 'email',
  SMS = 'sms',
  FCM = 'fcm',
  WHATSAPP = 'whatsapp',
  DATABASE = 'database',
}

export class CreatePreferenceDto {
  @IsString()
  userId: string;

  @IsEnum(PreferenceChannel)
  channel: PreferenceChannel;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdatePreferenceDto {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class BulkUpdatePreferencesDto {
  @IsObject()
  channels: Record<PreferenceChannel, boolean>;

  @IsObject()
  @IsOptional()
  quietHours?: {
    start: string;
    end: string;
  };

  @IsBoolean()
  @IsOptional()
  doNotDisturb?: boolean;
}
