import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DRIZZLE_ORM } from '../../../database/drizzle.module';
import type { DrizzleDB } from '../../../database/drizzle.module';
import { notifications, notificationBatches } from '../../../database/schema';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { TemplatesService } from '../../templates/templates.service';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

@Injectable()
export class NotificationProcessorService {
  private readonly logger = new Logger(NotificationProcessorService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('sms') private smsQueue: Queue,
    @InjectQueue('fcm') private fcmQueue: Queue,
    @InjectQueue('whatsapp') private whatsappQueue: Queue,
    @InjectQueue('database') private databaseQueue: Queue,
    private readonly templatesService: TemplatesService,
  ) {}

  async processSingleNotification(
    dto: SendNotificationDto,
    createdBy: string,
    batchId?: number,
  ): Promise<any> {
    // Render template if templateId or templateCode is provided
    let subject = dto.directContent?.subject;
    let body = dto.directContent?.body;
    let htmlBody = dto.directContent?.htmlBody;

    if (dto.templateId) {
      const rendered = await this.templatesService.renderTemplate(
        dto.templateId,
        dto.templateVariables || {},
        dto.tenantId,
      );
      subject = rendered.subject;
      body = rendered.body;
      htmlBody = rendered.htmlBody;
    } else if (dto.templateCode) {
      // NEW: Support templateCode with fallback
      const rendered = await this.templatesService.renderTemplateByCode(
        dto.templateCode,
        dto.templateVariables || {},
        dto.tenantId,
      );
      subject = rendered.subject;
      body = rendered.body;
      htmlBody = rendered.htmlBody;
    }

    // Create notification record
    const notificationData: any = {
      tenantId: dto.tenantId,
      channel: dto.channel,
      templateId: dto.templateId,
      recipientUserId: dto.recipient.recipientUserId,
      recipientUserType: dto.recipient.recipientUserType,
      recipientEmail: dto.recipient.recipientEmail,
      recipientPhone: dto.recipient.recipientPhone,
      recipientMetadata: dto.recipient.recipientMetadata as any,
      subject,
      body,
      htmlBody,
      templateVariables: dto.templateVariables as any,
      statusId: 1, // pending
      priorityId: this.getPriorityId(dto.priority),
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      retryCount: 0,
      batchId,
      metadata: dto.metadata as any,
      createdBy,
      updatedBy: createdBy,
    };

    const [notification] = await this.db
      .insert(notifications)
      .values(notificationData)
      .returning();

    // Queue the notification
    await this.queueNotification(notification);

    return notification;
  }

  async createBatch(createdBy: string, totalExpected?: number): Promise<any> {
    const batchToken = uuidv4(); // Secret token for chunk authentication

    const [batch] = await this.db
      .insert(notificationBatches)
      .values({
        batchToken,
        tenantId: 1, // TODO: Get from context
        totalExpected,
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        statusId: 1, // pending lookup
        createdBy,
      })
      .returning();

    return batch;
  }

  async updateBatchStats(batchId: string): Promise<void> {
    // Look up batch by batchId (UUID) to get the numeric id
    const [batch] = await this.db
      .select()
      .from(notificationBatches)
      .where(eq(notificationBatches.batchId, batchId as any))
      .limit(1);

    if (!batch) {
      this.logger.warn(`Batch ${batchId} not found for stats update`);
      return;
    }

    // Count notifications by status for this batch
    const stats = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.batchId, batch.id));

    const totalSent = stats.filter((n) => n.sentAt !== null).length;
    const totalDelivered = stats.filter((n) => n.deliveredAt !== null).length;
    const totalFailed = stats.filter((n) => n.failedAt !== null).length;

    await this.db
      .update(notificationBatches)
      .set({
        totalSent,
        totalDelivered,
        totalFailed,
        updatedAt: new Date(),
      })
      .where(eq(notificationBatches.batchId, batchId));
  }

  private async queueNotification(notification: any): Promise<void> {
    const queue = this.getQueueForChannel(notification.channel);

    await queue.add(
      'send-notification',
      {
        notificationId: notification.id,
        notificationUuid: notification.uuid,
        tenantId: notification.tenantId,
        channel: notification.channel,
        recipient: {
          email: notification.recipientEmail,
          phone: notification.recipientPhone,
          userId: notification.recipientUserId,
        },
        content: {
          subject: notification.subject,
          body: notification.body,
          htmlBody: notification.htmlBody,
        },
        metadata: notification.metadata,
      },
      {
        priority: this.getQueuePriority(notification.priorityId),
        delay: notification.scheduledAt
          ? new Date(notification.scheduledAt).getTime() - Date.now()
          : 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    this.logger.log(
      `Queued notification ${notification.uuid} to ${notification.channel} channel`,
    );
  }

  private getQueueForChannel(channel: string): Queue {
    switch (channel) {
      case 'email':
        return this.emailQueue;
      case 'sms':
        return this.smsQueue;
      case 'fcm':
        return this.fcmQueue;
      case 'whatsapp':
        return this.whatsappQueue;
      case 'database':
        return this.databaseQueue;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  private getPriorityId(priority?: string): number {
    switch (priority) {
      case 'urgent':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
      default:
        return 1;
    }
  }

  private getQueuePriority(priorityId: number): number {
    // BullMQ priority: lower number = higher priority
    return 5 - priorityId;
  }
}
