export enum NotificationEventType {
  NOTIFICATION_REQUESTED = 'notification.requested',
  NOTIFICATION_QUEUED = 'notification.queued',
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_READ = 'notification.read',
}

export interface BaseNotificationEvent {
  eventType: NotificationEventType;
  timestamp: string;
  correlationId?: string;
  tenantId: number;
}

export interface NotificationRequestedEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.NOTIFICATION_REQUESTED;
  data: {
    notificationId: number;
    uuid: string;
    channel: string;
    recipient: {
      userId?: string;
      email?: string;
      phone?: string;
    };
    templateId?: number;
    directContent?: {
      subject?: string;
      body: string;
      htmlBody?: string;
    };
    priority: string;
  };
}

export interface NotificationQueuedEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.NOTIFICATION_QUEUED;
  data: {
    notificationId: number;
    uuid: string;
    channel: string;
    queuedAt: string;
  };
}

export interface NotificationSentEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.NOTIFICATION_SENT;
  data: {
    notificationId: number;
    uuid: string;
    channel: string;
    sentAt: string;
    providerMessageId?: string;
  };
}

export interface NotificationDeliveredEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.NOTIFICATION_DELIVERED;
  data: {
    notificationId: number;
    uuid: string;
    channel: string;
    deliveredAt: string;
  };
}

export interface NotificationFailedEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.NOTIFICATION_FAILED;
  data: {
    notificationId: number;
    uuid: string;
    channel: string;
    failedAt: string;
    failureReason: string;
    errorCode?: string;
  };
}

export interface NotificationReadEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.NOTIFICATION_READ;
  data: {
    notificationId: number;
    uuid: string;
    userId: string;
    readAt: string;
  };
}

export type NotificationEvent =
  | NotificationRequestedEvent
  | NotificationQueuedEvent
  | NotificationSentEvent
  | NotificationDeliveredEvent
  | NotificationFailedEvent
  | NotificationReadEvent;
