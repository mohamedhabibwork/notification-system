/**
 * Base Provider Abstract Class
 *
 * Provides shared logic for all notification providers.
 * Implements common functionality like error handling, logging, and validation.
 *
 * Concrete providers extend this class and implement the abstract methods.
 */

import { Logger } from '@nestjs/common';
import {
  IProvider,
  IProviderCredentials,
  ProviderSendPayload,
  ProviderSendResult,
  ProviderError,
  ProviderMetadata,
} from '../interfaces/provider.interface';
import { ChannelType } from '../types';

export abstract class BaseProvider<
  TCredentials extends IProviderCredentials,
> implements IProvider<TCredentials> {
  protected readonly logger: Logger;
  protected readonly credentials: TCredentials;

  constructor(credentials: TCredentials) {
    this.credentials = credentials;
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Abstract method - Must be implemented by each provider
   */
  abstract send(payload: ProviderSendPayload): Promise<ProviderSendResult>;

  /**
   * Abstract method - Validate provider credentials
   */
  abstract validate(): Promise<boolean>;

  /**
   * Abstract method - Format payload for specific provider
   */
  protected abstract formatPayload(payload: ProviderSendPayload): unknown;

  /**
   * Get required credential fields
   */
  abstract getRequiredCredentials(): string[];

  /**
   * Get channel type
   */
  abstract getChannel(): ChannelType;

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Get provider metadata
   */
  abstract getMetadata(): ProviderMetadata;

  /**
   * Check if credentials are valid
   */
  protected validateCredentials(): boolean {
    const required = this.getRequiredCredentials();
    return required.every((field) => {
      const value = (this.credentials as Record<string, unknown>)[field];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Handle provider errors with proper formatting
   */
  protected handleError(error: Error, context?: string): ProviderError {
    this.logger.error(`Provider error: ${error.message}`, error.stack);

    return {
      code: this.extractErrorCode(error),
      message: error.message,
      isRetryable: this.isRetryableError(error),
      originalError: error,
    };
  }

  /**
   * Extract error code from provider-specific error
   */
  protected extractErrorCode(error: Error): string {
    // Can be overridden by specific providers
    return 'PROVIDER_ERROR';
  }

  /**
   * Determine if error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    // Can be overridden by specific providers
    const retryablePatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'RATE_LIMIT',
      '429',
      '503',
      '504',
    ];
    return retryablePatterns.some(
      (pattern) =>
        error.message.includes(pattern) || error.name.includes(pattern),
    );
  }

  /**
   * Log send attempt
   */
  protected logSendAttempt(payload: ProviderSendPayload): void {
    this.logger.log(
      `Sending via ${this.getProviderName()} to ${
        payload.recipient.email ||
        payload.recipient.phone ||
        payload.recipient.deviceToken
      }`,
    );
  }

  /**
   * Log send success
   */
  protected logSendSuccess(result: ProviderSendResult): void {
    this.logger.log(
      `Successfully sent via ${this.getProviderName()}, messageId: ${result.messageId}`,
    );
  }
}
