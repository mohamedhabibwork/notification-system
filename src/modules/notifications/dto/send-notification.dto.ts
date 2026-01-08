import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  FCM = 'fcm',
  WHATSAPP = 'whatsapp',
  DATABASE = 'database',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class RecipientDto {
  @ApiPropertyOptional({
    description: 'The ID of the recipient user',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  recipientUserId?: string;

  @ApiPropertyOptional({
    description: 'The type of the recipient user',
    example: 'customer',
  })
  @IsString()
  @IsOptional()
  recipientUserType?: string;

  @ApiPropertyOptional({
    description: 'The email address of the recipient',
    example: 'user@example.com',
  })
  @IsString()
  @IsOptional()
  recipientEmail?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the recipient',
    example: '+1234567890',
  })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata about the recipient',
    example: { firstName: 'John', lastName: 'Doe' },
  })
  @IsObject()
  @IsOptional()
  recipientMetadata?: Record<string, unknown>;
}

export class DirectContentDto {
  @ApiPropertyOptional({
    description: 'The subject of the notification (for email)',
    example: 'Welcome to our service',
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({
    description: 'The body content of the notification',
    example: 'Thank you for signing up!',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'The HTML body content (for email)',
    example: '<h1>Welcome!</h1><p>Thank you for signing up!</p>',
  })
  @IsString()
  @IsOptional()
  htmlBody?: string;

  @ApiPropertyOptional({
    description: 'Array of attachments',
    type: 'array',
    items: { type: 'object' },
  })
  @IsArray()
  @IsOptional()
  attachments?: any[];
}

export class SendNotificationDto {
  @ApiProperty({
    description: 'The ID of the tenant',
    example: 1,
  })
  @IsNumber()
  tenantId: number;

  @ApiProperty({
    description: 'The delivery channel for the notification',
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL,
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

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
    description: 'The priority of the notification',
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM,
    default: NotificationPriority.MEDIUM,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Schedule the notification for a future time (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
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
}

export class SendBatchDto {
  @ApiProperty({
    description: 'Array of notifications to send',
    type: [SendNotificationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendNotificationDto)
  notifications: SendNotificationDto[];

  @ApiPropertyOptional({
    description: 'Total expected number of notifications across all chunks',
    example: 1000,
  })
  @IsNumber()
  @IsOptional()
  totalExpected?: number;
}

export class SendChunkDto {
  @ApiProperty({
    description: 'The UUID of the batch',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  batchId: string;

  @ApiProperty({
    description: 'The batch token for authentication',
    example: 'batch-token-12345',
  })
  @IsString()
  batchToken: string;

  @ApiProperty({
    description: 'Array of notifications in this chunk',
    type: [SendNotificationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendNotificationDto)
  notifications: SendNotificationDto[];
}
