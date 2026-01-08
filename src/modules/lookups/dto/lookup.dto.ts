import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLookupDto {
  @ApiProperty({
    description: 'ID of the lookup type this lookup belongs to',
    example: 1,
  })
  @IsNumber()
  lookupTypeId: number;

  @ApiProperty({
    description: 'Unique code for the lookup value',
    example: 'pending',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiProperty({
    description: 'Display name for the lookup value',
    example: 'Pending',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  displayName: string;

  @ApiPropertyOptional({
    description: 'Description of the lookup value',
    example: 'Notification is pending delivery',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Sort order for displaying lookup values',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this lookup value is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the lookup value',
    example: { color: 'yellow', icon: 'clock' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateLookupDto {
  @ApiPropertyOptional({
    description: 'Display name for the lookup value',
    example: 'Pending Delivery',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Description of the lookup value',
    example: 'Updated description',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Sort order for displaying lookup values',
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this lookup value is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the lookup value',
    example: { color: 'blue', icon: 'check' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class BulkCreateLookupDto {
  @ApiProperty({
    description: 'Array of lookup values to create',
    type: [CreateLookupDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLookupDto)
  lookups: CreateLookupDto[];
}

export class BulkUpdateLookupItemDto {
  @ApiProperty({
    description: 'ID of the lookup to update',
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiPropertyOptional({
    description: 'Display name for the lookup value',
    example: 'Delivered',
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Description of the lookup value',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Sort order for displaying lookup values',
  })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this lookup value is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the lookup value',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class BulkUpdateLookupDto {
  @ApiProperty({
    description: 'Array of lookup updates',
    type: [BulkUpdateLookupItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateLookupItemDto)
  lookups: BulkUpdateLookupItemDto[];
}

export class SearchLookupDto {
  @ApiPropertyOptional({
    description: 'Filter by lookup type ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lookupTypeId?: number;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search term to filter by code or display name',
    example: 'pending',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
