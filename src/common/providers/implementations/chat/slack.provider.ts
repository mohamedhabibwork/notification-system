/**
 * Slack Provider Implementation
 *
 * Concrete implementation for Slack webhook/bot integration.
 * Handles message sending through Slack's webhook API.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { SlackCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class SlackProvider extends BaseProvider<SlackCredentials> {
  constructor(credentials: SlackCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const slackPayload = this.formatPayload(payload);

      // Use webhook URL if available, otherwise use bot token
      let response;
      if (this.credentials.webhookUrl) {
        response = await axios.post(this.credentials.webhookUrl, slackPayload);
      } else if (this.credentials.botToken) {
        response = await axios.post(
          'https://slack.com/api/chat.postMessage',
          slackPayload,
          {
            headers: {
              Authorization: `Bearer ${this.credentials.botToken}`,
              'Content-Type': 'application/json',
            },
          },
        );
      } else {
        throw new Error('Either webhookUrl or botToken is required');
      }

      const result: ProviderSendResult = {
        success: true,
        messageId: response.data?.ts || Date.now().toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          channel: response.data?.channel,
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
      if (this.credentials.botToken) {
        // Validate bot token by calling auth.test
        const response = await axios.post(
          'https://slack.com/api/auth.test',
          {},
          {
            headers: {
              Authorization: `Bearer ${this.credentials.botToken}`,
            },
          },
        );
        return response.data?.ok === true;
      }
      // For webhook, we assume it's valid if URL is present
      return !!this.credentials.webhookUrl;
    } catch (error) {
      this.logger.error(`Slack validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const slackMessage: Record<string, unknown> = {
      text: payload.content.body,
    };

    // Add channel if using bot token
    if (this.credentials.botToken && this.credentials.channelId) {
      slackMessage.channel = this.credentials.channelId;
    }

    // Add username if configured
    if (this.credentials.username) {
      slackMessage.username = this.credentials.username;
    }

    // Add icon emoji if configured
    if (this.credentials.iconEmoji) {
      slackMessage.icon_emoji = this.credentials.iconEmoji;
    }

    // Add blocks for rich formatting
    if (payload.content.subject || payload.content.htmlBody) {
      slackMessage.blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: payload.content.subject || 'Notification',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: payload.content.htmlBody || payload.content.body,
          },
        },
      ];
    }

    return slackMessage;
  }

  getRequiredCredentials(): string[] {
    // Either webhookUrl or botToken is required
    return [];
  }

  getChannel(): ChannelType {
    return 'chat';
  }

  getProviderName(): string {
    return 'slack';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Slack',
      description: 'Slack webhook/bot integration for team notifications',
      version: '1.0.0',
      supportedFeatures: [
        'text',
        'blocks',
        'mentions',
        'markdown',
        'attachments',
        'interactive',
      ],
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
      const response = error.response as {
        status?: number;
        data?: { error?: string };
      };
      if (response.data?.error) {
        return `SLACK_${response.data.error}`;
      }
      if (response.status) {
        return `SLACK_${response.status}`;
      }
    }
    return 'SLACK_ERROR';
  }
}
