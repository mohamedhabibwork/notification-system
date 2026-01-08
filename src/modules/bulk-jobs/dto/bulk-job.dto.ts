import { IsNumber, IsEnum, IsOptional } from 'class-validator';

export enum BulkJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class CreateBulkJobDto {
  @IsNumber()
  tenantId: number;

  @IsEnum(['email', 'sms', 'fcm', 'whatsapp', 'database'])
  channel: string;

  @IsOptional()
  @IsNumber()
  templateId?: number;
}
