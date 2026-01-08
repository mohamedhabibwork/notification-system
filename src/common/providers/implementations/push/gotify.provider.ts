/**
 * Gotify Provider Implementation
 *
 * Concrete implementation for Gotify push notification server.
 * Self-hosted push notification solution.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { GotifyCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class GotifyProvider extends BaseProvider<GotifyCredentials> {
  constructor(credentials: GotifyCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const gotifyPayload = this.formatPayload(payload);
      const response = await axios.post(
        `${this.credentials.serverUrl}/message`,
        gotifyPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Gotify-Key': this.credentials.appToken,
          },
          params: {
            token: this.credentials.appToken,
          },
        },
      );

      const result: ProviderSendResult = {
        success: response.status === 200,
        messageId: response.data?.id?.toString() || Date.now().toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          messageId: response.data?.id,
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
      // Validate by getting current user info
      const response = await axios.get(
        `${this.credentials.serverUrl}/current/user`,
        {
          headers: {
            'X-Gotify-Key': this.credentials.appToken,
          },
        },
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(
        `Gotify validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const gotifyMessage: Record<string, unknown> = {
      message: payload.content.body,
      title: payload.content.subject || 'Notification',
    };

    // Add priority if configured
    if (this.credentials.priority !== undefined) {
      gotifyMessage.priority = this.credentials.priority;
    }

    // Add extras for additional data
    if (payload.content.htmlBody) {
      gotifyMessage.extras = {
        'client::display': {
          contentType: 'text/markdown',
        },
      };
    }

    return gotifyMessage;
  }

  getRequiredCredentials(): string[] {
    return ['serverUrl', 'appToken'];
  }

  getChannel(): ChannelType {
    return 'push';
  }

  getProviderName(): string {
    return 'gotify';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Gotify',
      description: 'Self-hosted push notification server',
      version: '1.0.0',
      supportedFeatures: ['text', 'markdown', 'priority', 'self-hosted'],
      rateLimit: {
        maxPerSecond: 100,
        maxPerDay: 1000000,
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
        return `GOTIFY_${response.status}`;
      }
    }
    return 'GOTIFY_ERROR';
  }
}
