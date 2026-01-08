import { Injectable, Logger } from '@nestjs/common';
import { ProviderChainDto } from '../dto/send-multi.dto';
import { ProviderRegistry } from '../../../common/providers/registry/provider.registry';
import { IProviderCredentials } from '../../../common/providers/interfaces/provider.interface';
import type { Notification } from '../../../database/schema';

export interface ProviderAttempt {
  provider: string;
  attempt: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface ProviderExecutionResult {
  success: boolean;
  provider: string;
  messageId?: string;
  attempts: ProviderAttempt[];
  error?: {
    code: string;
    message: string;
  };
}

@Injectable()
export class ProviderFallbackService {
  private readonly logger = new Logger(ProviderFallbackService.name);

  constructor(private readonly providerRegistry: ProviderRegistry) {}

  /**
   * Execute notification with provider fallback chain
   * Tries primary provider first, then falls back to others in order
   */
  async executeWithFallback(
    channel: string,
    providerChain: ProviderChainDto,
    notification: Partial<Notification>,
    credentials: IProviderCredentials,
  ): Promise<ProviderExecutionResult> {
    const attempts: ProviderAttempt[] = [];
    const providers = [
      providerChain.primary,
      ...(providerChain.fallbacks || []),
    ];

    this.logger.debug(
      `Executing with provider chain for channel ${channel}: ${providers.join(' -> ')}`,
    );

    for (let i = 0; i < providers.length; i++) {
      const providerName = providers[i];
      const attemptNumber = i + 1;

      this.logger.debug(
        `Attempt ${attemptNumber}/${providers.length}: Trying provider ${providerName}`,
      );

      try {
        const result = await this.tryProvider(
          providerName,
          channel,
          notification,
          credentials,
        );

        attempts.push({
          provider: providerName,
          attempt: attemptNumber,
          success: true,
          timestamp: new Date(),
        });

        this.logger.log(
          `Successfully sent via ${providerName} (attempt ${attemptNumber})`,
        );

        return {
          success: true,
          provider: providerName,
          messageId: result.messageId,
          attempts,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        attempts.push({
          provider: providerName,
          attempt: attemptNumber,
          success: false,
          error: errorMessage,
          timestamp: new Date(),
        });

        this.logger.warn(
          `Provider ${providerName} failed (attempt ${attemptNumber}): ${errorMessage}`,
        );

        // If this was the last provider, return failure
        if (i === providers.length - 1) {
          return {
            success: false,
            provider: providerName,
            attempts,
            error: {
              code: 'ALL_PROVIDERS_FAILED',
              message: this.buildFailureMessage(attempts),
            },
          };
        }

        // Otherwise, continue to next provider
        this.logger.debug(`Falling back to next provider...`);
      }
    }

    // This should never happen, but just in case
    return {
      success: false,
      provider: 'unknown',
      attempts,
      error: {
        code: 'NO_PROVIDERS_AVAILABLE',
        message: 'No providers were available to try',
      },
    };
  }

  /**
   * Try to send notification via a specific provider
   */
  private async tryProvider(
    providerName: string,
    channel: string,
    notification: Partial<Notification>,
    credentials: IProviderCredentials,
  ): Promise<{ messageId?: string }> {
    try {
      // Get provider instance from registry
      const provider = await this.providerRegistry.getProvider(
        providerName,
        credentials,
      );

      // Validate provider
      const isValid = await provider.validate();
      if (!isValid) {
        throw new Error(`Provider ${providerName} validation failed`);
      }

      // Send via provider
      const recipientInfo = this.extractRecipient(channel, notification);
      const result = await provider.send({
        recipient: {
          email: channel === 'email' ? recipientInfo : undefined,
          phone: channel === 'sms' ? recipientInfo : undefined,
          userId: notification.recipientUserId || undefined,
          deviceToken: channel === 'fcm' ? recipientInfo : undefined,
        },
        content: {
          subject: notification.subject || undefined,
          body: notification.body || '',
          htmlBody: notification.htmlBody || undefined,
        },
        options: notification.metadata as any,
      });

      return {
        messageId: result.messageId || `fallback-${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(`Error sending via provider ${providerName}:`, error);
      throw error;
    }
  }

  /**
   * Extract recipient information based on channel
   */
  private extractRecipient(
    channel: string,
    notification: Partial<Notification>,
  ): string {
    switch (channel.toLowerCase()) {
      case 'email':
        return notification.recipientEmail || '';
      case 'sms':
      case 'whatsapp':
        return notification.recipientPhone || '';
      case 'fcm':
        // For FCM, we might need device token from metadata
        return (
          (notification.recipientMetadata as any)?.deviceToken ||
          notification.recipientUserId ||
          ''
        );
      case 'database':
        return notification.recipientUserId || '';
      default:
        return notification.recipientUserId || '';
    }
  }

  /**
   * Build a comprehensive failure message from all attempts
   */
  private buildFailureMessage(attempts: ProviderAttempt[]): string {
    const failedAttempts = attempts
      .filter((a) => !a.success)
      .map((a) => `${a.provider}: ${a.error}`)
      .join(', ');

    return `All providers failed. Attempts: ${failedAttempts}`;
  }

  /**
   * Get default provider for a channel
   */
  getDefaultProvider(channel: string): string {
    const defaults: Record<string, string> = {
      email: 'sendgrid',
      sms: 'twilio',
      fcm: 'huawei-pushkit',
      whatsapp: 'wppconnect',
      database: 'database-inbox',
    };

    return defaults[channel.toLowerCase()] || 'webhook';
  }

  /**
   * Validate provider chain
   */
  validateProviderChain(providerChain: ProviderChainDto): boolean {
    if (!providerChain.primary) {
      return false;
    }

    // Check for duplicate providers
    const allProviders = [
      providerChain.primary,
      ...(providerChain.fallbacks || []),
    ];
    const uniqueProviders = new Set(allProviders);

    if (uniqueProviders.size !== allProviders.length) {
      this.logger.warn('Provider chain contains duplicates');
      return false;
    }

    return true;
  }

  /**
   * Get available providers for a channel
   */
  getAvailableProvidersForChannel(channel: string): string[] {
    // This would ideally query the provider registry
    const providersByChannel: Record<string, string[]> = {
      email: ['sendgrid', 'ses', 'mailgun'],
      sms: ['twilio', 'vonage'],
      fcm: ['huawei-pushkit', 'firebase'],
      whatsapp: ['wppconnect', 'twilio'],
      database: ['database-inbox'],
      chat: ['slack', 'discord', 'teams', 'GoogleChat', 'mattermost'],
      messenger: ['telegram', 'signal'],
      push: ['pushover', 'gotify', 'ntfy'],
      alert: ['PagerDuty', 'Opsgenie'],
      webhook: ['webhook'],
    };

    return providersByChannel[channel.toLowerCase()] || [];
  }
}
