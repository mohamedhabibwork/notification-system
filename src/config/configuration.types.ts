/**
 * Configuration Types
 *
 * TypeScript interfaces for the entire application configuration.
 * Provides type safety for all configuration values.
 */

export interface AppConfig {
  port: number;
  host: string;
  environment: string;
}

export interface GrpcConfig {
  enabled: boolean;
  port: number;
  notificationServiceUrl: string;
  templateServiceUrl: string;
  tenantServiceUrl: string;
}

export interface GraphQLConfig {
  enabled: boolean;
  playground: boolean;
  introspection: boolean;
  subscriptions: boolean;
}

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
}

export interface KeycloakConfig {
  realm: string;
  serverUrl: string;
  userClientId: string;
  serviceClientId: string;
  serviceClientSecret: string;
  adminClientId: string;
  adminUsername: string;
  adminPassword: string;
}

export interface KafkaTopics {
  orderCreated: string;
  orderShipped: string;
  paymentCompleted: string;
  paymentFailed: string;
  userRegistered: string;
  userPasswordReset: string;
  notificationQueued: string;
  notificationSent: string;
  notificationDelivered: string;
  notificationFailed: string;
  notificationRead: string;
}

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  consumerGroupId: string;
  topics: KafkaTopics;
}

export interface UserServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheTtl: number;
}

export interface QueueConcurrencyConfig {
  email: number;
  sms: number;
  fcm: number;
  whatsapp: number;
  database: number;
}

export interface QueueRetryConfig {
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface QueueRemoveConfig {
  age: number;
  count?: number;
}

export interface QueueConfig {
  concurrency: QueueConcurrencyConfig;
  retry: QueueRetryConfig;
  removeOnComplete: QueueRemoveConfig;
  removeOnFail: Omit<QueueRemoveConfig, 'count'>;
}

// Provider Configurations

export interface SendGridProviderConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface SESProviderConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface MailgunProviderConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface EmailProvidersConfig {
  sendgrid: SendGridProviderConfig;
  ses: SESProviderConfig;
  mailgun: MailgunProviderConfig;
}

export interface TwilioProviderConfig {
  accountSid: string;
  authToken: string;
  fromPhone: string;
  enabled: boolean;
}

export interface SNSProviderConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  enabled: boolean;
}

export interface SmsProvidersConfig {
  twilio: TwilioProviderConfig;
  sns: SNSProviderConfig;
}

export interface FirebaseProviderConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  enabled: boolean;
}

export interface APNProviderConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
  enabled: boolean;
}

export interface FcmProvidersConfig {
  firebase: FirebaseProviderConfig;
  apn: APNProviderConfig;
}

export interface WhatsAppBusinessProviderConfig {
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  enabled: boolean;
}

export interface WPPConnectProviderConfig {
  sessionName: string;
  phoneNumberId: string;
  autoClose: number;
  qrTimeout: number;
  useChrome: boolean;
  disableWelcome: boolean;
  tokenStore: string;
  folderNameToken: string;
  enabled: boolean;
}

export interface WhatsAppProvidersConfig {
  'whatsapp-business': WhatsAppBusinessProviderConfig;
  wppconnect: WPPConnectProviderConfig;
}

export interface ProviderDefaults {
  email: string;
  sms: string;
  fcm: string;
  whatsapp: string;
}

export interface ProvidersConfig {
  defaults: ProviderDefaults;
  email: EmailProvidersConfig;
  sms: SmsProvidersConfig;
  fcm: FcmProvidersConfig;
  whatsapp: WhatsAppProvidersConfig;
}

export interface WebSocketCorsConfig {
  origin: string;
  credentials: boolean;
}

export interface WebSocketConfig {
  cors: WebSocketCorsConfig;
  pingInterval: number;
  pingTimeout: number;
}

export interface SecurityConfig {
  encryptionKey: string;
  encryptionAlgorithm: string;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface LoggingConfig {
  level: string;
  format: string;
  enableConsole: boolean;
  enableFile: boolean;
  filePath: string;
}

export interface SeedingConfig {
  enabled: boolean;
  resetOnStart: boolean;
  seedAdminUsers: boolean;
  seedTestUsers: boolean;
  seedServiceAccounts: boolean;
  seedTenants: boolean;
  seedTemplates: boolean;
  seedCategories: boolean;
  seedProviders: boolean;
}

/**
 * Complete Application Configuration
 */
export interface AppConfiguration {
  app: AppConfig;
  grpc: GrpcConfig;
  graphql: GraphQLConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  keycloak: KeycloakConfig;
  kafka: KafkaConfig;
  userService: UserServiceConfig;
  queue: QueueConfig;
  providers: ProvidersConfig;
  websocket: WebSocketConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  seeding: SeedingConfig;
}
