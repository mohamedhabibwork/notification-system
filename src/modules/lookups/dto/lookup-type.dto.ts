import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLookupTypeDto {
  @ApiProperty({
    description: 'Unique name for the lookup type',
    example: 'order_status',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  typeName: string;

  @ApiPropertyOptional({
    description: 'Description of the lookup type',
    example: 'Status values for orders',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a system-managed lookup type',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}

export class UpdateLookupTypeDto {
  @ApiPropertyOptional({
    description: 'Description of the lookup type',
    example: 'Updated description for order status',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a system-managed lookup type',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
