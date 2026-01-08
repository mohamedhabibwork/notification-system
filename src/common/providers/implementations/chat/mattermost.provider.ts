/**
 * Mattermost Provider Implementation
 *
 * Concrete implementation for Mattermost webhook integration.
 * Handles message sending through Mattermost Incoming Webhook.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { MattermostCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class MattermostProvider extends BaseProvider<MattermostCredentials> {
  constructor(credentials: MattermostCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const mattermostPayload = this.formatPayload(payload);
      const response = await axios.post(
        this.credentials.webhookUrl,
        mattermostPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result: ProviderSendResult = {
        success: response.status === 200,
        messageId: response.data?.id || Date.now().toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
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
        text: 'Mattermost provider validation test',
      };

      const response = await axios.post(
        this.credentials.webhookUrl,
        testPayload,
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(
        `Mattermost validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const mattermostMessage: Record<string, unknown> = {
      text: payload.content.body,
    };

    // Add channel if configured
    if (this.credentials.channelName) {
      mattermostMessage.channel = this.credentials.channelName;
    }

    // Add username if configured
    if (this.credentials.username) {
      mattermostMessage.username = this.credentials.username;
    }

    // Add icon URL if configured
    if (this.credentials.iconUrl) {
      mattermostMessage.icon_url = this.credentials.iconUrl;
    }

    // Add attachments for rich formatting
    if (payload.content.subject) {
      mattermostMessage.attachments = [
        {
          fallback: payload.content.subject,
          color: '#2196F3',
          title: payload.content.subject,
          text: payload.content.htmlBody || payload.content.body,
          footer: 'Notification System',
          footer_icon:
            'https://mattermost.com/wp-content/uploads/2022/02/icon.png',
        },
      ];
    }

    return mattermostMessage;
  }

  getRequiredCredentials(): string[] {
    return ['webhookUrl'];
  }

  getChannel(): ChannelType {
    return 'chat';
  }

  getProviderName(): string {
    return 'mattermost';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Mattermost',
      description: 'Mattermost webhook integration for team collaboration',
      version: '1.0.0',
      supportedFeatures: [
        'text',
        'markdown',
        'attachments',
        'mentions',
        'custom-icons',
      ],
      rateLimit: {
        maxPerSecond: 10,
        maxPerDay: 100000,
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
        return `MATTERMOST_${response.status}`;
      }
    }
    return 'MATTERMOST_ERROR';
  }
}
