/**
 * Webhook Processor
 *
 * Processes webhook notification jobs from the queue.
 * Uses the Provider Selector to get the appropriate webhook provider instance.
 */

import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { BaseProcessor } from './base.processor';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { ProviderSelectorService } from '../common/providers/provider-selector.service';
import { ProviderSendResult } from '../common/providers/interfaces/provider.interface';

interface WebhookJob {
  notificationId: number;
  notificationUuid: string;
  tenantId: number;
  channel: string;
  recipient: {
    userId?: string;
    email?: string;
    phone?: string;
  };
  content: {
    subject?: string;
    body: string;
    htmlBody?: string;
  };
  metadata?: Record<string, unknown>;
}

@Processor('webhook')
export class WebhookProcessor extends BaseProcessor {
  protected readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM) db: DrizzleDB,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    super(db);
  }

  async process(job: Job<WebhookJob>): Promise<ProviderSendResult> {
    const { notificationId, tenantId, recipient, content, metadata } = job.data;

    this.logger.log(`Processing webhook notification ${notificationId}`);

    try {
      // Get provider instance from selector
      const provider = await this.providerSelector.getProvider('webhook', {
        tenantId,
        requestedProvider: metadata?.provider as string | undefined,
      });

      // Send using provider
      const result = await provider.send({
        recipient: {
          userId: recipient.userId,
          email: recipient.email,
          phone: recipient.phone,
        },
        content: {
          subject: content.subject,
          body: content.body,
          htmlBody: content.htmlBody,
        },
        options: metadata,
      });

      if (result.success) {
        await this.updateNotificationStatus(notificationId, 'sent');
        await this.logNotificationEvent(
          notificationId,
          tenantId,
          'webhook_sent',
          {
            provider: provider.getProviderName(),
            messageId: result.messageId,
          },
        );
        this.logger.log(
          `Webhook notification ${notificationId} sent successfully`,
        );
        return result;
      } else {
        throw new Error(result.error?.message || 'Send failed');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send webhook notification ${notificationId}: ${(error as Error).message}`,
      );
      await this.updateNotificationStatus(
        notificationId,
        'failed',
        (error as Error).message,
      );
      await this.logNotificationEvent(
        notificationId,
        tenantId,
        'webhook_failed',
        {
          error: (error as Error).message,
        },
      );
      throw error;
    }
  }
}
