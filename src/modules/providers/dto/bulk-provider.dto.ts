/**
 * Bulk Provider Operation DTOs
 * 
 * DTOs for bulk create, update, delete, and validation operations
 */

import { 
  IsArray, 
  IsNumber, 
  IsOptional, 
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
  IsString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateProviderDto, UpdateProviderDto } from './provider.dto';

/**
 * Bulk Create Providers DTO
 */
export class BulkCreateProvidersDto {
  @ApiProperty({
    description: 'Array of provider configurations to create',
    type: [CreateProviderDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProviderDto)
  @ArrayMinSize(1)
  providers: CreateProviderDto[];
}

/**
 * Bulk Update Item DTO
 */
export class BulkUpdateItem {
  @ApiProperty({ description: 'Provider ID to update' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Update data', type: UpdateProviderDto })
  @ValidateNested()
  @Type(() => UpdateProviderDto)
  data: UpdateProviderDto;
}

/**
 * Bulk Update Providers DTO
 */
export class BulkUpdateProvidersDto {
  @ApiProperty({
    description: 'Array of provider updates',
    type: [BulkUpdateItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItem)
  @ArrayMinSize(1)
  updates: BulkUpdateItem[];
}

/**
 * Bulk Delete Providers DTO
 */
export class BulkDeleteProvidersDto {
  @ApiProperty({
    description: 'Array of provider IDs to delete',
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  ids: number[];
}

/**
 * Validate Provider Response DTO
 */
export class ValidateProviderResponseDto {
  @ApiProperty({ description: 'Whether the provider credentials are valid' })
  isValid: boolean;

  @ApiProperty({ description: 'Validation message', required: false })
  message?: string;

  @ApiProperty({ description: 'Error details if validation failed', required: false })
  error?: string;

  @ApiProperty({ description: 'Timestamp of validation' })
  timestamp: Date;
}

/**
 * Provider Health Status DTO
 */
export class ProviderHealthResponseDto {
  @ApiProperty({ description: 'Provider ID' })
  providerId: number;

  @ApiProperty({ description: 'Provider name' })
  providerName: string;

  @ApiProperty({ description: 'Channel type' })
  channel: string;

  @ApiProperty({ description: 'Whether the provider is healthy' })
  isHealthy: boolean;

  @ApiProperty({ description: 'Response time in milliseconds', required: false })
  responseTime?: number;

  @ApiProperty({ description: 'Health check message' })
  message: string;

  @ApiProperty({ description: 'Last checked timestamp' })
  lastChecked: Date;

  @ApiProperty({ description: 'Error details if unhealthy', required: false })
  error?: string;
}

/**
 * Bulk Operation Result DTO
 */
export class BulkOperationResultDto {
  @ApiProperty({ description: 'Number of successful operations' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed operations' })
  failureCount: number;

  @ApiProperty({ description: 'Array of successful operation results' })
  successes: any[];

  @ApiProperty({ description: 'Array of failed operations with errors' })
  failures: Array<{
    index: number;
    id?: number;
    error: string;
  }>;
}
