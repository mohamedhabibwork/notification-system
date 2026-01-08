/**
 * Twilio Provider Implementation
 *
 * Concrete implementation of the SMS provider for Twilio.
 * Handles SMS sending through Twilio's API.
 */

import { Twilio } from 'twilio';
import { BaseProvider } from '../../base/base.provider';
import { TwilioCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class TwilioProvider extends BaseProvider<TwilioCredentials> {
  private twilioClient: Twilio;

  constructor(credentials: TwilioCredentials) {
    super(credentials);
    this.twilioClient = new Twilio(
      credentials.accountSid,
      credentials.authToken,
    );
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const messageData = this.formatPayload(payload);
      const message = await this.twilioClient.messages.create(messageData);

      const result: ProviderSendResult = {
        success: true,
        messageId: message.sid,
        timestamp: new Date(),
        metadata: {
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
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
      // Test credentials by fetching account info
      await this.twilioClient.api.accounts(this.credentials.accountSid).fetch();
      return true;
    } catch (error) {
      this.logger.error(
        `Twilio validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(payload: ProviderSendPayload): {
    to: string;
    from: string;
    body: string;
    messagingServiceSid?: string;
  } {
    const messageData: {
      to: string;
      from: string;
      body: string;
      messagingServiceSid?: string;
    } = {
      to: payload.recipient.phone!,
      from: this.credentials.fromPhone,
      body: payload.content.body,
    };

    if (this.credentials.messagingServiceSid) {
      messageData.messagingServiceSid = this.credentials.messagingServiceSid;
    }

    return messageData;
  }

  getRequiredCredentials(): string[] {
    return ['accountSid', 'authToken', 'fromPhone'];
  }

  getChannel(): ChannelType {
    return 'sms';
  }

  getProviderName(): string {
    return 'twilio';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Twilio',
      description: 'Twilio SMS delivery service',
      version: '1.0.0',
      supportedFeatures: ['sms', 'mms', 'status-callbacks'],
      rateLimit: {
        maxPerSecond: 10,
        maxPerDay: 10000,
      },
    };
  }

  protected extractErrorCode(error: Error): string {
    if ('code' in error) {
      return (error as { code: number }).code.toString();
    }
    return 'TWILIO_ERROR';
  }
}
