/**
 * Bulk Template Operation DTOs
 *
 * DTOs for bulk create and update operations on templates
 */

import {
  IsArray,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateTemplateDto, UpdateTemplateDto } from './template.dto';

/**
 * Bulk Create Templates DTO
 */
export class BulkCreateTemplatesDto {
  @ApiProperty({
    description: 'Array of template configurations to create',
    type: [CreateTemplateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateDto)
  @ArrayMinSize(1)
  templates: CreateTemplateDto[];
}

/**
 * Bulk Update Template Item DTO
 */
export class BulkUpdateTemplateItem {
  @ApiProperty({ description: 'Template ID to update' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Update data', type: UpdateTemplateDto })
  @ValidateNested()
  @Type(() => UpdateTemplateDto)
  data: UpdateTemplateDto;
}

/**
 * Bulk Update Templates DTO
 */
export class BulkUpdateTemplatesDto {
  @ApiProperty({
    description: 'Array of template updates',
    type: [BulkUpdateTemplateItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateTemplateItem)
  @ArrayMinSize(1)
  updates: BulkUpdateTemplateItem[];
}

/**
 * Bulk Operation Result DTO
 */
export class BulkTemplateOperationResultDto {
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
