/**
 * Pushover Provider Implementation
 *
 * Concrete implementation for Pushover push notification service.
 * Handles push notifications through Pushover API.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { PushoverCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class PushoverProvider extends BaseProvider<PushoverCredentials> {
  private readonly apiUrl = 'https://api.pushover.net/1/messages.json';

  constructor(credentials: PushoverCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const pushoverPayload = this.formatPayload(payload);
      const response = await axios.post(this.apiUrl, pushoverPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: ProviderSendResult = {
        success: response.data?.status === 1,
        messageId: response.data?.request,
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          status: response.data?.status,
          receipt: response.data?.receipt,
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
      // Validate credentials by calling the validate endpoint
      const response = await axios.post(
        'https://api.pushover.net/1/users/validate.json',
        {
          token: this.credentials.apiToken,
          user: this.credentials.userKey,
        },
      );
      return response.data?.status === 1;
    } catch (error) {
      this.logger.error(
        `Pushover validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const pushoverMessage: Record<string, unknown> = {
      token: this.credentials.apiToken,
      user: this.credentials.userKey,
      message: payload.content.body,
    };

    // Add title if subject provided
    if (payload.content.subject) {
      pushoverMessage.title = payload.content.subject;
    }

    // Add device if configured
    if (this.credentials.deviceName) {
      pushoverMessage.device = this.credentials.deviceName;
    }

    // Add priority if configured
    if (this.credentials.priority !== undefined) {
      pushoverMessage.priority = this.credentials.priority;
    }

    // Add sound if configured
    if (this.credentials.sound) {
      pushoverMessage.sound = this.credentials.sound;
    }

    // Add HTML support
    if (payload.content.htmlBody) {
      pushoverMessage.html = 1;
      pushoverMessage.message = payload.content.htmlBody;
    }

    return pushoverMessage;
  }

  getRequiredCredentials(): string[] {
    return ['apiToken', 'userKey'];
  }

  getChannel(): ChannelType {
    return 'push';
  }

  getProviderName(): string {
    return 'pushover';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Pushover',
      description:
        'Pushover push notification service for iOS, Android, and Desktop',
      version: '1.0.0',
      supportedFeatures: [
        'text',
        'html',
        'priority',
        'sounds',
        'device-targeting',
        'attachments',
      ],
      rateLimit: {
        maxPerSecond: 5,
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
      const response = error.response as { data?: { errors?: string[] } };
      if (response.data?.errors?.length) {
        return `PUSHOVER_${response.data.errors[0]}`;
      }
    }
    return 'PUSHOVER_ERROR';
  }
}
