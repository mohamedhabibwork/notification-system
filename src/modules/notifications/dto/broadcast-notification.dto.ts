import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  RecipientDto,
  DirectContentDto,
} from './send-notification.dto';

export class BroadcastOptionsDto {
  @ApiPropertyOptional({
    description: 'Stop sending after first successful channel delivery',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  stopOnFirstSuccess?: boolean;

  @ApiPropertyOptional({
    description: 'Require all channels to succeed (returns error if any fails)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requireAllSuccess?: boolean;

  @ApiPropertyOptional({
    description: 'Provider override per channel',
    example: { email: 'sendgrid', sms: 'twilio', fcm: 'firebase' },
  })
  @IsObject()
  @IsOptional()
  providers?: Record<string, string>;
}

export class BroadcastNotificationDto {
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
    description: 'The recipient information',
    type: RecipientDto,
  })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @ApiPropertyOptional({
    description: 'The ID of the template to use',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  templateId?: number;

  @ApiPropertyOptional({
    description: 'Template code for rendering (alternative to templateId)',
    example: 'WELCOME_EMAIL',
  })
  @IsString()
  @IsOptional()
  templateCode?: string;

  @ApiPropertyOptional({
    description: 'Variables to render in the template',
    example: { name: 'John Doe', orderId: '12345' },
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
    description: 'Additional metadata',
    example: { campaignId: 'summer-2024' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Broadcast-specific options',
    type: BroadcastOptionsDto,
  })
  @ValidateNested()
  @Type(() => BroadcastOptionsDto)
  @IsOptional()
  options?: BroadcastOptionsDto;
}

export class ChannelResult {
  @ApiProperty({
    description: 'The channel that was used',
    example: 'email',
  })
  channel: string;

  @ApiProperty({
    description: 'Whether the channel delivery succeeded',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'The message ID returned by the provider',
    example: 'msg-12345',
  })
  messageId?: string;

  @ApiPropertyOptional({
    description: 'The provider used for this channel',
    example: 'sendgrid',
  })
  provider?: string;

  @ApiPropertyOptional({
    description: 'Error information if delivery failed',
  })
  error?: {
    code: string;
    message: string;
  };

  @ApiProperty({
    description: 'Timestamp of the delivery attempt',
  })
  timestamp: Date;
}

export class BroadcastResultDto {
  @ApiProperty({
    description: 'Overall success (true if at least one channel succeeded)',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Total number of channels attempted',
    example: 3,
  })
  totalChannels: number;

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

  @ApiProperty({
    description: 'Detailed results for each channel',
    type: [ChannelResult],
  })
  results: ChannelResult[];

  @ApiProperty({
    description: 'Timestamp of the broadcast',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  metadata?: Record<string, unknown>;
}
