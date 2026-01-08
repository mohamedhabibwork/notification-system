export enum NotificationEventType {
  QUEUED = 'notification.queued',
  SENT = 'notification.sent',
  DELIVERED = 'notification.delivered',
  FAILED = 'notification.failed',
  READ = 'notification.read',
}

export interface NotificationQueuedEvent {
  eventId: string;
  eventType: NotificationEventType.QUEUED;
  timestamp: number;
  notificationId: number;
  tenantId: number;
  channel: string;
  recipientUserId: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSentEvent {
  eventId: string;
  eventType: NotificationEventType.SENT;
  timestamp: number;
  notificationId: number;
  tenantId: number;
  channel: string;
  recipientUserId: string;
  providerName: string;
  providerMessageId?: string;
  sentAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveredEvent {
  eventId: string;
  eventType: NotificationEventType.DELIVERED;
  timestamp: number;
  notificationId: number;
  tenantId: number;
  channel: string;
  recipientUserId: string;
  deliveredAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationFailedEvent {
  eventId: string;
  eventType: NotificationEventType.FAILED;
  timestamp: number;
  notificationId: number;
  tenantId: number;
  channel: string;
  recipientUserId: string;
  failureReason: string;
  failedAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationReadEvent {
  eventId: string;
  eventType: NotificationEventType.READ;
  timestamp: number;
  notificationId: number;
  tenantId: number;
  recipientUserId: string;
  readAt: string;
  metadata?: Record<string, unknown>;
}

export type OutgoingNotificationEvent =
  | NotificationQueuedEvent
  | NotificationSentEvent
  | NotificationDeliveredEvent
  | NotificationFailedEvent
  | NotificationReadEvent;
