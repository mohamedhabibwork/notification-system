/**
 * SMS Processor
 *
 * Processes SMS notification jobs from the queue.
 * Uses the Provider Selector to get the appropriate SMS provider instance.
 */

import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { BaseProcessor } from './base.processor';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { ProviderSelectorService } from '../common/providers/provider-selector.service';
import { ProviderSendResult } from '../common/providers/interfaces/provider.interface';

interface SmsJob {
  notificationId: number;
  notificationUuid: string;
  tenantId: number;
  channel: string;
  recipient: {
    phone: string;
    userId?: string;
  };
  content: {
    body: string;
  };
  metadata?: Record<string, unknown>;
}

@Processor('sms')
export class SmsProcessor extends BaseProcessor {
  protected readonly logger = new Logger(SmsProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM) db: DrizzleDB,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    super(db);
  }

  async process(job: Job<SmsJob>): Promise<ProviderSendResult> {
    const { notificationId, tenantId, recipient, content, metadata } = job.data;

    this.logger.log(
      `Processing SMS notification ${notificationId} for ${recipient.phone}`,
    );

    try {
      // Get provider instance from selector
      const provider = await this.providerSelector.getProvider('sms', {
        tenantId,
        requestedProvider: metadata?.provider as string | undefined,
      });

      // Send using provider
      const result = await provider.send({
        recipient: {
          phone: recipient.phone,
          userId: recipient.userId,
        },
        content: {
          body: content.body,
        },
        options: metadata,
      });

      if (result.success) {
        await this.updateNotificationStatus(notificationId, 'sent');
        await this.logNotificationEvent(notificationId, tenantId, 'sms_sent', {
          provider: provider.getProviderName(),
          messageId: result.messageId,
        });
        this.logger.log(
          `SMS notification ${notificationId} sent successfully via ${provider.getProviderName()}`,
        );
        return result;
      } else {
        throw new Error(result.error?.message || 'Send failed');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send SMS notification ${notificationId}: ${(error as Error).message}`,
      );
      await this.updateNotificationStatus(
        notificationId,
        'failed',
        (error as Error).message,
      );
      await this.logNotificationEvent(notificationId, tenantId, 'sms_failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
