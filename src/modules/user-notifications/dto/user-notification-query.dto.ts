import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export class UserNotificationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific user ID (admin only)',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user type (admin only)',
    example: 'customer',
  })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({
    description: 'Filter by notification status',
    enum: NotificationStatus,
    example: NotificationStatus.SENT,
  })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Filter by notification channel',
    example: 'email',
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({
    description: 'Filter notifications from this date (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter notifications to this date (ISO 8601)',
    example: '2026-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

export class MarkReadDto {
  @ApiPropertyOptional({
    description: 'Mark notification as read or unread',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean = true;
}

export class BulkDeleteDto {
  @ApiPropertyOptional({
    description: 'Array of notification IDs to delete',
    example: ['1', '2', '3'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  notificationIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by specific user ID (admin only)',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user type (admin only)',
    example: 'customer',
  })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({
    description: 'Filter by notification status',
    example: 'sent',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Delete notifications older than this date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  olderThan?: string;
}
