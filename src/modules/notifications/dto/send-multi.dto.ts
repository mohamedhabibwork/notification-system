import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  RecipientDto,
  DirectContentDto,
} from './send-notification.dto';
import { ChannelResult } from './broadcast-notification.dto';

export class ProviderChainDto {
  @ApiProperty({
    description: 'Primary provider name to use for this channel',
    example: 'sendgrid',
  })
  @IsString()
  primary: string;

  @ApiPropertyOptional({
    description: 'Ordered list of fallback providers if primary fails',
    example: ['ses', 'mailgun'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbacks?: string[];
}

export enum TimezoneMode {
  CLIENT = 'client',
  USER = 'user',
  MIXED = 'mixed',
}

export class TimezoneOptionsDto {
  @ApiProperty({
    description: 'Timezone resolution mode',
    enum: TimezoneMode,
    example: TimezoneMode.USER,
  })
  @IsEnum(TimezoneMode)
  mode: TimezoneMode;

  @ApiPropertyOptional({
    description: 'Client-specified timezone (IANA timezone format)',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class MultiNotificationOptionsDto {
  @ApiPropertyOptional({
    description: 'Per user, stop after first channel succeeds',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  stopOnFirstChannelSuccess?: boolean;

  @ApiPropertyOptional({
    description: 'Per user, all channels must succeed',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requireAllChannelsSuccess?: boolean;

  @ApiPropertyOptional({
    description: 'Provider chains per channel',
    example: {
      email: { primary: 'sendgrid', fallbacks: ['ses', 'mailgun'] },
      sms: { primary: 'twilio', fallbacks: ['vonage'] },
    },
  })
  @IsObject()
  @IsOptional()
  providerChains?: Record<string, ProviderChainDto>;

  @ApiPropertyOptional({
    description: 'Timezone handling options',
    type: TimezoneOptionsDto,
  })
  @ValidateNested()
  @Type(() => TimezoneOptionsDto)
  @IsOptional()
  timezoneOptions?: TimezoneOptionsDto;

  @ApiPropertyOptional({
    description: 'Process users in parallel',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  parallelUsers?: boolean;
}

export class SendMultiDto {
  @ApiProperty({
    description: 'The ID of the tenant',
    example: 1,
  })
  @IsNumber()
  tenantId: number;

  @ApiProperty({
    description: 'Array of channels to broadcast the notification to',
    enum: NotificationChannel,
    isArray: true,
    example: [
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
      NotificationChannel.DATABASE,
    ],
  })
  @IsEnum(NotificationChannel, { each: true })
  @IsArray()
  channels: NotificationChannel[];

  @ApiProperty({
    description: 'Array of recipients',
    type: [RecipientDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: RecipientDto[];

  @ApiPropertyOptional({
    description: 'The ID of the template to use',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  templateId?: number;

  @ApiPropertyOptional({
    description: 'Template code for rendering (alternative to templateId)',
    example: 'ORDER_CONFIRMATION',
  })
  @IsString()
  @IsOptional()
  templateCode?: string;

  @ApiPropertyOptional({
    description: 'Variables to render in the template',
    example: { orderId: 'ORD-12345', amount: '$99.99' },
  })
  @IsObject()
  @IsOptional()
  templateVariables?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Direct content (alternative to using a template)',
    type: DirectContentDto,
  })
  @ValidateNested()
  @Type(() => DirectContentDto)
  @IsOptional()
  directContent?: DirectContentDto;

  @ApiPropertyOptional({
    description: 'Schedule the notification for a future time (ISO 8601)',
    example: '2026-01-09T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { campaignId: 'summer-2024' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Multi-notification specific options',
    type: MultiNotificationOptionsDto,
  })
  @ValidateNested()
  @Type(() => MultiNotificationOptionsDto)
  @IsOptional()
  options?: MultiNotificationOptionsDto;
}

export class UserChannelResult {
  @ApiProperty({
    description: 'The user ID',
    example: 'user123',
  })
  userId: string;

  @ApiProperty({
    description: 'Results per channel for this user',
    type: [ChannelResult],
  })
  channels: ChannelResult[];

  @ApiProperty({
    description: 'Number of successful channel deliveries',
    example: 2,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed channel deliveries',
    example: 1,
  })
  failureCount: number;

  @ApiPropertyOptional({
    description: 'Resolved timezone for this user',
    example: 'America/New_York',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Calculated delivery time based on timezone',
  })
  scheduledAt?: Date;
}

export class SendMultiResultDto {
  @ApiProperty({
    description: 'Overall success (true if at least one user had success)',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Total number of users',
    example: 2,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Total number of channels',
    example: 3,
  })
  totalChannels: number;

  @ApiProperty({
    description: 'Detailed results per user',
    type: [UserChannelResult],
  })
  userResults: UserChannelResult[];

  @ApiProperty({
    description: 'Timestamp of the multi-notification request',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  metadata?: Record<string, unknown>;
}
