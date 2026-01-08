/**
 * Microsoft Teams Provider Implementation
 *
 * Concrete implementation for Microsoft Teams webhook integration.
 * Handles message sending through Teams Incoming Webhook.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { TeamsCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class TeamsProvider extends BaseProvider<TeamsCredentials> {
  constructor(credentials: TeamsCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const teamsPayload = this.formatPayload(payload);
      const response = await axios.post(
        this.credentials.webhookUrl,
        teamsPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result: ProviderSendResult = {
        success: response.status === 200,
        messageId: Date.now().toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          response: response.data,
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
        text: 'Teams provider validation test',
      };

      const response = await axios.post(
        this.credentials.webhookUrl,
        testPayload,
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Teams validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const teamsMessage: Record<string, unknown> = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: payload.content.subject || 'Notification',
      themeColor: '0078D4', // Microsoft blue
    };

    // Add title if subject provided
    if (payload.content.subject) {
      teamsMessage.title = payload.content.subject;
    }

    // Add text content
    teamsMessage.text = payload.content.body;

    // Add sections for rich formatting
    if (payload.content.htmlBody) {
      teamsMessage.sections = [
        {
          activityTitle: payload.content.subject || 'Notification',
          activitySubtitle: new Date().toISOString(),
          text: payload.content.htmlBody,
          markdown: true,
        },
      ];
    }

    return teamsMessage;
  }

  getRequiredCredentials(): string[] {
    return ['webhookUrl'];
  }

  getChannel(): ChannelType {
    return 'chat';
  }

  getProviderName(): string {
    return 'teams';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Microsoft Teams',
      description:
        'Microsoft Teams webhook integration for enterprise notifications',
      version: '1.0.0',
      supportedFeatures: ['text', 'cards', 'markdown', 'actions', 'mentions'],
      rateLimit: {
        maxPerSecond: 4,
        maxPerDay: 20000,
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
        return `TEAMS_${response.status}`;
      }
    }
    return 'TEAMS_ERROR';
  }
}
