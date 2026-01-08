import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { BaseProcessor } from './base.processor';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { NotificationGateway } from '../gateways/notification.gateway';

interface DatabaseJob {
  notificationId: number;
  notificationUuid: string;
  tenantId: number;
  channel: string;
  recipient: {
    userId: string;
  };
  content: {
    subject?: string;
    body: string;
  };
  metadata?: Record<string, unknown>;
}

@Processor('database')
export class DatabaseProcessor extends BaseProcessor {
  protected readonly logger = new Logger(DatabaseProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM) db: DrizzleDB,
    private readonly notificationGateway: NotificationGateway,
  ) {
    super(db);
  }

  async process(job: Job<DatabaseJob>): Promise<any> {
    const { notificationId, recipient } = job.data;

    this.logger.log(
      `Processing database notification ${notificationId} for user ${recipient.userId}`,
    );

    try {
      // For database channel, the notification is already stored in the database
      // We just need to mark it as "sent" (which means it's ready for the user to view)
      await this.updateNotificationStatus(notificationId, 'sent');
      await this.logNotificationEvent(
        notificationId,
        job.data.tenantId,
        'database_stored',
        {
          userId: recipient.userId,
        },
      );

      // Trigger WebSocket event to notify user in real-time
      if (this.notificationGateway.isUserOnline(recipient.userId)) {
        this.notificationGateway.sendNotificationToUser(recipient.userId, {
          id: notificationId,
          uuid: job.data.notificationUuid,
          channel: 'database',
          subject: job.data.content.subject,
          body: job.data.content.body,
          createdAt: new Date(),
          metadata: job.data.metadata,
        });
        this.logger.log(
          `Sent real-time notification to user ${recipient.userId} via WebSocket`,
        );
      }

      this.logger.log(
        `Database notification ${notificationId} ready for user ${recipient.userId}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to process database notification ${notificationId}: ${error.message}`,
      );
      await this.updateNotificationStatus(
        notificationId,
        'failed',
        error.message,
      );
      await this.logNotificationEvent(
        notificationId,
        job.data.tenantId,
        'database_failed',
        {
          error: error.message,
        },
      );
      throw error;
    }
  }
}
