export class NotificationResponseDto {
  id: number;
  uuid: string;
  channel: string;
  status: string;
  priority: string;
  recipient: {
    userId?: string;
    userType?: string;
    email?: string;
    phone?: string;
  };
  subject?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class BatchResponseDto {
  batchId: string;
  batchToken: string;
  chunkProcessed: number;
  totalProcessed: number;
  message: string;
}

export class BatchStatusDto {
  batchId: string;
  status: string;
  totalExpected?: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  createdAt: Date;
  updatedAt: Date;
}
