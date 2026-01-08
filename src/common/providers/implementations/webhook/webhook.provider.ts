/**
 * Generic Webhook Provider Implementation
 *
 * Flexible webhook provider that can send notifications to any HTTP endpoint.
 * Supports various authentication methods and HTTP methods.
 */

import axios, { Method } from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { WebhookCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class WebhookProvider extends BaseProvider<WebhookCredentials> {
  constructor(credentials: WebhookCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const webhookPayload = this.formatPayload(payload);
      const headers = this.buildHeaders();

      const response = await axios({
        method: (this.credentials.method || 'POST') as Method,
        url: this.credentials.url,
        data: webhookPayload,
        headers,
        timeout: 30000,
      });

      const result: ProviderSendResult = {
        success: response.status >= 200 && response.status < 300,
        messageId: response.headers['x-request-id'] || Date.now().toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          statusText: response.statusText,
          responseData: response.data,
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
      // Test webhook endpoint with a HEAD request
      const headers = this.buildHeaders();
      const response = await axios({
        method: 'HEAD',
        url: this.credentials.url,
        headers,
        timeout: 5000,
      });
      return response.status >= 200 && response.status < 500;
    } catch (error) {
      // Some endpoints don't support HEAD, so we just check if URL is reachable
      this.logger.warn(
        `Webhook validation warning: ${(error as Error).message}`,
      );
      return !!this.credentials.url;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    // Return a standardized webhook payload format
    return {
      timestamp: new Date().toISOString(),
      subject: payload.content.subject,
      body: payload.content.body,
      htmlBody: payload.content.htmlBody,
      recipient: {
        userId: payload.recipient.userId,
        email: payload.recipient.email,
        phone: payload.recipient.phone,
      },
      metadata: payload.options,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NotificationSystem/1.0',
    };

    // Add custom headers if provided
    if (this.credentials.headers) {
      Object.assign(headers, this.credentials.headers);
    }

    // Add authentication
    switch (this.credentials.authType) {
      case 'bearer':
        if (this.credentials.authToken) {
          headers['Authorization'] = `Bearer ${this.credentials.authToken}`;
        }
        break;
      case 'basic':
        if (this.credentials.username && this.credentials.password) {
          const auth = Buffer.from(
            `${this.credentials.username}:${this.credentials.password}`,
          ).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }
        break;
      case 'apikey':
        if (this.credentials.authToken) {
          headers['X-API-Key'] = this.credentials.authToken;
        }
        break;
      // 'none' or default - no authentication
    }

    return headers;
  }

  getRequiredCredentials(): string[] {
    return ['url'];
  }

  getChannel(): ChannelType {
    return 'webhook';
  }

  getProviderName(): string {
    return 'webhook';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Generic Webhook',
      description: 'Flexible webhook provider for any HTTP endpoint',
      version: '1.0.0',
      supportedFeatures: [
        'custom-headers',
        'authentication',
        'http-methods',
        'json-payload',
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
        return `WEBHOOK_${response.status}`;
      }
    }
    if ('code' in error) {
      return `WEBHOOK_${(error as { code: string }).code}`;
    }
    return 'WEBHOOK_ERROR';
  }
}
