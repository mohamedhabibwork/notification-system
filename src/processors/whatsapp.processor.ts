/**
 * WhatsApp Processor
 * 
 * Processes WhatsApp notification jobs from the queue.
 * Uses the Provider Selector to get the appropriate WhatsApp provider instance.
 * Supports WPPConnect and WhatsApp Business API providers.
 */

import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { BaseProcessor } from './base.processor';
import { DRIZZLE_ORM } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { ProviderSelectorService } from '../common/providers/provider-selector.service';

interface WhatsAppJob {
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
    htmlBody?: string;
  };
  metadata?: Record<string, unknown>;
}

@Processor('whatsapp')
export class WhatsAppProcessor extends BaseProcessor {
  protected readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM) db: DrizzleDB,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    super(db);
  }

  async process(job: Job<WhatsAppJob>): Promise<unknown> {
    const { notificationId, tenantId, recipient, content, metadata } = job.data;

    this.logger.log(
      `Processing WhatsApp notification ${notificationId} for ${recipient.phone}`,
    );

    try {
      // Get appropriate WhatsApp provider (WPPConnect or WhatsApp Business API)
      const provider = await this.providerSelector.getProvider('whatsapp', {
        tenantId,
        requestedProvider: metadata?.provider as string | undefined,
      });

      // Prepare payload with tenant ID for WPPConnect session management
      const payload = {
        recipient: {
          phone: recipient.phone,
          userId: recipient.userId,
        },
        content: {
          body: content.body,
          htmlBody: content.htmlBody,
        },
        options: {
          ...metadata,
          tenantId, // Required for WPPConnect session management
        },
      };

      // Send message
      const result = await provider.send(payload);

      if (result.success) {
        await this.updateNotificationStatus(notificationId, 'sent');
        await this.logNotificationEvent(
          notificationId,
          tenantId,
          'whatsapp_sent',
          {
            provider: provider.getProviderName(),
            messageId: result.messageId,
            metadata: result.metadata,
          },
        );
        
        this.logger.log(
          `WhatsApp notification ${notificationId} sent successfully via ${provider.getProviderName()}`,
        );
        
        return result;
      } else {
        throw new Error(result.error?.message || 'Send failed');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp notification ${notificationId}: ${(error as Error).message}`,
      );
      await this.updateNotificationStatus(
        notificationId,
        'failed',
        (error as Error).message,
      );
      await this.logNotificationEvent(
        notificationId,
        tenantId,
        'whatsapp_failed',
        {
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
      );
      throw error;
    }
  }
}
