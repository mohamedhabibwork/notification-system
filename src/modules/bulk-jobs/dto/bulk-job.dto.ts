import { IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BulkJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class CreateBulkJobDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsNumber()
  tenantId: number;

  @ApiProperty({
    description: 'Notification channel',
    enum: ['email', 'sms', 'fcm', 'whatsapp', 'database'],
    example: 'email',
  })
  @IsEnum(['email', 'sms', 'fcm', 'whatsapp', 'database'])
  channel: string;

  @ApiPropertyOptional({
    description: 'Template ID to use for notifications',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  templateId?: number;
}
