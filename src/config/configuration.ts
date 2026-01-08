/**
 * Application Configuration
 *
 * Central configuration for the entire notification system.
 * Loads values from environment variables with sensible defaults.
 */

import { AppConfiguration } from './configuration.types';

export default (): AppConfiguration => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development',
  },

  grpc: {
    enabled: process.env.GRPC_ENABLED === 'true',
    port: parseInt(process.env.GRPC_PORT || '5001', 10),
    notificationServiceUrl:
      process.env.GRPC_NOTIFICATION_SERVICE_URL || 'localhost:5001',
    templateServiceUrl:
      process.env.GRPC_TEMPLATE_SERVICE_URL || 'localhost:5002',
    tenantServiceUrl: process.env.GRPC_TENANT_SERVICE_URL || 'localhost:5003',
  },

  graphql: {
    enabled: process.env.GRAPHQL_ENABLED === 'true', // Default disabled until resolvers are implemented
    playground: process.env.GRAPHQL_PLAYGROUND !== 'false',
    introspection: process.env.GRAPHQL_INTROSPECTION !== 'false',
    subscriptions: process.env.GRAPHQL_SUBSCRIPTIONS !== 'false',
  },

  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://notification:notification@localhost:5432/notification_db',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'notification:',
  },

  keycloak: {
    realm: process.env.KEYCLOAK_REALM || 'notification-realm',
    serverUrl: process.env.KEYCLOAK_SERVER_URL || 'http://localhost:8080',
    userClientId: process.env.KEYCLOAK_USER_CLIENT_ID || 'notification-client',
    serviceClientId:
      process.env.KEYCLOAK_SERVICE_CLIENT_ID || 'notification-service',
    serviceClientSecret: process.env.KEYCLOAK_SERVICE_CLIENT_SECRET || '',
    adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
    consumerGroupId:
      process.env.KAFKA_CONSUMER_GROUP_ID || 'notification-service-group',
    topics: {
      orderCreated: process.env.KAFKA_TOPIC_ORDER_CREATED || 'order.created',
      orderShipped: process.env.KAFKA_TOPIC_ORDER_SHIPPED || 'order.shipped',
      paymentCompleted:
        process.env.KAFKA_TOPIC_PAYMENT_COMPLETED || 'payment.completed',
      paymentFailed: process.env.KAFKA_TOPIC_PAYMENT_FAILED || 'payment.failed',
      userRegistered:
        process.env.KAFKA_TOPIC_USER_REGISTERED || 'user.registered',
      userPasswordReset:
        process.env.KAFKA_TOPIC_USER_PASSWORD_RESET || 'user.password-reset',
      notificationQueued:
        process.env.KAFKA_TOPIC_NOTIFICATION_QUEUED || 'notification.queued',
      notificationSent:
        process.env.KAFKA_TOPIC_NOTIFICATION_SENT || 'notification.sent',
      notificationDelivered:
        process.env.KAFKA_TOPIC_NOTIFICATION_DELIVERED ||
        'notification.delivered',
      notificationFailed:
        process.env.KAFKA_TOPIC_NOTIFICATION_FAILED || 'notification.failed',
      notificationRead:
        process.env.KAFKA_TOPIC_NOTIFICATION_READ || 'notification.read',
    },
  },

  userService: {
    baseUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '5000', 10),
    retryAttempts: parseInt(process.env.USER_SERVICE_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.USER_SERVICE_RETRY_DELAY || '1000', 10),
    cacheTtl: parseInt(process.env.USER_SERVICE_CACHE_TTL || '300', 10), // 5 minutes
  },

  queue: {
    concurrency: {
      email: parseInt(process.env.QUEUE_CONCURRENCY_EMAIL || '5', 10),
      sms: parseInt(process.env.QUEUE_CONCURRENCY_SMS || '10', 10),
      fcm: parseInt(process.env.QUEUE_CONCURRENCY_FCM || '20', 10),
      whatsapp: parseInt(process.env.QUEUE_CONCURRENCY_WHATSAPP || '5', 10),
      database: parseInt(process.env.QUEUE_CONCURRENCY_DATABASE || '50', 10),
    },
    retry: {
      attempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential' as const,
        delay: parseInt(process.env.QUEUE_RETRY_DELAY || '2000', 10),
      },
    },
    removeOnComplete: {
      age: parseInt(process.env.QUEUE_REMOVE_COMPLETE_AGE || '86400', 10), // 24 hours
      count: parseInt(process.env.QUEUE_REMOVE_COMPLETE_COUNT || '1000', 10),
    },
    removeOnFail: {
      age: parseInt(process.env.QUEUE_REMOVE_FAIL_AGE || '604800', 10), // 7 days
    },
  },

  providers: {
    // Default provider selection per channel
    defaults: {
      email: process.env.EMAIL_DEFAULT_PROVIDER || 'sendgrid',
      sms: process.env.SMS_DEFAULT_PROVIDER || 'twilio',
      fcm: process.env.FCM_DEFAULT_PROVIDER || 'firebase',
      whatsapp: process.env.WHATSAPP_DEFAULT_PROVIDER || 'whatsapp-business',
    },

    // Email providers
    email: {
      sendgrid: {
        apiKey: process.env.EMAIL_SENDGRID_API_KEY || '',
        fromEmail:
          process.env.EMAIL_SENDGRID_FROM_EMAIL || 'noreply@notification.local',
        fromName:
          process.env.EMAIL_SENDGRID_FROM_NAME || 'Notification Service',
        enabled: process.env.EMAIL_SENDGRID_ENABLED !== 'false',
      },
      ses: {
        region: process.env.EMAIL_SES_REGION || 'us-east-1',
        accessKeyId: process.env.EMAIL_SES_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.EMAIL_SES_SECRET_ACCESS_KEY || '',
        fromEmail:
          process.env.EMAIL_SES_FROM_EMAIL || 'noreply@notification.local',
        fromName: process.env.EMAIL_SES_FROM_NAME || 'Notification Service',
        enabled: process.env.EMAIL_SES_ENABLED === 'true',
      },
      mailgun: {
        apiKey: process.env.EMAIL_MAILGUN_API_KEY || '',
        domain: process.env.EMAIL_MAILGUN_DOMAIN || '',
        fromEmail:
          process.env.EMAIL_MAILGUN_FROM_EMAIL || 'noreply@notification.local',
        fromName: process.env.EMAIL_MAILGUN_FROM_NAME || 'Notification Service',
        enabled: process.env.EMAIL_MAILGUN_ENABLED === 'true',
      },
    },

    // SMS providers
    sms: {
      twilio: {
        accountSid: process.env.SMS_TWILIO_ACCOUNT_SID || '',
        authToken: process.env.SMS_TWILIO_AUTH_TOKEN || '',
        fromPhone: process.env.SMS_TWILIO_FROM_PHONE || '',
        enabled: process.env.SMS_TWILIO_ENABLED !== 'false',
      },
      sns: {
        region: process.env.SMS_SNS_REGION || 'us-east-1',
        accessKeyId: process.env.SMS_SNS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.SMS_SNS_SECRET_ACCESS_KEY || '',
        enabled: process.env.SMS_SNS_ENABLED === 'true',
      },
    },

    // Push notification providers
    fcm: {
      firebase: {
        projectId: process.env.FCM_PROJECT_ID || '',
        privateKey: process.env.FCM_PRIVATE_KEY || '',
        clientEmail: process.env.FCM_CLIENT_EMAIL || '',
        enabled: process.env.FCM_ENABLED !== 'false',
      },
      apn: {
        keyId: process.env.APN_KEY_ID || '',
        teamId: process.env.APN_TEAM_ID || '',
        bundleId: process.env.APN_BUNDLE_ID || '',
        privateKey: process.env.APN_PRIVATE_KEY || '',
        production: process.env.APN_PRODUCTION === 'true',
        enabled: process.env.APN_ENABLED === 'true',
      },
    },

    // WhatsApp providers
    whatsapp: {
      'whatsapp-business': {
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        enabled: process.env.WHATSAPP_ENABLED !== 'false',
      },
      wppconnect: {
        sessionName:
          process.env.WHATSAPP_WPPCONNECT_SESSION_NAME ||
          'notification-service',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        autoClose: parseInt(
          process.env.WHATSAPP_WPPCONNECT_AUTO_CLOSE || '60000',
          10,
        ),
        qrTimeout: parseInt(
          process.env.WHATSAPP_WPPCONNECT_QR_TIMEOUT || '60000',
          10,
        ),
        useChrome: process.env.WHATSAPP_WPPCONNECT_USE_CHROME !== 'false',
        disableWelcome:
          process.env.WHATSAPP_WPPCONNECT_DISABLE_WELCOME !== 'false',
        tokenStore: process.env.WHATSAPP_WPPCONNECT_TOKEN_STORE || 'file',
        folderNameToken:
          process.env.WHATSAPP_WPPCONNECT_TOKEN_FOLDER || './tokens/wppconnect',
        enabled: process.env.WHATSAPP_WPPCONNECT_ENABLED === 'true',
      },
    },
  },

  websocket: {
    cors: {
      origin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
      credentials: true,
    },
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '25000', 10),
    pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT || '60000', 10),
  },

  security: {
    encryptionKey:
      process.env.ENCRYPTION_KEY || 'change-this-to-a-secure-key-32-chars-min',
    encryptionAlgorithm: 'aes-256-gcm',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },

  seeding: {
    enabled: process.env.SEED_ENABLED === 'true',
    resetOnStart: process.env.SEED_RESET_ON_START === 'true',

    // Control what gets seeded
    seedAdminUsers: process.env.SEED_ADMIN_USERS !== 'false',
    seedTestUsers: process.env.SEED_TEST_USERS !== 'false',
    seedServiceAccounts: process.env.SEED_SERVICE_ACCOUNTS !== 'false',
    seedTenants: process.env.SEED_TENANTS !== 'false',
    seedTemplates: process.env.SEED_TEMPLATES !== 'false',
    seedCategories: process.env.SEED_CATEGORIES !== 'false',
    seedProviders: process.env.SEED_PROVIDERS !== 'false',
  },
});
