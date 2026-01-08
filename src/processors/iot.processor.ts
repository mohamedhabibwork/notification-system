/**
 * IoT Processor
 *
 * Processes IoT notification jobs from the queue (Home Assistant, Nostr, OneBot, etc.).
 * Uses the Provider Selector to get the appropriate IoT provider instance.
 */

import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { BaseProcessor } from './base.processor';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { ProviderSelectorService } from '../common/providers/provider-selector.service';
import { ProviderSendResult } from '../common/providers/interfaces/provider.interface';

interface IoTJob {
  notificationId: number;
  notificationUuid: string;
  tenantId: number;
  channel: string;
  recipient: {
    userId?: string;
    deviceToken?: string;
  };
  content: {
    subject?: string;
    body: string;
    htmlBody?: string;
  };
  metadata?: Record<string, unknown>;
}

@Processor('iot')
export class IoTProcessor extends BaseProcessor {
  protected readonly logger = new Logger(IoTProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM) db: DrizzleDB,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    super(db);
  }

  async process(job: Job<IoTJob>): Promise<ProviderSendResult> {
    const { notificationId, tenantId, recipient, content, metadata } = job.data;

    this.logger.log(
      `Processing IoT notification ${notificationId} for ${recipient.userId || recipient.deviceToken}`,
    );

    try {
      // Get provider instance from selector
      const provider = await this.providerSelector.getProvider('iot', {
        tenantId,
        requestedProvider: metadata?.provider as string | undefined,
      });

      // Send using provider
      const result = await provider.send({
        recipient: {
          userId: recipient.userId,
          deviceToken: recipient.deviceToken,
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
        await this.logNotificationEvent(notificationId, tenantId, 'iot_sent', {
          provider: provider.getProviderName(),
          messageId: result.messageId,
        });
        this.logger.log(
          `IoT notification ${notificationId} sent successfully via ${provider.getProviderName()}`,
        );
        return result;
      } else {
        throw new Error(result.error?.message || 'Send failed');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send IoT notification ${notificationId}: ${(error as Error).message}`,
      );
      await this.updateNotificationStatus(
        notificationId,
        'failed',
        (error as Error).message,
      );
      await this.logNotificationEvent(notificationId, tenantId, 'iot_failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
