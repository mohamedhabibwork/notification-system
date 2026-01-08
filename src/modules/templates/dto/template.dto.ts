import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateChannel {
  EMAIL = 'email',
  SMS = 'sms',
  FCM = 'fcm',
  WHATSAPP = 'whatsapp',
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsNumber()
  tenantId: number;

  @ApiProperty({ description: 'Template name', example: 'Welcome Email' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique template code', example: 'WELCOME_EMAIL' })
  @IsString()
  templateCode: string;

  @ApiPropertyOptional({ description: 'Template type ID', example: 1 })
  @IsNumber()
  @IsOptional()
  templateTypeId?: number;

  @ApiProperty({ description: 'Notification channel', enum: TemplateChannel, example: TemplateChannel.EMAIL })
  @IsEnum(TemplateChannel)
  channel: TemplateChannel;

  @ApiPropertyOptional({ description: 'Email subject', example: 'Welcome to {{companyName}}!' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'Template body with Handlebars syntax', example: 'Hello {{name}}, welcome!' })
  @IsString()
  bodyTemplate: string;

  @ApiPropertyOptional({ description: 'HTML template body', example: '<h1>Hello {{name}}</h1>' })
  @IsString()
  @IsOptional()
  htmlTemplate?: string;

  @ApiPropertyOptional({ description: 'Template variables', example: { name: 'string', email: 'string' } })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Language code', example: 'en', default: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Is template active', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  bodyTemplate?: string;

  @IsString()
  @IsOptional()
  htmlTemplate?: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TemplatePreviewDto {
  @IsObject()
  variables: Record<string, any>;
}
