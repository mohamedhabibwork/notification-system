/**
 * Signal Provider Implementation
 *
 * Concrete implementation for Signal messenger integration.
 * Requires Signal CLI or Signal API gateway.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { SignalCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class SignalProvider extends BaseProvider<SignalCredentials> {
  constructor(credentials: SignalCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const signalPayload = this.formatPayload(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if configured
      if (this.credentials.apiKey) {
        headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
      }

      const response = await axios.post(
        `${this.credentials.apiUrl}/v2/send`,
        signalPayload,
        { headers },
      );

      const result: ProviderSendResult = {
        success: response.status === 200 || response.status === 201,
        messageId:
          response.data?.timestamp?.toString() || Date.now().toString(),
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
      // Test API connectivity
      const headers: Record<string, string> = {};
      if (this.credentials.apiKey) {
        headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
      }

      const response = await axios.get(`${this.credentials.apiUrl}/v1/about`, {
        headers,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error(
        `Signal validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const recipientNumber =
      this.credentials.recipientNumber ||
      payload.recipient.phone ||
      payload.recipient.metadata?.phoneNumber;

    if (!recipientNumber) {
      throw new Error('Recipient phone number is required for Signal messages');
    }

    return {
      number: this.credentials.senderNumber,
      recipients: [recipientNumber],
      message: payload.content.body,
    };
  }

  getRequiredCredentials(): string[] {
    return ['apiUrl', 'senderNumber'];
  }

  getChannel(): ChannelType {
    return 'messenger';
  }

  getProviderName(): string {
    return 'signal';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Signal',
      description: 'Signal messenger for private, encrypted communications',
      version: '1.0.0',
      supportedFeatures: ['text', 'encryption', 'media', 'groups'],
      rateLimit: {
        maxPerSecond: 10,
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
        return `SIGNAL_${response.status}`;
      }
    }
    return 'SIGNAL_ERROR';
  }
}
