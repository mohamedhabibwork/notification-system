/**
 * Provider Credentials Type Definitions
 * 
 * Defines type-safe credential interfaces for all supported providers.
 * Uses discriminated unions for type safety and autocomplete support.
 */

import { IProviderCredentials } from './provider.interface';

// ============================================================================
// Base Credentials
// ============================================================================

export interface BaseEmailCredentials extends IProviderCredentials {
  channel: 'email';
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export interface BaseSmsCredentials extends IProviderCredentials {
  channel: 'sms';
  fromPhone: string;
}

export interface BaseFcmCredentials extends IProviderCredentials {
  channel: 'fcm';
  projectId: string;
}

export interface BaseWhatsAppCredentials extends IProviderCredentials {
  channel: 'whatsapp';
  phoneNumberId: string;
}

// ============================================================================
// Email Provider Credentials
// ============================================================================

export interface SendGridCredentials extends BaseEmailCredentials {
  providerType: 'sendgrid';
  apiKey: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  categories?: string[];
}

export interface SESCredentials extends BaseEmailCredentials {
  providerType: 'ses';
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  configurationSet?: string;
}

export interface MailgunCredentials extends BaseEmailCredentials {
  providerType: 'mailgun';
  apiKey: string;
  domain: string;
  region?: 'us' | 'eu';
}

// ============================================================================
// SMS Provider Credentials
// ============================================================================

export interface TwilioCredentials extends BaseSmsCredentials {
  providerType: 'twilio';
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
}

export interface SNSCredentials extends BaseSmsCredentials {
  providerType: 'sns';
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  smsType?: 'Promotional' | 'Transactional';
}

// ============================================================================
// FCM Provider Credentials
// ============================================================================

export interface FirebaseCredentials extends BaseFcmCredentials {
  providerType: 'firebase';
  privateKey: string;
  clientEmail: string;
}

export interface APNCredentials extends BaseFcmCredentials {
  providerType: 'apn';
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
}

// ============================================================================
// WhatsApp Provider Credentials
// ============================================================================

export interface WhatsAppBusinessCredentials extends BaseWhatsAppCredentials {
  providerType: 'whatsapp-business';
  businessAccountId: string;
  accessToken: string;
}

export interface WPPConnectCredentials extends BaseWhatsAppCredentials {
  providerType: 'wppconnect';
  sessionName: string;
  autoClose?: number;
  disableWelcome?: boolean;
  qrTimeout?: number;
  useChrome?: boolean;
  tokenStore?: string;
  folderNameToken?: string;
}

// ============================================================================
// Discriminated Unions
// ============================================================================

export type EmailProviderCredentials = 
  | SendGridCredentials 
  | SESCredentials 
  | MailgunCredentials;

export type SmsProviderCredentials = 
  | TwilioCredentials 
  | SNSCredentials;

export type FcmProviderCredentials = 
  | FirebaseCredentials 
  | APNCredentials;

export type WhatsAppProviderCredentials = 
  | WhatsAppBusinessCredentials
  | WPPConnectCredentials;

export type AllProviderCredentials = 
  | EmailProviderCredentials 
  | SmsProviderCredentials 
  | FcmProviderCredentials 
  | WhatsAppProviderCredentials;
