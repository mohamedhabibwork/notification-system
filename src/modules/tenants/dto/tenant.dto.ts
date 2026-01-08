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

  @ApiPropertyOptional({ description: 'Is tenant active', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Tenant settings', example: { theme: 'dark', timezone: 'UTC' } })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export class TenantResponseDto {
  id: number;
  uuid: string;
  name: string;
  domain?: string;
  isActive: boolean;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
