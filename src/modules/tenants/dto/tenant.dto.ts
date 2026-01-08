import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name', example: 'Acme Corporation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Tenant domain', example: 'acme.com' })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({
    description: 'Is tenant active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Tenant settings',
    example: { theme: 'dark', timezone: 'UTC' },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({
    description: 'Tenant name',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Tenant domain',
    example: 'acme.com',
  })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({
    description: 'Is tenant active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Tenant settings',
    example: { theme: 'dark', timezone: 'UTC' },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class TenantResponseDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Tenant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({ description: 'Tenant name', example: 'Acme Corporation' })
  name: string;

  @ApiPropertyOptional({ description: 'Tenant domain', example: 'acme.com' })
  domain?: string;

  @ApiProperty({ description: 'Is tenant active', example: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Tenant settings',
    example: { theme: 'dark' },
  })
  settings?: Record<string, unknown>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-08T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-08T00:00:00Z',
  })
  updatedAt: Date;
}
