export interface RecipientInfo {
  userId: string;
  userType?: string;
  email?: string;
  phone?: string;
  fcmToken?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageContent {
  subject?: string;
  body: string;
  htmlBody?: string;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
  }>;
  templateVariables?: Record<string, unknown>;
}

export interface NotificationJob {
  notificationId: number;
  tenantId: number;
  channel: string;
  recipient: RecipientInfo;
  content: MessageContent;
  priority: string;
  templateId?: number;
  batchId?: number;
  metadata?: Record<string, unknown>;
}

export interface NotificationJobResult {
  success: boolean;
  notificationId: number;
  providerMessageId?: string;
  providerResponse?: any;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
}
