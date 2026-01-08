# Provider Architecture Documentation

## Overview

The notification system now uses a flexible, extensible provider architecture based on the **Strategy Pattern** and **Factory Pattern**. This design allows easy addition of new notification providers without modifying existing code.

## Architecture Components

### 1. Core Interfaces (`src/common/providers/interfaces/`)

#### `IProvider` Interface
All providers must implement this interface:
- `send(payload)` - Send notification
- `validate()` - Validate credentials and connectivity
- `getRequiredCredentials()` - List required credential fields
- `getChannel()` - Get supported channel (email, sms, fcm, whatsapp)
- `getProviderName()` - Get unique provider name
- `getMetadata()` - Get provider metadata (display name, features, rate limits)

#### `IProviderCredentials` Interface
Base interface for all provider credentials:
- `providerType` - Unique provider identifier
- `channel` - Notification channel
- `enabled` - Whether provider is active
- `metadata` - Optional additional data

### 2. Base Provider Class (`src/common/providers/base/base.provider.ts`)

Abstract class providing common functionality:
- Credential validation
- Error handling and logging
- Retry logic detection
- Protected helper methods

All concrete providers extend this class.

### 3. Provider Factory (`src/common/providers/factory/provider.factory.ts`)

Dynamically creates provider instances:
- Registers provider classes by name
- Creates instances with given credentials
- Validates provider availability

### 4. Provider Registry (`src/common/providers/registry/provider.registry.ts`)

Manages provider lifecycle:
- Auto-registers all available providers on startup
- Caches provider instances for performance
- Validates providers before use
- Provides cleanup methods

### 5. Provider Selector Service (`src/common/providers/provider-selector.service.ts`)

Selects the appropriate provider using this priority:

1. **Request Override** - Specific provider requested in API call
2. **Database Configuration** - Tenant-specific provider from database
3. **Environment Configuration** - Default provider from .env file
4. **First Enabled** - First available enabled provider

## Provider Selection Flow

```
┌─────────────────────────────────────────┐
│   Notification Request                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│   Provider Selector Service              │
└──────────────┬──────────────────────────┘
               │
               ▼
      ┌────────────────┐
      │ Override?      │──Yes──▶ Use Requested Provider
      └────────┬───────┘
               │ No
               ▼
      ┌────────────────┐
      │ Database       │──Yes──▶ Use Tenant Provider
      │ Provider?      │
      └────────┬───────┘
               │ No
               ▼
      ┌────────────────┐
      │ Env Default?   │──Yes──▶ Use Env Config
      └────────┬───────┘
               │ No
               ▼
      ┌────────────────┐
      │ First Enabled? │──Yes──▶ Use Fallback
      └────────┬───────┘
               │ No
               ▼
           ❌ Error
```

## Credential Types

### Email Providers
- **SendGrid**: `apiKey`, `fromEmail`, `fromName`
- **AWS SES**: `region`, `accessKeyId`, `secretAccessKey`, `fromEmail`, `fromName`
- **Mailgun**: `apiKey`, `domain`, `fromEmail`, `fromName`

### SMS Providers
- **Twilio**: `accountSid`, `authToken`, `fromPhone`
- **AWS SNS**: `region`, `accessKeyId`, `secretAccessKey`

### FCM Providers
- **Firebase**: `projectId`, `privateKey`, `clientEmail`
- **APN**: `keyId`, `teamId`, `bundleId`, `privateKey`, `production`

### WhatsApp Providers
- **WhatsApp Business**: `businessAccountId`, `phoneNumberId`, `accessToken`

All credentials use **discriminated unions** for type safety.

## Adding a New Provider

### Step 1: Create Credential Interface

```typescript
// src/common/providers/interfaces/credentials.interface.ts

export interface MyNewProviderCredentials extends BaseEmailCredentials {
  providerType: 'my-provider';
  apiKey: string;
  customField: string;
}

// Add to discriminated union
export type EmailProviderCredentials = 
  | SendGridCredentials 
  | SESCredentials 
  | MyNewProviderCredentials; // Add here
```

### Step 2: Implement Provider Class

