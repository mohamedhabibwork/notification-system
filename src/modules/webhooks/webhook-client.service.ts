import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { WebhookConfigService } from './webhook-config.service';
import { RetryService } from '../../common/resilience/retry.service';
import { CircuitBreakerService } from '../../common/resilience/circuit-breaker.service';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  tenantId: number;
  notification: {
    id: number;
    uuid: string;
    channel: string;
    status: string;
    recipient: any;
    sentAt?: Date;
    deliveredAt?: Date;
    failedAt?: Date;
    failureReason?: string;
  };
}

@Injectable()
export class WebhookClientService {
  private readonly logger = new Logger(WebhookClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly webhookConfigService: WebhookConfigService,
    private readonly retryService: RetryService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async sendWebhook(
    tenantId: number,
    payload: WebhookPayload,
  ): Promise<boolean> {
    try {
      // Get webhook configuration for this tenant and event
      const webhookUrl = await this.webhookConfigService.getWebhookUrlForEvent(
        tenantId,
        payload.event,
      );

      if (!webhookUrl) {
        this.logger.debug(
          `No webhook configured for tenant ${tenantId} and event ${payload.event}`,
        );
        return false;
      }

      // Get full configuration
      const config = await this.webhookConfigService.findActiveByTenant(
        tenantId,
      );

      if (!config) {
        return false;
      }

      // Generate signature
      const signature = this.generateSignature(
        JSON.stringify(payload),
        config.webhookSecret || '',
      );

      const startTime = Date.now();
      let success: 'success' | 'failed' = 'failed';
      let statusCode: number | null = null;
      let responseBody: string | null = null;
      let errorMessage: string | null = null;

      try {
        // Send with retry and circuit breaker
        await this.retryService.executeWithRetry(
          `webhook-${tenantId}`,
          async () => {
            return await this.circuitBreakerService.execute(
              `webhook-${webhookUrl}`,
              () => this.sendRequest(webhookUrl, payload, signature, config),
            );
          },
          config.retryConfig,
        );

        success = 'success';
        this.logger.log(
          `Webhook sent successfully to ${webhookUrl} for event ${payload.event}`,
        );
      } catch (error) {
        errorMessage = error.message;
        statusCode = error.response?.status || null;
        responseBody = error.response?.data || null;
        this.logger.error(
          `Failed to send webhook to ${webhookUrl}: ${error.message}`,
        );
      }

      const responseTime = Date.now() - startTime;

      // Log delivery attempt
      await this.webhookConfigService.logDelivery(
        config.id,
        payload.notification.id,
        payload.event,
        webhookUrl,
        payload,
        { 'X-Webhook-Signature': signature },
        statusCode,
        responseBody,
        responseTime,
        1,
        success,
        errorMessage,
      );

      return success === 'success';
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      return false;
    }
  }

  async sendWebhookDirect(
    url: string,
    payload: WebhookPayload,
    secret?: string,
  ): Promise<boolean> {
    try {
      // Generate signature
      const signature = this.generateSignature(
        JSON.stringify(payload),
        secret || '',
      );

      // Send webhook with retries
      await this.sendWithRetry(url, payload, signature, 3);

      this.logger.log(
        `Webhook sent successfully to ${url} for event ${payload.event}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send webhook to ${url}: ${error.message}`);
      return false;
    }
  }

  private async sendRequest(
    url: string,
    payload: any,
    signature: string,
    config: any,
  ): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': new Date().toISOString(),
      'User-Agent': 'Notification-Service-Webhook/1.0',
      ...config.headers,
    };

    const response = await firstValueFrom(
      this.httpService.post(url, payload, {
        headers,
        timeout: config.timeoutMs || 10000,
      }),
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Webhook returned status ${response.status}`);
    }

    return response;
  }

  private async sendWithRetry(
    url: string,
    payload: any,
    signature: string,
    maxRetries: number,
  ): Promise<void> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Timestamp': new Date().toISOString(),
              'User-Agent': 'Notification-Service-Webhook/1.0',
            },
            timeout: 10000,
          }),
        );

        if (response.status >= 200 && response.status < 300) {
          return;
        }

        throw new Error(`Webhook returned status ${response.status}`);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Webhook attempt ${attempt}/${maxRetries} failed: ${error.message}`,
        );

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public methods for different webhook events
  async notificationQueued(notification: any) {
    const payload: WebhookPayload = {
      event: 'notification.queued',
      timestamp: new Date().toISOString(),
      tenantId: notification.tenantId,
      notification: {
        id: notification.id,
        uuid: notification.uuid,
        channel: notification.channel,
        status: 'queued',
        recipient: {
          userId: notification.recipientUserId,
          email: notification.recipientEmail,
          phone: notification.recipientPhone,
        },
      },
    };

    return this.sendWebhook(notification.tenantId, payload);
  }

  async notificationSent(notification: any) {
    const payload: WebhookPayload = {
      event: 'notification.sent',
      timestamp: new Date().toISOString(),
      tenantId: notification.tenantId,
      notification: {
        id: notification.id,
        uuid: notification.uuid,
        channel: notification.channel,
        status: 'sent',
        recipient: {
          userId: notification.recipientUserId,
          email: notification.recipientEmail,
          phone: notification.recipientPhone,
        },
        sentAt: notification.sentAt,
      },
    };

    return this.sendWebhook(notification.tenantId, payload);
  }

  async notificationDelivered(notification: any) {
    const payload: WebhookPayload = {
      event: 'notification.delivered',
      timestamp: new Date().toISOString(),
      tenantId: notification.tenantId,
      notification: {
        id: notification.id,
        uuid: notification.uuid,
        channel: notification.channel,
        status: 'delivered',
        recipient: {
          userId: notification.recipientUserId,
          email: notification.recipientEmail,
          phone: notification.recipientPhone,
        },
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
      },
    };

    return this.sendWebhook(notification.tenantId, payload);
  }

  async notificationFailed(notification: any) {
    const payload: WebhookPayload = {
      event: 'notification.failed',
      timestamp: new Date().toISOString(),
      tenantId: notification.tenantId,
      notification: {
        id: notification.id,
        uuid: notification.uuid,
        channel: notification.channel,
        status: 'failed',
        recipient: {
          userId: notification.recipientUserId,
          email: notification.recipientEmail,
          phone: notification.recipientPhone,
        },
        failedAt: notification.failedAt,
        failureReason: notification.failureReason,
      },
    };

    return this.sendWebhook(notification.tenantId, payload);
  }

  async notificationRead(notification: any) {
    const payload: WebhookPayload = {
      event: 'notification.read',
      timestamp: new Date().toISOString(),
      tenantId: notification.tenantId,
      notification: {
        id: notification.id,
        uuid: notification.uuid,
        channel: notification.channel,
        status: 'read',
        recipient: {
          userId: notification.recipientUserId,
        },
      },
    };

    return this.sendWebhook(notification.tenantId, payload);
  }
}
