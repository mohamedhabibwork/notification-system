/**
 * Provider-Template Interaction DTOs
 *
 * DTOs for testing templates with providers and checking compatibility
 */

import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Test Template With Provider DTO
 */
export class TestTemplateWithProviderDto {
  @ApiProperty({
    description: 'Template variables for rendering',
    example: { userName: 'John Doe', orderNumber: '12345' },
  })
  @IsObject()
  variables: Record<string, unknown>;

  @ApiProperty({
    description: 'Optional language for localized templates',
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;
}

/**
 * Send Test Notification DTO
 */
export class SendTestNotificationDto {
  @ApiProperty({
    description: 'Test recipient information',
    example: {
      email: 'test@example.com',
      phone: '+1234567890',
    },
  })
  @IsObject()
  recipient: {
    email?: string;
    phone?: string;
    deviceToken?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  };

  @ApiProperty({
    description: 'Template variables for rendering',
    example: { userName: 'John Doe', orderNumber: '12345' },
  })
  @IsObject()
  variables: Record<string, unknown>;

  @ApiProperty({
    description: 'Optional language for localized templates',
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;
}

/**
 * Template Test Result DTO
 */
export class TemplateTestResultDto {
  @ApiProperty({ description: 'Whether the test was successful' })
  success: boolean;

  @ApiProperty({ description: 'Rendered template content' })
  renderedContent: {
    subject?: string;
    body: string;
    htmlBody?: string;
  };

  @ApiProperty({ description: 'Provider compatibility info' })
  providerInfo: {
    name: string;
    channel: string;
    supportsHtml: boolean;
    supportsSubject: boolean;
  };

  @ApiProperty({ description: 'Any warnings or notes', required: false })
  warnings?: string[];
}

/**
 * Provider Template Compatibility DTO
 */
export class ProviderTemplateCompatibilityDto {
  @ApiProperty({ description: 'Template ID' })
  templateId: number;

  @ApiProperty({ description: 'Template code' })
  templateCode: string;

  @ApiProperty({ description: 'Template name' })
  templateName: string;

  @ApiProperty({ description: 'Template channel' })
  templateChannel: string;

  @ApiProperty({
    description: 'Whether the template is compatible with the provider',
  })
  isCompatible: boolean;

  @ApiProperty({ description: 'Compatibility score (0-100)' })
  compatibilityScore: number;

  @ApiProperty({ description: 'Compatibility notes' })
  notes: string[];
}

/**
 * Test Notification Result DTO
 */
export class TestNotificationResultDto {
  @ApiProperty({
    description: 'Whether the notification was sent successfully',
  })
  success: boolean;

  @ApiProperty({ description: 'Message ID if successful', required: false })
  messageId?: string;

  @ApiProperty({ description: 'Timestamp of the send attempt' })
  timestamp: Date;

  @ApiProperty({ description: 'Provider name' })
  providerName: string;

  @ApiProperty({ description: 'Template used' })
  templateCode: string;

  @ApiProperty({ description: 'Rendered content that was sent' })
  renderedContent: {
    subject?: string;
    body: string;
  };

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;

  @ApiProperty({
    description: 'Metadata from the provider response',
    required: false,
  })
  metadata?: Record<string, unknown>;
}
