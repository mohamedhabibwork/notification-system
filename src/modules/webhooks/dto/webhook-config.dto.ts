import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsArray,
  IsNumber,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BackoffStrategy {
  EXPONENTIAL = 'exponential',
  LINEAR = 'linear',
  CONSTANT = 'constant',
}

export class RetryConfigDto {
  @ApiProperty({ description: 'Maximum number of retry attempts', example: 3 })
  @IsNumber()
  maxRetries: number;

  @ApiProperty({ description: 'Initial delay in milliseconds', example: 1000 })
  @IsNumber()
  initialDelay: number;

  @ApiProperty({ description: 'Maximum delay in milliseconds', example: 30000 })
  @IsNumber()
  maxDelay: number;

  @ApiProperty({
    description: 'Backoff strategy',
    enum: BackoffStrategy,
    example: BackoffStrategy.EXPONENTIAL,
  })
  @IsEnum(BackoffStrategy)
  backoffStrategy: BackoffStrategy;
}

export class CreateWebhookConfigDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsNumber()
  tenantId: number;

  @ApiProperty({
    description: 'Configuration name',
    example: 'Production Webhook',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Webhook URL endpoint',
    example: 'https://api.example.com/webhooks/notifications',
  })
  @IsUrl()
  webhookUrl: string;

  @ApiPropertyOptional({
    description: 'Webhook secret for signature validation',
    example: 'webhook_secret_123',
  })
  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @ApiPropertyOptional({
    description: 'Is webhook active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Retry configuration',
    type: RetryConfigDto,
  })
  @IsObject()
  @IsOptional()
  retryConfig?: RetryConfigDto;

  @ApiPropertyOptional({
    description: 'Event-specific webhook URL overrides',
    example: {
      'notification.sent': 'https://api.example.com/webhooks/sent',
      'notification.failed': 'https://api.example.com/webhooks/failed',
    },
  })
  @IsObject()
  @IsOptional()
  eventOverrides?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Custom headers to send with webhook',
    example: { 'X-Custom-Header': 'value' },
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'List of enabled event types',
    type: [String],
    example: [
      'notification.queued',
      'notification.sent',
      'notification.delivered',
    ],
  })
  @IsArray()
  @IsOptional()
  enabledEvents?: string[];

  @ApiPropertyOptional({
    description: 'Request timeout in milliseconds',
    example: 10000,
    default: 10000,
  })
  @IsNumber()
  @IsOptional()
  timeoutMs?: number;
}

export class UpdateWebhookConfigDto {
  @ApiPropertyOptional({ description: 'Configuration name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Webhook URL endpoint' })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook secret' })
  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @ApiPropertyOptional({ description: 'Is webhook active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Retry configuration' })
  @IsObject()
  @IsOptional()
  retryConfig?: RetryConfigDto;

  @ApiPropertyOptional({ description: 'Event-specific URL overrides' })
  @IsObject()
  @IsOptional()
  eventOverrides?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Custom headers' })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Enabled event types' })
  @IsArray()
  @IsOptional()
  enabledEvents?: string[];

  @ApiPropertyOptional({ description: 'Request timeout in milliseconds' })
  @IsNumber()
  @IsOptional()
  timeoutMs?: number;
}

export class WebhookConfigResponseDto {
  @ApiProperty({ description: 'Configuration ID' })
  id: number;

  @ApiProperty({ description: 'Configuration UUID' })
  uuid: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: number;

  @ApiProperty({ description: 'Configuration name' })
  name: string;

  @ApiProperty({ description: 'Webhook URL' })
  webhookUrl: string;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Retry configuration' })
  retryConfig?: RetryConfigDto;

  @ApiPropertyOptional({ description: 'Event overrides' })
  eventOverrides?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Custom headers' })
  headers?: Record<string, string>;

  @ApiProperty({ description: 'Enabled events', type: [String] })
  enabledEvents: string[];

  @ApiProperty({ description: 'Request timeout (ms)' })
  timeoutMs: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class WebhookTestDto {
  @ApiProperty({
    description: 'Event type to test',
    example: 'notification.sent',
  })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({
    description: 'Test payload',
    example: { notificationId: 123, status: 'sent' },
  })
  @IsObject()
  @IsOptional()
  testPayload?: Record<string, any>;
}

export class WebhookTestResponseDto {
  @ApiProperty({ description: 'Test success' })
  success: boolean;

  @ApiProperty({ description: 'Status code received' })
  statusCode?: number;

  @ApiProperty({ description: 'Response time in milliseconds' })
  responseTime: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  errorMessage?: string;

  @ApiProperty({ description: 'Test timestamp' })
  timestamp: string;
}

export class WebhookEventDto {
  @ApiProperty({ description: 'Event type', example: 'notification.sent' })
  eventType: string;

  @ApiProperty({ description: 'Event description' })
  description: string;

  @ApiProperty({ description: 'Sample payload structure' })
  samplePayload: Record<string, any>;
}
