/**
 * SendGrid Provider Implementation
 *
 * Concrete implementation of the email provider for SendGrid.
 * Handles email sending through SendGrid's API.
 */

import * as sgMail from '@sendgrid/mail';
import { BaseProvider } from '../../base/base.provider';
import { SendGridCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class SendGridProvider extends BaseProvider<SendGridCredentials> {
  constructor(credentials: SendGridCredentials) {
    super(credentials);
    sgMail.setApiKey(credentials.apiKey);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const msg = this.formatPayload(payload);
      const [response] = await sgMail.send(msg);

      const result: ProviderSendResult = {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        timestamp: new Date(),
        metadata: {
          statusCode: response.statusCode,
          headers: response.headers,
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
      // Test API key validity
      sgMail.setApiKey(this.credentials.apiKey);
      // Could make a test API call here
      return true;
    } catch (error) {
      this.logger.error(
        `SendGrid validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): sgMail.MailDataRequired {
    return {
      to: payload.recipient.email!,
      from: {
        email: this.credentials.fromEmail,
        name: this.credentials.fromName,
      },
      subject: payload.content.subject || '',
      text: payload.content.body,
      html: payload.content.htmlBody,
      trackingSettings: {
        clickTracking: { enable: this.credentials.trackClicks ?? true },
        openTracking: { enable: this.credentials.trackOpens ?? true },
      },
      categories: this.credentials.categories,
    };
  }

  getRequiredCredentials(): string[] {
    return ['apiKey', 'fromEmail', 'fromName'];
  }

  getChannel(): ChannelType {
    return 'email';
  }

  getProviderName(): string {
    return 'sendgrid';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'SendGrid',
      description: 'SendGrid email delivery service',
      version: '1.0.0',
      supportedFeatures: ['html', 'attachments', 'tracking', 'templates'],
      rateLimit: {
        maxPerSecond: 100,
        maxPerDay: 100000,
      },
    };
  }

  protected extractErrorCode(error: Error): string {
    if ('code' in error) {
      return (error as { code: number }).code.toString();
    }
    return 'SENDGRID_ERROR';
  }
}
