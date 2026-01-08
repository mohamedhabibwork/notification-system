/**
 * Ntfy Provider Implementation
 *
 * Concrete implementation for ntfy.sh push notification service.
 * Simple HTTP-based pub-sub notification service.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { NtfyCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class NtfyProvider extends BaseProvider<NtfyCredentials> {
  private readonly serverUrl: string;

  constructor(credentials: NtfyCredentials) {
    super(credentials);
    this.serverUrl = credentials.serverUrl || 'https://ntfy.sh';
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const headers = this.buildHeaders(payload);
      const response = await axios.post(
        `${this.serverUrl}/${this.credentials.topic}`,
        payload.content.body,
        { headers },
      );

      const result: ProviderSendResult = {
        success: response.status === 200,
        messageId: response.data?.id || Date.now().toString(),
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
      // Test connectivity to ntfy server
      const response = await axios.get(`${this.serverUrl}/v1/health`);
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Ntfy validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  private buildHeaders(payload: ProviderSendPayload): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };

    // Add authentication if configured
    if (this.credentials.username && this.credentials.password) {
      const auth = Buffer.from(
        `${this.credentials.username}:${this.credentials.password}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    // Add title
    if (payload.content.subject) {
      headers['X-Title'] = payload.content.subject;
    }

    // Add priority if configured
    if (this.credentials.priority !== undefined) {
      headers['X-Priority'] = this.credentials.priority.toString();
    }

    // Add tags if configured
    if (this.credentials.tags && this.credentials.tags.length > 0) {
      headers['X-Tags'] = this.credentials.tags.join(',');
    }

    return headers;
  }

  protected formatPayload(payload: ProviderSendPayload): string {
    return payload.content.body;
  }

  getRequiredCredentials(): string[] {
    return ['topic'];
  }

  getChannel(): ChannelType {
    return 'push';
  }

  getProviderName(): string {
    return 'ntfy';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Ntfy',
      description: 'Simple HTTP-based pub-sub notification service',
      version: '1.0.0',
      supportedFeatures: [
        'text',
        'priority',
        'tags',
        'self-hosted',
        'anonymous',
      ],
      rateLimit: {
        maxPerSecond: 60,
        maxPerDay: 250,
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
        return `NTFY_${response.status}`;
      }
    }
    return 'NTFY_ERROR';
  }
}
