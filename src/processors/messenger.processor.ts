/**
 * Messenger Processor
 *
 * Processes messenger notification jobs from the queue (Telegram, Signal, LINE, etc.).
 * Uses the Provider Selector to get the appropriate messenger provider instance.
 */

import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { BaseProcessor } from './base.processor';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { ProviderSelectorService } from '../common/providers/provider-selector.service';
import { ProviderSendResult } from '../common/providers/interfaces/provider.interface';

interface MessengerJob {
  notificationId: number;
  notificationUuid: string;
  tenantId: number;
  channel: string;
  recipient: {
    userId?: string;
    phone?: string;
  };
  content: {
    subject?: string;
    body: string;
    htmlBody?: string;
  };
  metadata?: Record<string, unknown>;
}

@Processor('messenger')
export class MessengerProcessor extends BaseProcessor {
  protected readonly logger = new Logger(MessengerProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM) db: DrizzleDB,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    super(db);
  }

  async process(job: Job<MessengerJob>): Promise<ProviderSendResult> {
    const { notificationId, tenantId, recipient, content, metadata } = job.data;

    this.logger.log(
      `Processing messenger notification ${notificationId} for ${recipient.userId || recipient.phone}`,
    );

    try {
      // Get provider instance from selector
      const provider = await this.providerSelector.getProvider('messenger', {
        tenantId,
        requestedProvider: metadata?.provider as string | undefined,
      });

      // Send using provider
      const result = await provider.send({
        recipient: {
          userId: recipient.userId,
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
          'messenger_sent',
          {
            provider: provider.getProviderName(),
            messageId: result.messageId,
          },
        );
        this.logger.log(
          `Messenger notification ${notificationId} sent successfully via ${provider.getProviderName()}`,
        );
        return result;
      } else {
        throw new Error(result.error?.message || 'Send failed');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send messenger notification ${notificationId}: ${(error as Error).message}`,
      );
      await this.updateNotificationStatus(
        notificationId,
        'failed',
        (error as Error).message,
      );
      await this.logNotificationEvent(
        notificationId,
        tenantId,
        'messenger_failed',
        {
          error: (error as Error).message,
        },
      );
      throw error;
    }
  }
}
