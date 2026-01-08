/**
 * Core Provider Interfaces
 *
 * Defines the contracts that all notification providers must implement.
 * Uses the Strategy Pattern to allow interchangeable provider implementations.
 */

import { ChannelType } from '../types';

export interface IProvider<
  TCredentials extends IProviderCredentials = IProviderCredentials,
> {
  /**
   * Send notification through this provider
   */
  send(payload: ProviderSendPayload): Promise<ProviderSendResult>;

  /**
   * Validate credentials and connectivity
   */
  validate(): Promise<boolean>;

  /**
   * Get required credential fields
   */
  getRequiredCredentials(): string[];

  /**
   * Get the channel this provider supports
   */
  getChannel(): ChannelType;

  /**
   * Get provider unique name
   */
  getProviderName(): string;

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata;
}

export interface IProviderCredentials {
  providerType: string;
  channel: ChannelType;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProviderSendPayload {
  recipient: {
    email?: string;
    phone?: string;
    deviceToken?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  };
  content: {
    subject?: string;
    body: string;
    htmlBody?: string;
    data?: Record<string, unknown>;
  };
  options?: Record<string, unknown>;
}

export interface ProviderSendResult {
  success: boolean;
  providerId?: string;
  messageId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  error?: ProviderError;
}

export interface ProviderMetadata {
  displayName: string;
  description?: string;
  version: string;
  supportedFeatures: string[];
  rateLimit?: {
    maxPerSecond: number;
    maxPerDay: number;
  };
}

export interface ProviderError {
  code: string;
  message: string;
  isRetryable: boolean;
  originalError?: Error;
}
