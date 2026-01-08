/**
 * Opsgenie Provider Implementation
 *
 * Concrete implementation for Opsgenie alert management integration.
 * Handles alert creation through Opsgenie API.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { OpsgenieCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class OpsgenieProvider extends BaseProvider<OpsgenieCredentials> {
  private readonly baseUrl: string;

  constructor(credentials: OpsgenieCredentials) {
    super(credentials);
    // Opsgenie has different API endpoints for US and EU
    this.baseUrl =
      credentials.region === 'eu'
        ? 'https://api.eu.opsgenie.com'
        : 'https://api.opsgenie.com';
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const opsgeniePayload = this.formatPayload(payload);
      const response = await axios.post(
        `${this.baseUrl}/v2/alerts`,
        opsgeniePayload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `GenieKey ${this.credentials.apiKey}`,
          },
        },
      );

      const result: ProviderSendResult = {
        success: response.data?.result === 'Request will be processed',
        messageId: response.data?.requestId,
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          result: response.data?.result,
          requestId: response.data?.requestId,
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
      // Validate API key by calling heartbeat endpoint
      const response = await axios.get(`${this.baseUrl}/v2/heartbeats`, {
        headers: {
          Authorization: `GenieKey ${this.credentials.apiKey}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error(
        `Opsgenie validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const opsgenieAlert: Record<string, unknown> = {
      message:
        payload.content.subject || payload.content.body.substring(0, 130),
      description: payload.content.body,
      priority: this.credentials.priority || 'P3',
      source: 'notification-system',
    };

    // Add details
    opsgenieAlert.details = {
      htmlBody: payload.content.htmlBody,
      timestamp: new Date().toISOString(),
    };

    return opsgenieAlert;
  }

  getRequiredCredentials(): string[] {
    return ['apiKey'];
  }

  getChannel(): ChannelType {
    return 'alert';
  }

  getProviderName(): string {
    return 'Opsgenie';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Opsgenie',
      description: 'Opsgenie alert management and on-call platform',
      version: '1.0.0',
      supportedFeatures: [
        'alerts',
        'incidents',
        'on-call',
        'escalations',
        'priorities',
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
      const response = error.response as {
        status?: number;
        data?: { message?: string };
      };
      if (response.data?.message) {
        return `OPSGENIE_${response.data.message.replace(/\s+/g, '_').toUpperCase()}`;
      }
      if (response.status) {
        return `OPSGENIE_${response.status}`;
      }
    }
    return 'OPSGENIE_ERROR';
  }
}
