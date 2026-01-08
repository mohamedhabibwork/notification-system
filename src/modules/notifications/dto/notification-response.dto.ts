import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Notification UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({ description: 'Notification channel', example: 'email' })
  channel: string;

  @ApiProperty({ description: 'Notification status', example: 'sent' })
  status: string;

  @ApiProperty({ description: 'Notification priority', example: 'high' })
  priority: string;

  @ApiProperty({
    description: 'Recipient information',
    example: { userId: 'user-123', email: 'user@example.com' },
  })
  recipient: {
    userId?: string;
    userType?: string;
    email?: string;
    phone?: string;
  };

  @ApiPropertyOptional({
    description: 'Notification subject',
    example: 'Welcome to our service',
  })
  subject?: string;

  @ApiPropertyOptional({
    description: 'Scheduled time',
    example: '2026-01-08T10:00:00Z',
  })
  scheduledAt?: Date;

  @ApiPropertyOptional({
    description: 'Sent time',
    example: '2026-01-08T10:00:00Z',
  })
  sentAt?: Date;

  @ApiPropertyOptional({
    description: 'Delivered time',
    example: '2026-01-08T10:05:00Z',
  })
  deliveredAt?: Date;

  @ApiPropertyOptional({
    description: 'Read time',
    example: '2026-01-08T10:10:00Z',
  })
  readAt?: Date;

  @ApiPropertyOptional({
    description: 'Failed time',
    example: '2026-01-08T10:00:00Z',
  })
  failedAt?: Date;

  @ApiPropertyOptional({
    description: 'Failure reason',
    example: 'Invalid email address',
  })
  failureReason?: string;

  @ApiProperty({ description: 'Number of retry attempts', example: 0 })
  retryCount: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { campaignId: 'summer-2024' },
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-08T09:00:00Z',
  })
  createdAt: Date;
}

export class BatchResponseDto {
  @ApiProperty({
    description: 'Batch UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  batchId: string;

  @ApiProperty({
    description: 'Batch authentication token',
    example: 'batch-token-abc',
  })
  batchToken: string;

  @ApiProperty({
    description: 'Number of items processed in this chunk',
    example: 100,
  })
  chunkProcessed: number;

  @ApiProperty({ description: 'Total number of items processed', example: 100 })
  totalProcessed: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Batch created and notifications queued',
  })
  message: string;
}

export class BatchStatusDto {
  @ApiProperty({
    description: 'Batch UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  batchId: string;

  @ApiProperty({ description: 'Batch status', example: 'processing' })
  status: string;

  @ApiPropertyOptional({
    description: 'Total expected notifications',
    example: 1000,
  })
  totalExpected?: number;

  @ApiProperty({ description: 'Total notifications sent', example: 950 })
  totalSent: number;

  @ApiProperty({ description: 'Total notifications delivered', example: 900 })
  totalDelivered: number;

  @ApiProperty({ description: 'Total notifications failed', example: 50 })
  totalFailed: number;

  @ApiProperty({
    description: 'Batch creation timestamp',
    example: '2026-01-08T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-08T10:00:00Z',
  })
  updatedAt: Date;
}
