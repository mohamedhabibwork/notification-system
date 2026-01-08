import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export class UserNotificationQueryDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

export class MarkReadDto {
  @IsOptional()
  isRead?: boolean = true;
}

export class BulkDeleteDto {
  @IsOptional()
  @IsString({ each: true })
  notificationIds?: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  olderThan?: string;
}
