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

export interface BaseChatCredentials extends IProviderCredentials {
  channel: 'chat';
}

export interface BaseMessengerCredentials extends IProviderCredentials {
  channel: 'messenger';
}

export interface BasePushCredentials extends IProviderCredentials {
  channel: 'push';
}

export interface BaseAlertCredentials extends IProviderCredentials {
  channel: 'alert';
}

export interface BaseWebhookCredentials extends IProviderCredentials {
  channel: 'webhook';
}

export interface BaseIoTCredentials extends IProviderCredentials {
  channel: 'iot';
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
// Chat Provider Credentials
// ============================================================================

export interface DiscordCredentials extends BaseChatCredentials {
  providerType: 'discord';
  webhookUrl: string;
  botToken?: string;
  username?: string;
  avatarUrl?: string;
}

export interface SlackCredentials extends BaseChatCredentials {
  providerType: 'slack';
  webhookUrl?: string;
  botToken?: string;
  channelId?: string;
  username?: string;
  iconEmoji?: string;
}

export interface TeamsCredentials extends BaseChatCredentials {
  providerType: 'teams';
  webhookUrl: string;
}

export interface GoogleChatCredentials extends BaseChatCredentials {
  providerType: 'GoogleChat';
  webhookUrl: string;
  threadKey?: string;
}

export interface MattermostCredentials extends BaseChatCredentials {
  providerType: 'mattermost';
  webhookUrl: string;
  channelName?: string;
  username?: string;
  iconUrl?: string;
}

export interface RocketChatCredentials extends BaseChatCredentials {
  providerType: 'rocket.chat';
  serverUrl: string;
  userId: string;
  authToken: string;
  channelName?: string;
}

export interface MatrixCredentials extends BaseChatCredentials {
  providerType: 'matrix';
  homeserverUrl: string;
  accessToken: string;
  roomId: string;
}

export interface KookCredentials extends BaseChatCredentials {
  providerType: 'Kook';
  webhookUrl: string;
  botToken?: string;
}

export interface ZohoCliqCredentials extends BaseChatCredentials {
  providerType: 'ZohoCliq';
  webhookUrl: string;
}

export interface StackfieldCredentials extends BaseChatCredentials {
  providerType: 'stackfield';
  webhookUrl: string;
}

// ============================================================================
// Messenger Provider Credentials
// ============================================================================

export interface TelegramCredentials extends BaseMessengerCredentials {
  providerType: 'telegram';
  botToken: string;
  chatId?: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}

export interface SignalCredentials extends BaseMessengerCredentials {
  providerType: 'signal';
  apiUrl: string;
  apiKey?: string;
  senderNumber: string;
  recipientNumber?: string;
}

export interface LineMessengerCredentials extends BaseMessengerCredentials {
  providerType: 'line';
  channelAccessToken: string;
  channelSecret: string;
  userId?: string;
}

export interface LineNotifyCredentials extends BaseMessengerCredentials {
  providerType: 'LineNotify';
  accessToken: string;
}

// ============================================================================
// Push Notification Provider Credentials
// ============================================================================

export interface PushoverCredentials extends BasePushCredentials {
  providerType: 'pushover';
  userKey: string;
  apiToken: string;
  deviceName?: string;
  priority?: number;
  sound?: string;
}

export interface PushbulletCredentials extends BasePushCredentials {
  providerType: 'pushbullet';
  accessToken: string;
  deviceIden?: string;
  email?: string;
}

export interface PushyCredentials extends BasePushCredentials {
  providerType: 'pushy';
  apiKey: string;
  deviceToken?: string;
}

export interface PushByTechulusCredentials extends BasePushCredentials {
  providerType: 'PushByTechulus';
  apiKey: string;
  title?: string;
}

export interface GorushCredentials extends BasePushCredentials {
  providerType: 'gorush';
  serverUrl: string;
  apiKey?: string;
  platform: 'ios' | 'android';
  tokens: string[];
}

export interface GotifyCredentials extends BasePushCredentials {
  providerType: 'gotify';
  serverUrl: string;
  appToken: string;
  priority?: number;
}

export interface NtfyCredentials extends BasePushCredentials {
  providerType: 'ntfy';
  serverUrl?: string; // defaults to ntfy.sh
  topic: string;
  username?: string;
  password?: string;
  priority?: number;
  tags?: string[];
}

export interface BarkCredentials extends BasePushCredentials {
  providerType: 'Bark';
  serverUrl: string;
  deviceKey: string;
  sound?: string;
  group?: string;
}

export interface LunaSeaCredentials extends BasePushCredentials {
  providerType: 'lunasea';
  webhookUrl: string;
}

// ============================================================================
// Alert/Incident Management Provider Credentials
// ============================================================================

export interface AlertaCredentials extends BaseAlertCredentials {
  providerType: 'alerta';
  apiUrl: string;
  apiKey: string;
  environment?: string;
  service?: string[];
}

export interface AlertNowCredentials extends BaseAlertCredentials {
  providerType: 'AlertNow';
  apiUrl: string;
  apiKey: string;
}

export interface GoAlertCredentials extends BaseAlertCredentials {
  providerType: 'GoAlert';
  apiUrl: string;
  integrationKey: string;
}

export interface OpsgenieCredentials extends BaseAlertCredentials {
  providerType: 'Opsgenie';
  apiKey: string;
  region?: 'us' | 'eu';
  priority?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
}

export interface PagerDutyCredentials extends BaseAlertCredentials {
  providerType: 'PagerDuty';
  integrationKey: string;
  routingKey?: string;
  severity?: 'critical' | 'error' | 'warning' | 'info';
}

export interface PagerTreeCredentials extends BaseAlertCredentials {
  providerType: 'PagerTree';
  integrationUrl: string;
}

export interface SplunkCredentials extends BaseAlertCredentials {
  providerType: 'Splunk';
  hecUrl: string;
  hecToken: string;
  sourceType?: string;
  index?: string;
}

export interface SquadcastCredentials extends BaseAlertCredentials {
  providerType: 'squadcast';
  webhookUrl: string;
}

// ============================================================================
// SMS Provider Credentials (Expanded)
// ============================================================================

export interface ClickSendCredentials extends BaseSmsCredentials {
  providerType: 'clicksendsms';
  username: string;
  apiKey: string;
}

export interface OctopushCredentials extends BaseSmsCredentials {
  providerType: 'octopush';
  userLogin: string;
  apiKey: string;
  smsType?: 'sms_premium' | 'sms_low_cost';
}

export interface SMSEagleCredentials extends BaseSmsCredentials {
  providerType: 'SMSEagle';
  serverUrl: string;
  accessToken: string;
}

// ============================================================================
// Webhook Provider Credentials
// ============================================================================

export interface WebhookCredentials extends BaseWebhookCredentials {
  providerType: 'webhook';
  url: string;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  authType?: 'none' | 'basic' | 'bearer' | 'apikey';
  authToken?: string;
  username?: string;
  password?: string;
}

// ============================================================================
// IoT Provider Credentials
// ============================================================================

export interface HomeAssistantCredentials extends BaseIoTCredentials {
  providerType: 'HomeAssistant';
  serverUrl: string;
  accessToken: string;
  entityId?: string;
}

export interface NostrCredentials extends BaseIoTCredentials {
  providerType: 'nostr';
  relayUrls: string[];
  privateKey: string;
  publicKey?: string;
}

export interface OneBotCredentials extends BaseIoTCredentials {
  providerType: 'OneBot';
  apiUrl: string;
  accessToken: string;
  userId?: string;
  groupId?: string;
}

// ============================================================================
// Aggregator Provider Credentials
// ============================================================================

export interface AppriseCredentials extends IProviderCredentials {
  providerType: 'apprise';
  channel:
    | 'chat'
    | 'messenger'
    | 'push'
    | 'alert'
    | 'webhook'
    | 'iot'
    | 'email'
    | 'sms';
  serviceUrls: string[]; // Apprise URL format (e.g., discord://webhook_id/webhook_token)
  tags?: string[];
  title?: string;
  body?: string;
  notify_type?: 'info' | 'success' | 'warning' | 'failure';
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
  | SNSCredentials
  | ClickSendCredentials
  | OctopushCredentials
  | SMSEagleCredentials;

export type FcmProviderCredentials = FirebaseCredentials | APNCredentials;

export type WhatsAppProviderCredentials =
  | WhatsAppBusinessCredentials
  | WPPConnectCredentials;

export type ChatProviderCredentials =
  | DiscordCredentials
  | SlackCredentials
  | TeamsCredentials
  | GoogleChatCredentials
  | MattermostCredentials
  | RocketChatCredentials
  | MatrixCredentials
  | KookCredentials
  | ZohoCliqCredentials
  | StackfieldCredentials;

export type MessengerProviderCredentials =
  | TelegramCredentials
  | SignalCredentials
  | LineMessengerCredentials
  | LineNotifyCredentials;

export type PushProviderCredentials =
  | PushoverCredentials
  | PushbulletCredentials
  | PushyCredentials
  | PushByTechulusCredentials
  | GorushCredentials
  | GotifyCredentials
  | NtfyCredentials
  | BarkCredentials
  | LunaSeaCredentials;

export type AlertProviderCredentials =
  | AlertaCredentials
  | AlertNowCredentials
  | GoAlertCredentials
  | OpsgenieCredentials
  | PagerDutyCredentials
  | PagerTreeCredentials
  | SplunkCredentials
  | SquadcastCredentials;

export type WebhookProviderCredentials = WebhookCredentials;

export type IoTProviderCredentials =
  | HomeAssistantCredentials
  | NostrCredentials
  | OneBotCredentials;

export type AllProviderCredentials =
  | EmailProviderCredentials
  | SmsProviderCredentials
  | FcmProviderCredentials
  | WhatsAppProviderCredentials
  | ChatProviderCredentials
  | MessengerProviderCredentials
  | PushProviderCredentials
  | AlertProviderCredentials
  | WebhookProviderCredentials
  | IoTProviderCredentials
  | AppriseCredentials;
