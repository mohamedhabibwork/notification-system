/**
 * Provider DTOs
 *
 * Data Transfer Objects for provider CRUD operations.
 * Uses typed credentials from the provider interfaces for type safety.
 */

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllProviderCredentials } from '../../../common/providers/interfaces/credentials.interface';

export enum ProviderChannel {
  EMAIL = 'email',
  SMS = 'sms',
  FCM = 'fcm',
  WHATSAPP = 'whatsapp',
  DATABASE = 'database',
}

/**
 * DTO for creating a new provider
 */
export class CreateProviderDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  @IsNumber()
  tenantId: number;

  @ApiProperty({
    description: 'Notification channel',
    enum: ProviderChannel,
    example: ProviderChannel.EMAIL,
  })
  @IsEnum(ProviderChannel)
  channel: ProviderChannel;

  @ApiProperty({
    description: 'Provider name (e.g., sendgrid, twilio, firebase)',
    example: 'sendgrid',
  })
  @IsString()
  providerName: string;

  @ApiProperty({
    description: 'Provider credentials (will be encrypted)',
    example: { apiKey: 'your-api-key-here' },
  })
  @IsObject()
  credentials: AllProviderCredentials | Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Additional provider configuration',
    example: { timeout: 5000, retryAttempts: 3 },
  })
  @IsObject()
  @IsOptional()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Whether this is the primary provider for the channel',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the provider is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Provider priority (higher = higher priority)',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  priority?: number;
}

/**
 * DTO for updating an existing provider
 */
export class UpdateProviderDto {
  @ApiPropertyOptional({
    description: 'Provider name',
    example: 'sendgrid',
  })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiPropertyOptional({
    description: 'Provider credentials (will be encrypted)',
    example: { apiKey: 'your-new-api-key' },
  })
  @IsObject()
  @IsOptional()
  credentials?: AllProviderCredentials | Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Additional provider configuration',
    example: { timeout: 5000 },
  })
  @IsObject()
  @IsOptional()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Whether this is the primary provider',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the provider is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Provider priority',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  priority?: number;
}
