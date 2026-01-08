/**
 * PagerDuty Provider Implementation
 *
 * Concrete implementation for PagerDuty incident management integration.
 * Handles alert/incident creation through PagerDuty Events API v2.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { PagerDutyCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class PagerDutyProvider extends BaseProvider<PagerDutyCredentials> {
  private readonly eventsApiUrl = 'https://events.pagerduty.com/v2/enqueue';

  constructor(credentials: PagerDutyCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const pagerDutyPayload = this.formatPayload(payload);
      const response = await axios.post(this.eventsApiUrl, pagerDutyPayload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.pagerduty+json;version=2',
        },
      });

      const result: ProviderSendResult = {
        success: response.data?.status === 'success',
        messageId: response.data?.dedup_key,
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          status: response.data?.status,
          message: response.data?.message,
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

    // PagerDuty doesn't have a simple validation endpoint
    // We assume credentials are valid if integration key is present
    return !!this.credentials.integrationKey;
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const dedupKey = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const pagerDutyEvent: Record<string, unknown> = {
      routing_key:
        this.credentials.routingKey || this.credentials.integrationKey,
      event_action: 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary:
          payload.content.subject || payload.content.body.substring(0, 1024),
        source: 'notification-system',
        severity: this.credentials.severity || 'error',
        timestamp: new Date().toISOString(),
        custom_details: {
          message: payload.content.body,
          html_message: payload.content.htmlBody,
        },
      },
    };

    return pagerDutyEvent;
  }

  getRequiredCredentials(): string[] {
    return ['integrationKey'];
  }

  getChannel(): ChannelType {
    return 'alert';
  }

  getProviderName(): string {
    return 'PagerDuty';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'PagerDuty',
      description: 'PagerDuty incident management and alerting platform',
      version: '1.0.0',
      supportedFeatures: [
        'incidents',
        'alerts',
        'escalations',
        'deduplication',
        'auto-resolve',
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
        data?: { status?: string };
      };
      if (response.data?.status) {
        return `PAGERDUTY_${response.data.status}`;
      }
      if (response.status) {
        return `PAGERDUTY_${response.status}`;
      }
    }
    return 'PAGERDUTY_ERROR';
  }
}
