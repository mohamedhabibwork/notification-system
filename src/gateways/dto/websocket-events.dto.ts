export class NotificationNewEvent {
  id: number;
  uuid: string;
  channel: string;
  subject?: string;
  body: string;
  priority: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export class NotificationStatusEvent {
  notificationId: number;
  status: 'sent' | 'delivered' | 'failed' | 'read';
  timestamp: Date;
  details?: any;
}

export class BulkJobProgressEvent {
  jobId: string;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  progress: number; // percentage 0-100
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentItem?: string;
}
