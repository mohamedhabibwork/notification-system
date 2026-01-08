/**
 * FCM Processor
 *
 * Processes FCM (Firebase Cloud Messaging) notification jobs from the queue.
 * Uses the Provider Selector to get the appropriate FCM provider instance.
 *
 * Note: FCM provider implementation is TODO - currently using fallback logic
 */

import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { BaseProcessor } from './base.processor';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { ProviderSelectorService } from '../common/providers/provider-selector.service';

interface FcmJob {
  notificationId: number;
  notificationUuid: string;
  tenantId: number;
  channel: string;
  recipient: {
    userId: string;
    deviceToken?: string;
  };
  content: {
    subject?: string;
    body: string;
  };
  metadata?: Record<string, unknown>;
}

@Processor('fcm')
export class FcmProcessor extends BaseProcessor {
  protected readonly logger = new Logger(FcmProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM) db: DrizzleDB,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    super(db);
  }

  async process(job: Job<FcmJob>): Promise<unknown> {
    const { notificationId, tenantId, recipient, content, metadata } = job.data;

    this.logger.log(
      `Processing FCM notification ${notificationId} for user ${recipient.userId}`,
    );

    try {
      // TODO: Implement Firebase provider
      // For now, log and mark as pending implementation
      this.logger.warn(
        `FCM provider not yet implemented, marking notification ${notificationId} as pending`,
      );

      await this.updateNotificationStatus(notificationId, 'pending');
      await this.logNotificationEvent(notificationId, tenantId, 'fcm_pending', {
        message: 'FCM provider implementation pending',
      });

      return { success: false, pending: true };

      /* When FCM provider is implemented, use this pattern:
      const provider = await this.providerSelector.getProvider('fcm', {
        tenantId,
        requestedProvider: metadata?.provider as string | undefined,
      });

      const result = await provider.send({
        recipient: {
          deviceToken: recipient.deviceToken,
          userId: recipient.userId,
        },
        content: {
          subject: content.subject,
          body: content.body,
        },
        options: metadata,
      });

      if (result.success) {
        await this.updateNotificationStatus(notificationId, 'sent');
        await this.logNotificationEvent(
          notificationId,
          tenantId,
          'fcm_sent',
          {
            provider: provider.getProviderName(),
            messageId: result.messageId,
          },
        );
        return result;
      } else {
        throw new Error(result.error?.message || 'Send failed');
      }
      */
    } catch (error) {
      this.logger.error(
        `Failed to send FCM notification ${notificationId}: ${(error as Error).message}`,
      );
      await this.updateNotificationStatus(
        notificationId,
        'failed',
        (error as Error).message,
      );
      await this.logNotificationEvent(notificationId, tenantId, 'fcm_failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