```typescript
// src/common/providers/implementations/email/my-provider.provider.ts

import { BaseProvider } from '../../base/base.provider';
import { MyNewProviderCredentials } from '../../interfaces/credentials.interface';

export class MyNewProvider extends BaseProvider<MyNewProviderCredentials> {
  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    // Implement sending logic
  }
  
  async validate(): Promise<boolean> {
    // Implement validation
  }
  
  protected formatPayload(payload: ProviderSendPayload): unknown {
    // Format for your provider's API
  }
  
  getRequiredCredentials(): string[] {
    return ['apiKey', 'customField'];
  }
  
  getChannel(): ChannelType {
    return 'email';
  }
  
  getProviderName(): string {
    return 'my-provider';
  }
  
  getMetadata(): ProviderMetadata {
    return {
      displayName: 'My New Provider',
      description: 'Description of the provider',
      version: '1.0.0',
      supportedFeatures: ['html', 'attachments'],
    };
  }
}
```

### Step 3: Register Provider

```typescript
// src/common/providers/registry/provider.registry.ts

import { MyNewProvider } from '../implementations/email/my-provider.provider';

private registerAllProviders(): void {
  // Email providers
  this.factory.register('sendgrid', SendGridProvider);
  this.factory.register('my-provider', MyNewProvider); // Add here
  
  // ... other providers
}
```

### Step 4: Add Environment Configuration

```typescript
// src/config/configuration.ts

providers: {
  email: {
    'my-provider': {
      apiKey: process.env.EMAIL_MY_PROVIDER_API_KEY || '',
      customField: process.env.EMAIL_MY_PROVIDER_CUSTOM_FIELD || '',
      enabled: process.env.EMAIL_MY_PROVIDER_ENABLED === 'true',
    },
  },
}
```

That's it! Your new provider is now available.

## Configuration Methods

### Method 1: Environment Variables (Fallback)

```env
# .env file
EMAIL_DEFAULT_PROVIDER=sendgrid
EMAIL_SENDGRID_API_KEY=SG.xxxxx
EMAIL_SENDGRID_FROM_EMAIL=noreply@domain.com
EMAIL_SENDGRID_FROM_NAME=My App
EMAIL_SENDGRID_ENABLED=true
```

Used when no database provider is configured for the tenant.

### Method 2: Database Configuration (Per-Tenant)

```bash
# Create provider via API
POST /api/providers
{
  "tenantId": 1,
  "channel": "email",
  "providerName": "sendgrid",
  "credentials": {
    "apiKey": "SG.xxxxx",
    "fromEmail": "noreply@tenant.com",
    "fromName": "Tenant Name"
  },
  "isPrimary": true,
  "isActive": true,
  "priority": 1
}
```

Takes priority over environment configuration.

### Method 3: Request Override

```bash
# Specify provider in notification request
POST /api/notifications/send
{
  "channel": "email",
  "tenantId": 1,
  "recipient": { ... },
  "content": { ... },
  "metadata": {
    "provider": "mailgun"  # Override default
  }
}
```

Takes priority over both database and environment.

## Provider Management APIs

### List Providers
```http
GET /api/providers?tenantId=1&channel=email
```

### Get Provider
```http
GET /api/providers/:id
```

### Create Provider
```http
POST /api/providers
{
  "tenantId": 1,
  "channel": "email",
  "providerName": "sendgrid",
  "credentials": { ... },
  "isPrimary": true,
  "isActive": true
}
```

### Update Provider
```http
PATCH /api/providers/:id
{
  "isActive": false
}
```

### Delete Provider
```http
DELETE /api/providers/:id
```

## Security

- **Credential Encryption**: All credentials are encrypted before storing in database using AES-256-GCM
- **Tenant Isolation**: Row-level security ensures tenants can only access their own providers
- **Sanitization**: Credentials are never returned in API responses (only `hasCredentials` flag)
- **Validation**: Providers are validated before first use

## Benefits

1. **Extensibility** - Add new providers without modifying core code
2. **Flexibility** - Switch providers per tenant, per request, or globally
3. **Type Safety** - Full TypeScript support with discriminated unions
4. **Testability** - Easy to mock `IProvider` interface
5. **Security** - Encrypted credentials, tenant isolation
6. **Performance** - Provider instance caching
7. **Reliability** - Built-in error handling and retry logic

## Implementation Status

### Completed
- ✅ Base provider architecture
- ✅ Provider factory and registry
- ✅ Provider selector service
- ✅ SendGrid email provider
- ✅ Twilio SMS provider
- ✅ Type-safe credentials
- ✅ Database provider management
- ✅ Environment fallback

### In Progress
- 🟡 AWS SES email provider
- 🟡 Mailgun email provider
- 🟡 AWS SNS SMS provider
- 🟡 Firebase FCM provider
- 🟡 Apple APN provider
- 🟡 WhatsApp Business provider

### Future Enhancements
- Provider health monitoring
- Automatic failover between providers
- Provider usage analytics
- Rate limit tracking
- Cost optimization
