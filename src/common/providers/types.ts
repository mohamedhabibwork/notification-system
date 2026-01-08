/**
 * Common types for provider system
 */

export type ChannelType = 'email' | 'sms' | 'fcm' | 'whatsapp' | 'database';

export interface ProviderOptions {
  requestedProvider?: string;
  tenantId?: number;
  fallbackProvider?: string;
}
