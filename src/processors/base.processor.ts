import { Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { notifications, notificationLogs } from '../database/schema';
import { eq } from 'drizzle-orm';

export abstract class BaseProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;

  constructor(@Inject(DRIZZLE_ORM) protected readonly db: DrizzleDB) {
    super();
  }

  protected async updateNotificationStatus(
    notificationId: number,
    status: 'pending' | 'sent' | 'delivered' | 'failed',
    failureReason?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status === 'pending') {
      updateData.statusId = 1; // pending
    } else if (status === 'sent') {
      updateData.sentAt = new Date();
      updateData.statusId = 3; // sent
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      updateData.statusId = 4; // delivered
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      updateData.statusId = 5; // failed
      updateData.failureReason = failureReason;
    }

    await this.db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, notificationId));
  }

  protected async logNotificationEvent(
    notificationId: number,
    tenantId: number,
    eventType: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(notificationLogs).values({
      notificationId,
      tenantId,
      eventType,
      metadata: details as Record<string, unknown>,
    });
  }

  // Helper method to get tenantId from notification
  protected async getNotificationTenantId(
    notificationId: number,
  ): Promise<number | null> {
    const [notification] = await this.db
      .select({ tenantId: notifications.tenantId })
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    return notification?.tenantId ?? null;
  }

  protected async incrementRetryCount(notificationId: number): Promise<number> {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));

    const newRetryCount = (notification.retryCount || 0) + 1;

    await this.db
      .update(notifications)
      .set({ retryCount: newRetryCount })
      .where(eq(notifications.id, notificationId));

    return newRetryCount;
  }

  protected handleError(error: any, context: string): never {
    this.logger.error(`${context}: ${error.message}`, error.stack);
    throw error;
  }
}
