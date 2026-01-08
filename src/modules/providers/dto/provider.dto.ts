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
  @IsNumber()
  tenantId: number;

  @IsEnum(ProviderChannel)
  channel: ProviderChannel;

  @IsString()
  providerName: string;

  @IsObject()
  credentials: AllProviderCredentials | Record<string, unknown>; // Typed credentials, will be encrypted

  @IsObject()
  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;
}

/**
 * DTO for updating an existing provider
 */
export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  providerName?: string;

  @IsObject()
  @IsOptional()
  credentials?: AllProviderCredentials | Record<string, unknown>;

  @IsObject()
  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;
}
