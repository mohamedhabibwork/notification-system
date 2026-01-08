/**
 * Provider Seeding Data
 * 
 * Define notification channel providers and their configurations.
 * This allows database-driven provider management alongside environment variables.
 */

export interface SeedProvider {
  name: string;
  channel: 'email' | 'sms' | 'fcm' | 'whatsapp' | 'database';
  providerType: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  configuration: Record<string, any>;
  description?: string;
}

/**
 * Email Providers
 */
export const emailProviders: SeedProvider[] = [
  {
    name: 'sendgrid',
    channel: 'email',
    providerType: 'sendgrid',
    displayName: 'SendGrid',
    isDefault: true,
    isActive: true,
    priority: 1,
    configuration: {
      // Credentials loaded from environment: EMAIL_SENDGRID_API_KEY
      fromEmailTemplate: '{{tenant.email}}',
      fromNameTemplate: '{{tenant.name}}',
      trackOpens: true,
      trackClicks: true,
      categories: ['transactional'],
    },
    description: 'SendGrid email delivery service',
  },
  {
    name: 'aws-ses',
    channel: 'email',
    providerType: 'ses',
    displayName: 'AWS SES',
    isDefault: false,
    isActive: false,
    priority: 2,
    configuration: {
      // Credentials loaded from environment: EMAIL_SES_ACCESS_KEY_ID, etc.
      region: 'us-east-1',
      fromEmailTemplate: '{{tenant.email}}',
      fromNameTemplate: '{{tenant.name}}',
      configurationSet: 'default',
    },
    description: 'Amazon Simple Email Service',
  },
  {
    name: 'mailgun',
    channel: 'email',
    providerType: 'mailgun',
    displayName: 'Mailgun',
    isDefault: false,
    isActive: false,
    priority: 3,
    configuration: {
      // Credentials loaded from environment: EMAIL_MAILGUN_API_KEY, etc.
      domainTemplate: '{{tenant.domain}}',
      fromEmailTemplate: 'noreply@{{tenant.domain}}',
      fromNameTemplate: '{{tenant.name}}',
      trackingEnabled: true,
    },
    description: 'Mailgun email delivery platform',
  },
];

/**
 * SMS Providers
 */
export const smsProviders: SeedProvider[] = [
  {
    name: 'twilio',
    channel: 'sms',
    providerType: 'twilio',
    displayName: 'Twilio',
    isDefault: true,
    isActive: true,
    priority: 1,
    configuration: {
      // Credentials loaded from environment: SMS_TWILIO_ACCOUNT_SID, etc.
      messagingServiceSid: '',
      statusCallbackUrl: '/webhooks/twilio',
      maxMessageLength: 1600,
    },
    description: 'Twilio SMS delivery service',
  },
  {
    name: 'aws-sns',
    channel: 'sms',
    providerType: 'sns',
    displayName: 'AWS SNS',
    isDefault: false,
    isActive: false,
    priority: 2,
    configuration: {
      // Credentials loaded from environment: SMS_SNS_ACCESS_KEY_ID, etc.
      region: 'us-east-1',
      smsType: 'Transactional',
    },
    description: 'Amazon Simple Notification Service',
  },
];

/**
 * Push Notification Providers
 */
export const fcmProviders: SeedProvider[] = [
  {
    name: 'firebase',
    channel: 'fcm',
    providerType: 'firebase',
    displayName: 'Firebase Cloud Messaging',
    isDefault: true,
    isActive: true,
    priority: 1,
    configuration: {
      // Credentials loaded from environment: FCM_PROJECT_ID, etc.
      priority: 'high',
      timeToLive: 2419200,
      contentAvailable: true,
    },
    description: 'Firebase Cloud Messaging (FCM) for Android/iOS/Web',
  },
  {
    name: 'apple-apn',
    channel: 'fcm',
    providerType: 'apn',
    displayName: 'Apple Push Notification',
    isDefault: false,
    isActive: false,
    priority: 2,
    configuration: {
      // Credentials loaded from environment: APN_KEY_ID, etc.
      production: false,
      topic: '',
      priority: 10,
      expiration: 0,
    },
    description: 'Apple Push Notification Service (APNs)',
  },
];

/**
 * WhatsApp Providers
 */
export const whatsappProviders: SeedProvider[] = [
  {
    name: 'whatsapp-business',
    channel: 'whatsapp',
    providerType: 'whatsapp-business',
    displayName: 'WhatsApp Business API',
    isDefault: true,
    isActive: true,
    priority: 1,
    configuration: {
      // Credentials loaded from environment: WHATSAPP_BUSINESS_ACCOUNT_ID, etc.
      apiVersion: 'v18.0',
      webhookUrl: '/webhooks/whatsapp',
      messagingProduct: 'whatsapp',
    },
    description: 'WhatsApp Business API for messaging',
  },
  {
    name: 'wppconnect',
    channel: 'whatsapp',
    providerType: 'wppconnect',
    displayName: 'WPPConnect',
    isDefault: false,
    isActive: true,
    priority: 2,
    configuration: {
      // Credentials loaded from environment: WHATSAPP_WPPCONNECT_*
      sessionName: 'notification-service',
      autoClose: 60000,
      qrTimeout: 60000,
      useChrome: true,
      disableWelcome: true,
      tokenStore: 'file',
      folderNameToken: './tokens/wppconnect',
      webhookUrl: '/webhooks/wppconnect',
    },
    description: 'WPPConnect WhatsApp Web client for multi-tenant messaging',
  },
];

/**
 * Database Provider (Internal)
 */
export const databaseProviders: SeedProvider[] = [
  {
    name: 'database-inbox',
    channel: 'database',
    providerType: 'database',
    displayName: 'Database Inbox',
    isDefault: true,
    isActive: true,
    priority: 1,
    configuration: {
      tableName: 'user_notifications',
      retentionDays: 90,
    },
    description: 'Store notifications in database for in-app inbox',
  },
];

/**
 * All Providers Combined
 */
export const allProviders: SeedProvider[] = [
  ...emailProviders,
  ...smsProviders,
  ...fcmProviders,
  ...whatsappProviders,
  ...databaseProviders,
];
