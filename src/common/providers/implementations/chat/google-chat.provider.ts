/**
 * Google Chat Provider Implementation
 *
 * Concrete implementation for Google Chat (Google Workspace) webhook integration.
 * Handles message sending through Google Chat Incoming Webhook.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { GoogleChatCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class GoogleChatProvider extends BaseProvider<GoogleChatCredentials> {
  constructor(credentials: GoogleChatCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const googleChatPayload = this.formatPayload(payload);

      // Build URL with optional thread key
      let url = this.credentials.webhookUrl;
      if (this.credentials.threadKey) {
        url += `&threadKey=${this.credentials.threadKey}`;
      }

      const response = await axios.post(url, googleChatPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: ProviderSendResult = {
        success: response.status === 200,
        messageId: response.data?.name || Date.now().toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          thread: response.data?.thread,
        },
      };

      this.logSendSuccess(result);
      return result;
    } catch (error) {
      return {
        success: false,
        timestamp: new Date(),
        error: this.handleError(error as Error),
      };
    }
  }

  async validate(): Promise<boolean> {
    if (!this.validateCredentials()) {
      return false;
    }

    try {
      // Test webhook by sending a minimal message
      const testPayload = {
        text: 'Google Chat provider validation test',
      };

      const response = await axios.post(
        this.credentials.webhookUrl,
        testPayload,
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(
        `Google Chat validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const googleChatMessage: Record<string, unknown> = {
      text: payload.content.body,
    };

    // Add cards for rich formatting if subject or htmlBody provided
    if (payload.content.subject || payload.content.htmlBody) {
      googleChatMessage.cards = [
        {
          header: {
            title: payload.content.subject || 'Notification',
            subtitle: new Date().toLocaleString(),
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: payload.content.htmlBody || payload.content.body,
                  },
                },
              ],
            },
          ],
        },
      ];
    }

    return googleChatMessage;
  }

  getRequiredCredentials(): string[] {
    return ['webhookUrl'];
  }

  getChannel(): ChannelType {
    return 'chat';
  }

  getProviderName(): string {
    return 'GoogleChat';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Google Chat',
      description: 'Google Chat (Google Workspace) webhook integration',
      version: '1.0.0',
      supportedFeatures: ['text', 'cards', 'buttons', 'threads', 'mentions'],
      rateLimit: {
        maxPerSecond: 1,
        maxPerDay: 10000,
      },
    };
  }

  protected extractErrorCode(error: Error): string {
    if (
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null
    ) {
      const response = error.response as { status?: number };
      if (response.status) {
        return `GOOGLECHAT_${response.status}`;
      }
    }
    return 'GOOGLECHAT_ERROR';
  }
}
