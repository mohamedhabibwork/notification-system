/**
 * Discord Provider Implementation
 *
 * Concrete implementation for Discord webhook/bot integration.
 * Handles message sending through Discord's webhook API.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { DiscordCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class DiscordProvider extends BaseProvider<DiscordCredentials> {
  constructor(credentials: DiscordCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const discordPayload = this.formatPayload(payload);
      const response = await axios.post(
        this.credentials.webhookUrl,
        discordPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result: ProviderSendResult = {
        success: true,
        messageId:
          response.headers['x-ratelimit-reset-after'] || Date.now().toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          rateLimit: {
            limit: response.headers['x-ratelimit-limit'],
            remaining: response.headers['x-ratelimit-remaining'],
            resetAfter: response.headers['x-ratelimit-reset-after'],
          },
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
      // Test webhook by sending a minimal payload
      const testPayload = {
        content: 'Discord provider validation test',
        flags: 64, // Ephemeral flag - won't actually post if supported
      };

      await axios.post(this.credentials.webhookUrl, testPayload);
      return true;
    } catch (error) {
      this.logger.error(
        `Discord validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const discordMessage: Record<string, unknown> = {
      content: payload.content.body,
    };

    // Add username if configured
    if (this.credentials.username) {
      discordMessage.username = this.credentials.username;
    }

    // Add avatar URL if configured
    if (this.credentials.avatarUrl) {
      discordMessage.avatar_url = this.credentials.avatarUrl;
    }

    // Add embeds if HTML body provided
    if (payload.content.htmlBody || payload.content.subject) {
      discordMessage.embeds = [
        {
          title: payload.content.subject,
          description: payload.content.htmlBody || payload.content.body,
          color: 0x5865f2, // Discord blurple color
          timestamp: new Date().toISOString(),
        },
      ];
    }

    return discordMessage;
  }

  getRequiredCredentials(): string[] {
    return ['webhookUrl'];
  }

  getChannel(): ChannelType {
    return 'chat';
  }

  getProviderName(): string {
    return 'discord';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Discord',
      description: 'Discord webhook integration for chat notifications',
      version: '1.0.0',
      supportedFeatures: [
        'text',
        'embeds',
        'mentions',
        'markdown',
        'attachments',
      ],
      rateLimit: {
        maxPerSecond: 5,
        maxPerDay: 50000,
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
        return `DISCORD_${response.status}`;
      }
    }
    return 'DISCORD_ERROR';
  }
}
