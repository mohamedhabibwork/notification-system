/**
 * Huawei Push Kit Provider Implementation
 *
 * Implements Huawei Push Kit (HMS Core) for push notifications to Huawei devices.
 * Uses OAuth 2.0 for authentication and REST API v1 for sending messages.
 */

import axios, { AxiosError } from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { HuaweiPushKitCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

interface HuaweiAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface HuaweiPushMessage {
  validate_only?: boolean;
  message: {
    data?: string;
    notification?: {
      title?: string;
      body?: string;
      image?: string;
    };
    android?: {
      collapse_key?: number;
      urgency?: 'HIGH' | 'NORMAL';
      ttl?: string;
      bi_tag?: string;
      notification?: {
        title?: string;
        body?: string;
        icon?: string;
        color?: string;
        sound?: string;
        default_sound?: boolean;
        tag?: string;
        click_action?: {
          type: 1 | 2 | 3; // 1=open app, 2=open url, 3=open intent
          intent?: string;
          url?: string;
          action?: string;
        };
        body_loc_key?: string;
        body_loc_args?: string[];
        title_loc_key?: string;
        title_loc_args?: string[];
        channel_id?: string;
        notify_summary?: string;
        image?: string;
        style?: 0 | 1 | 2 | 3; // 0=default, 1=big text, 2=inbox, 3=big picture
        big_title?: string;
        big_body?: string;
        auto_clear?: number;
        notify_id?: number;
        group?: string;
        badge?: {
          add_num?: number;
          set_num?: number;
          class?: string;
        };
        ticker?: string;
        auto_cancel?: boolean;
        when?: string;
        importance?: 'LOW' | 'NORMAL' | 'HIGH';
        use_default_vibrate?: boolean;
        use_default_light?: boolean;
        vibrate_config?: string[];
        visibility?: 'PUBLIC' | 'PRIVATE' | 'SECRET';
        light_settings?: {
          color?: {
            alpha?: number;
            red?: number;
            green?: number;
            blue?: number;
          };
          light_on_duration?: string;
          light_off_duration?: string;
        };
        foreground_show?: boolean;
      };
    };
    token?: string[];
    topic?: string;
    condition?: string;
  };
}

export class HuaweiPushKitProvider extends BaseProvider<HuaweiPushKitCredentials> {
  private readonly authUrl =
    'https://oauth-login.cloud.huawei.com/oauth2/v3/token';
  private readonly pushApiBaseUrl = 'https://push-api.cloud.huawei.com';
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor(credentials: HuaweiPushKitCredentials) {
    super(credentials);
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      // Get access token
      const token = await this.getAccessToken();

      // Format payload for Huawei
      const huaweiPayload = this.formatPayload(payload);

      // Send push notification
      const response = await axios.post(
        `${this.pushApiBaseUrl}/v1/${this.credentials.appId}/messages:send`,
        huaweiPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const result: ProviderSendResult = {
        success: response.data?.code === '80000000',
        messageId: response.data?.requestId || response.data?.msg,
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          code: response.data?.code,
          msg: response.data?.msg,
        },
      };

      this.logSendSuccess(result);
      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Huawei Push Kit send failed: ${axiosError.message}`,
        axiosError.response?.data,
      );

      return {
        success: false,
        timestamp: new Date(),
        error: this.handleError(axiosError),
      };
    }
  }

  async validate(): Promise<boolean> {
    if (!this.validateCredentials()) {
      return false;
    }

    try {
      // Validate by obtaining an access token
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      this.logger.error(
        `Huawei Push Kit validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(payload: ProviderSendPayload): HuaweiPushMessage {
    const deviceToken = payload.recipient.deviceToken;
    if (!deviceToken) {
      throw new Error('Device token is required for Huawei Push Kit');
    }

    const message: HuaweiPushMessage = {
      validate_only: false,
      message: {
        notification: {
          title: payload.content.subject || 'Notification',
          body: payload.content.body,
        },
        android: {
          urgency: 'HIGH',
          ttl: '86400s', // 24 hours
          notification: {
            title: payload.content.subject || 'Notification',
            body: payload.content.body,
            click_action: {
              type: 1, // Open app
            },
            default_sound: true,
            importance: 'HIGH',
            foreground_show: true,
          },
        },
        token: [deviceToken],
      },
    };

    // Add custom data if provided
    if (payload.content.data) {
      message.message.data = JSON.stringify(payload.content.data);
    }

    // Add custom options from payload
    if (payload.options) {
      const options = payload.options;

      // Priority
      if (options.priority === 'normal') {
        message.message.android!.urgency = 'NORMAL';
        if (message.message.android!.notification) {
          message.message.android!.notification.importance = 'NORMAL';
        }
      }

      // TTL (time to live)
      if (options.ttl) {
        message.message.android!.ttl = `${options.ttl}s`;
      }

      // Sound
      if (options.sound) {
        if (message.message.android!.notification) {
          message.message.android!.notification.sound = options.sound as string;
          message.message.android!.notification.default_sound = false;
        }
      }

      // Badge
      if (
        options.badge !== undefined &&
        message.message.android!.notification
      ) {
        message.message.android!.notification.badge = {
          add_num: options.badge as number,
        };
      }

      // Image/Icon
      if (options.image && message.message.android!.notification) {
        message.message.android!.notification.image = options.image as string;
      }

      // Channel ID (for Android O+)
      if (options.channelId && message.message.android!.notification) {
        message.message.android!.notification.channel_id =
          options.channelId as string;
      }

      // Click action URL
      if (options.clickAction && message.message.android!.notification) {
        message.message.android!.notification.click_action = {
          type: 2, // Open URL
          url: options.clickAction as string,
        };
      }

      // Collapse key for message grouping
      if (options.collapseKey) {
        message.message.android!.collapse_key = options.collapseKey as number;
      }
    }

    return message;
  }

  /**
   * Get OAuth 2.0 access token using client credentials
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.post<HuaweiAccessToken>(
        this.authUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      // Set expiry time with 5 minute buffer
      this.tokenExpiryTime =
        Date.now() + (response.data.expires_in - 300) * 1000;

      this.logger.log('Successfully obtained Huawei Push Kit access token');
      return this.accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to obtain Huawei access token: ${axiosError.message}`,
        axiosError.response?.data,
      );
      throw new Error(
        `Huawei OAuth token generation failed: ${axiosError.message}`,
      );
    }
  }

  getRequiredCredentials(): string[] {
    return ['appId', 'appSecret', 'clientId', 'clientSecret'];
  }

  getChannel(): ChannelType {
    return 'fcm';
  }

  getProviderName(): string {
    return 'huawei-pushkit';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Huawei Push Kit',
      description:
        'Huawei Push Kit (HMS Core) for push notifications to Huawei devices',
      version: '1.0.0',
      supportedFeatures: [
        'push-notification',
        'data-messages',
        'notification-messages',
        'priority-levels',
        'ttl',
        'collapse-key',
        'custom-sounds',
        'badges',
        'images',
        'click-actions',
        'android-channels',
      ],
      rateLimit: {
        maxPerSecond: 10,
        maxPerDay: 1000000, // 1M per day for free tier
      },
    };
  }

  protected extractErrorCode(error: Error): string {
    const axiosError = error as AxiosError;
    if (axiosError.response?.data) {
      const data = axiosError.response.data as { code?: string };
      if (data.code) {
        return `HUAWEI_${data.code}`;
      }
    }
    return 'HUAWEI_ERROR';
  }

  protected isRetryableError(error: Error): boolean {
    const axiosError = error as AxiosError;
    const data = axiosError.response?.data as { code?: string };

    // Huawei error codes that are retryable
    const retryableCodes = [
      '80100000', // Service not available
      '80100001', // Request timeout
      '80100002', // System error
      '80100003', // Overload
      '80200001', // OAuth token expired
      '80300007', // Quota exceeded
    ];

    if (data?.code && retryableCodes.includes(data.code)) {
      return true;
    }

    return super.isRetryableError(error);
  }
}
