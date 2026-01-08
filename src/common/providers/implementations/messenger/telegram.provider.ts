/**
 * Telegram Provider Implementation
 *
 * Concrete implementation for Telegram bot integration.
 * Handles message sending through Telegram Bot API.
 */

import axios from 'axios';
import { BaseProvider } from '../../base/base.provider';
import { TelegramCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';

export class TelegramProvider extends BaseProvider<TelegramCredentials> {
  private readonly baseUrl: string;

  constructor(credentials: TelegramCredentials) {
    super(credentials);
    this.baseUrl = `https://api.telegram.org/bot${credentials.botToken}`;
  }

  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      const telegramPayload = this.formatPayload(payload);
      const response = await axios.post(
        `${this.baseUrl}/sendMessage`,
        telegramPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result: ProviderSendResult = {
        success: response.data?.ok === true,
        messageId: response.data?.result?.message_id?.toString(),
        timestamp: new Date(),
        metadata: {
          statusCode: response.status,
          chatId: response.data?.result?.chat?.id,
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
      // Validate bot token by calling getMe
      const response = await axios.get(`${this.baseUrl}/getMe`);
      return response.data?.ok === true;
    } catch (error) {
      this.logger.error(
        `Telegram validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  protected formatPayload(
    payload: ProviderSendPayload,
  ): Record<string, unknown> {
    const chatId =
      this.credentials.chatId ||
      payload.recipient.userId ||
      payload.recipient.metadata?.chatId;

    if (!chatId) {
      throw new Error('Chat ID is required for Telegram messages');
    }

    const telegramMessage: Record<string, unknown> = {
      chat_id: chatId,
      text: payload.content.body,
    };

    // Add parse mode if configured
    if (this.credentials.parseMode) {
      telegramMessage.parse_mode = this.credentials.parseMode;
    }

    // Disable web page preview if configured
    if (this.credentials.disableWebPagePreview) {
      telegramMessage.disable_web_page_preview = true;
    }

    return telegramMessage;
  }

  getRequiredCredentials(): string[] {
    return ['botToken'];
  }

  getChannel(): ChannelType {
    return 'messenger';
  }

  getProviderName(): string {
    return 'telegram';
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: 'Telegram',
      description: 'Telegram Bot API for instant messaging notifications',
      version: '1.0.0',
      supportedFeatures: [
        'text',
        'markdown',
        'html',
        'media',
        'inline-keyboards',
        'buttons',
      ],
      rateLimit: {
        maxPerSecond: 30,
        maxPerDay: 1000000,
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
        data?: { error_code?: number; description?: string };
      };
      if (response.data?.error_code) {
        return `TELEGRAM_${response.data.error_code}`;
      }
    }
    return 'TELEGRAM_ERROR';
  }
}
