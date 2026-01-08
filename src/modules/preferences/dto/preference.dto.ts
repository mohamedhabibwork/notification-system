import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PreferenceChannel {
  EMAIL = 'email',
  SMS = 'sms',
  FCM = 'fcm',
  WHATSAPP = 'whatsapp',
  DATABASE = 'database',
}

export class CreatePreferenceDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Notification channel',
    enum: PreferenceChannel,
    example: PreferenceChannel.EMAIL,
  })
  @IsEnum(PreferenceChannel)
  channel: PreferenceChannel;

  @ApiPropertyOptional({
    description: 'Whether the channel is enabled',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Channel-specific settings',
    example: { frequency: 'daily', format: 'html' },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdatePreferenceDto {
  @ApiPropertyOptional({
    description: 'Whether the channel is enabled',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Channel-specific settings',
    example: { frequency: 'daily' },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class BulkUpdatePreferencesDto {
  @ApiProperty({
    description: 'Channel preferences (enabled/disabled)',
    example: { email: true, sms: false, fcm: true },
  })
  @IsObject()
  channels: Record<PreferenceChannel, boolean>;

  @ApiPropertyOptional({
    description: 'Quiet hours configuration',
    example: { start: '22:00', end: '08:00' },
  })
  @IsObject()
  @IsOptional()
  quietHours?: {
    start: string;
    end: string;
  };

  @ApiPropertyOptional({
    description: 'Do not disturb mode',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  doNotDisturb?: boolean;
}
