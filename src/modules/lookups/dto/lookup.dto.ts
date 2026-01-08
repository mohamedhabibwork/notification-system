import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateLookupDto {
  @IsNumber()
  lookupTypeId: number;

  @IsString()
  code: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateLookupDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
