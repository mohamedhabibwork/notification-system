# Provider Selection & Seeding Configuration Guide

**Date**: January 8, 2026  
**Status**: ✅ **Implemented**

---

## Overview

The notification system now supports:
1. **Multiple providers per channel** (e.g., SendGrid + SES + Mailgun for email)
2. **Flexible provider selection** (default, per-request, per-tenant)
3. **Array-based seeding** (multiple users, services, tenants)
4. **Well-organized environment variables** (grouped by category)

---

## Provider Selection System

### How It Works

When sending a notification, the system selects a provider in this order:

```
1. Request Override → Specific provider requested in API call
                     ↓
2. Tenant Config   → Tenant-specific provider (future: from database)
                     ↓
3. Default Config  → Default provider from .env
                     ↓
4. First Enabled   → First available enabled provider
```

### Configuration Structure

#### Old Structure (Single Provider)
```env
SENDGRID_API_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
```

#### New Structure (Multiple Providers + Selection)
```env
# Default provider selection
EMAIL_DEFAULT_PROVIDER=sendgrid
SMS_DEFAULT_PROVIDER=twilio

# Provider credentials
EMAIL_SENDGRID_API_KEY=xxx
EMAIL_SENDGRID_ENABLED=true

EMAIL_SES_ACCESS_KEY_ID=xxx
EMAIL_SES_ENABLED=false

SMS_TWILIO_ACCOUNT_SID=xxx
SMS_TWILIO_ENABLED=true
```

---

## Channel Providers

### Email Providers

#### SendGrid (Default)
```env
EMAIL_DEFAULT_PROVIDER=sendgrid
EMAIL_SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_SENDGRID_FROM_EMAIL=noreply@yourdomain.com
EMAIL_SENDGRID_FROM_NAME=Your Company Name
EMAIL_SENDGRID_ENABLED=true
```

**Get API Key**: https://app.sendgrid.com/settings/api_keys

#### AWS SES
```env
EMAIL_DEFAULT_PROVIDER=ses
EMAIL_SES_REGION=us-east-1
EMAIL_SES_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxx
EMAIL_SES_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SES_FROM_EMAIL=noreply@yourdomain.com
EMAIL_SES_FROM_NAME=Your Company Name
EMAIL_SES_ENABLED=true
```

**Get Credentials**: AWS Console → IAM → Create Access Key with SES permissions

#### Mailgun
```env
EMAIL_DEFAULT_PROVIDER=mailgun
EMAIL_MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxx
EMAIL_MAILGUN_DOMAIN=mg.yourdomain.com
EMAIL_MAILGUN_FROM_EMAIL=noreply@yourdomain.com
EMAIL_MAILGUN_FROM_NAME=Your Company Name
EMAIL_MAILGUN_ENABLED=true
```

**Get API Key**: https://app.mailgun.com/app/account/security/api_keys

---

### SMS Providers

#### Twilio (Default)
```env
SMS_DEFAULT_PROVIDER=twilio
SMS_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_TWILIO_FROM_PHONE=+1234567890
SMS_TWILIO_ENABLED=true
```

**Get Credentials**: https://console.twilio.com/

#### AWS SNS
```env
SMS_DEFAULT_PROVIDER=sns
SMS_SNS_REGION=us-east-1
SMS_SNS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxx
SMS_SNS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_SNS_ENABLED=true
```

---

### Push Notification Providers

#### Firebase Cloud Messaging (Default)
```env
FCM_DEFAULT_PROVIDER=firebase
FCM_PROJECT_ID=your-firebase-project
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FCM_ENABLED=true
```

**Get Credentials**: 
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Download JSON, extract values

#### Apple Push Notification (APN)
```env
APN_KEY_ID=ABC123XYZ
APN_TEAM_ID=TEAM123456
APN_BUNDLE_ID=com.yourcompany.app
APN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
APN_PRODUCTION=false
APN_ENABLED=true
```

**Get Credentials**: Apple Developer Console → Certificates, IDs & Profiles

---

### WhatsApp Providers

#### WhatsApp Business API (Default)
```env
WHATSAPP_DEFAULT_PROVIDER=whatsapp-business
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_PHONE_NUMBER_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_ENABLED=true
```

**Get Credentials**: https://business.facebook.com/ → WhatsApp Manager

---

## Using Provider Selection in Code

### Example 1: Use Default Provider
```typescript
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "email",
  "recipient": { "recipientEmail": "user@example.com" },
  "templateId": 1
  // No provider specified → uses EMAIL_DEFAULT_PROVIDER (sendgrid)
}
```

### Example 2: Override Provider
```typescript
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "email",
  "recipient": { "recipientEmail": "user@example.com" },
  "templateId": 1,
  "provider": "ses"  // ✅ Override to use AWS SES
}
```

### Example 3: Programmatic Selection
```typescript
import { ProviderSelectorService } from './common/providers/provider-selector.service';

constructor(private readonly providerSelector: ProviderSelectorService) {}

async sendNotification() {
  // Get appropriate provider
  const provider = this.providerSelector.getProvider('email', {
    requestedProvider: 'mailgun',  // Override
    tenantId: 1,
    fallbackProvider: 'sendgrid',
  });
  
  // Get provider configuration
  const config = this.providerSelector.getProviderConfig('email', provider);
  
  // Use provider
  console.log(`Sending via ${provider}:`, config);
}
```

---

## Seeding Configuration (Array-Based)

### Admin Users

```env
SEED_ADMIN_USERS=[
  {
    "email":"admin@yourdomain.com",
    "password":"AdminPass123!",
    "role":"admin",
    "firstName":"System",
    "lastName":"Admin"
  },
  {
    "email":"superadmin@yourdomain.com",
    "password":"SuperPass123!",
    "role":"superadmin",
    "firstName":"Super",
    "lastName":"Admin"
  }
]
```

**Benefits**:
- ✅ Create multiple admin users at once
- ✅ Different roles (admin, superadmin)
- ✅ Custom names and emails
- ✅ Easy to add/remove

### Test Users

```env
SEED_TEST_USERS=[
  {
    "email":"user1@test.com",
    "password":"User123!",
    "role":"user",
    "firstName":"Test",
    "lastName":"User"
  },
  {
    "email":"user2@test.com",
    "password":"User123!",
    "role":"user",
    "firstName":"Demo",
    "lastName":"User"
  },
  {
    "email":"viewer@test.com",
    "password":"User123!",
    "role":"viewer",
    "firstName":"Viewer",
    "lastName":"User"
  }
]
```

### Service Accounts

```env
SEED_SERVICE_ACCOUNTS=[
  {
    "clientId":"order-service",
    "clientSecret":"order-secret-123",
    "roles":["notification:send","notification:read"],
    "description":"Order Management Service"
  },
  {
    "clientId":"payment-service",
    "clientSecret":"payment-secret-456",
    "roles":["notification:send"],
    "description":"Payment Processing Service"
  },
  {
    "clientId":"user-service",
    "clientSecret":"user-secret-789",
    "roles":["notification:send","user:manage"],
    "description":"User Management Service"
  },
  {
    "clientId":"analytics-service",
    "clientSecret":"analytics-secret-012",
    "roles":["notification:read"],
    "description":"Analytics Service (read-only)"
  }
]
```

### Default Tenants

```env
SEED_TENANTS=[
  {
    "name":"Default Tenant",
    "domain":"default.local",
    "isActive":true
  },
  {
    "name":"Demo Company",
    "domain":"demo.com",
    "isActive":true
  },
  {
    "name":"Test Organization",
    "domain":"test.org",
    "isActive":true
  }
]
```

---

## Seeding Control

```env
# Enable/disable seeding
SEED_ENABLED=true

# Reset database on every restart (DANGER: Development only!)
SEED_RESET_ON_START=false
```

**⚠️ Warning**: Never set `SEED_RESET_ON_START=true` in production!

---

## Provider Status API

Get status of all providers:

```bash
GET /api/v1/admin/providers/status

Response:
{
  "email": {
    "default": "sendgrid",
    "enabled": ["sendgrid", "mailgun"],
    "count": 2
  },
  "sms": {
    "default": "twilio",
    "enabled": ["twilio"],
    "count": 1
  },
  "fcm": {
    "default": "firebase",
    "enabled": ["firebase"],
    "count": 1
  },
  "whatsapp": {
    "default": "whatsapp-business",
    "enabled": ["whatsapp-business"],
    "count": 1
  }
}
```

---

## Environment Variable Organization

The `.env.example` is now organized into clear sections:

### 1. Application Configuration
- Service settings, ports, environment

### 2. Protocol Configuration
- gRPC, GraphQL settings

### 3. Database Configuration
- PostgreSQL connection and pooling

### 4. Cache & Message Queue
- Redis configuration

### 5. Authentication & Authorization
- Keycloak OAuth2/OIDC settings

### 6. Event Bus Configuration
- Kafka brokers and topics

### 7. External Services
- User service and other integrations

### 8. Notification Channel Providers
- **Organized by channel** (email, sms, fcm, whatsapp)
- **Multiple providers per channel**
- **Default selection**
- **Enable/disable flags**

### 9. Message Queue Configuration
- Concurrency, retry, cleanup

### 10. WebSocket Configuration
- CORS, ping settings

### 11. Security Configuration
- Encryption, rate limiting

### 12. Observability Configuration
- Logging, metrics, tracing

### 13. Resilience Patterns
- Circuit breaker, retry, bulkhead

### 14. Feature Flags
- Toggle features on/off

### 15. Seeding Configuration
- **Array-based user seeding**
- **Array-based service account seeding**
- **Array-based tenant seeding**

### 16. Development & Debug
- Debug flags, Swagger settings

### 17. Production Settings
- Production-specific overrides

---

## Real-World Examples

### Startup Configuration (Small Company)

```env
# Use free tier providers
EMAIL_DEFAULT_PROVIDER=sendgrid
EMAIL_SENDGRID_API_KEY=SG.real-key-here
EMAIL_SENDGRID_ENABLED=true

SMS_DEFAULT_PROVIDER=twilio
SMS_TWILIO_ACCOUNT_SID=AC-real-sid
SMS_TWILIO_AUTH_TOKEN=real-token
SMS_TWILIO_ENABLED=true

# Seed 2 admins, 5 test users
SEED_ADMIN_USERS=[{"email":"ceo@startup.com","password":"SecurePass1!","role":"admin","firstName":"CEO","lastName":"Name"},{"email":"cto@startup.com","password":"SecurePass2!","role":"admin","firstName":"CTO","lastName":"Name"}]

SEED_TEST_USERS=[{"email":"dev1@startup.com","password":"Dev123!","role":"user","firstName":"Developer","lastName":"One"},{...5 more users...}]
```

### Enterprise Configuration (Large Company)

```env
# Multiple providers for redundancy
EMAIL_DEFAULT_PROVIDER=sendgrid
EMAIL_SENDGRID_ENABLED=true
EMAIL_SES_ENABLED=true      # Backup
EMAIL_MAILGUN_ENABLED=true  # Backup

SMS_DEFAULT_PROVIDER=twilio
SMS_TWILIO_ENABLED=true
SMS_SNS_ENABLED=true        # Backup

# Multiple tenants for different departments
SEED_TENANTS=[
  {"name":"Marketing Department","domain":"marketing.company.com","isActive":true},
  {"name":"Sales Department","domain":"sales.company.com","isActive":true},
  {"name":"Customer Support","domain":"support.company.com","isActive":true}
]

# Multiple service accounts
SEED_SERVICE_ACCOUNTS=[
  {"clientId":"crm-service","clientSecret":"xxx","roles":["notification:send"],"description":"CRM System"},
  {"clientId":"billing-service","clientSecret":"yyy","roles":["notification:send"],"description":"Billing System"},
  {"clientId":"analytics-service","clientSecret":"zzz","roles":["notification:read"],"description":"Analytics Dashboard"}
]
```

---

## API Usage Examples

### Send with Default Provider

```bash
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "email",
  "recipient": { "recipientEmail": "user@example.com" },
  "subject": "Welcome!",
  "body": "Hello from our app"
}
# Uses: EMAIL_DEFAULT_PROVIDER (sendgrid)
```

### Send with Specific Provider

```bash
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "email",
  "recipient": { "recipientEmail": "user@example.com" },
  "subject": "Welcome!",
  "body": "Hello from our app",
  "provider": "ses"  # ✅ Override to use AWS SES
}
# Uses: AWS SES instead of default
```

### Send with Fallback

```bash
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "sms",
  "recipient": { "recipientPhone": "+1234567890" },
  "body": "Your code is 123456",
  "provider": "sns",        # Try AWS SNS first
  "fallbackProvider": "twilio"  # Fallback to Twilio if SNS fails
}
```

---

## Provider Management in Code

### Check Provider Status

```typescript
import { ProviderSelectorService } from './common/providers/provider-selector.service';

@Injectable()
export class NotificationService {
  constructor(private readonly providerSelector: ProviderSelectorService) {}

  async getProviderStatus() {
    // Get status for all channels
    return this.providerSelector.getProviderStatus();
    
    // Output:
    // {
    //   email: { default: 'sendgrid', enabled: ['sendgrid', 'ses'], count: 2 },
    //   sms: { default: 'twilio', enabled: ['twilio'], count: 1 },
    //   ...
    // }
  }
}
```

### Validate Providers

```typescript
async validateConfiguration() {
  const validation = this.providerSelector.validateProviders();
  
  if (!validation.valid) {
    console.error('Provider validation errors:', validation.errors);
    // Example error: "No enabled providers found for channel: email"
  }
}
```

### Get All Enabled Providers

```typescript
const emailProviders = this.providerSelector.getEnabledProviders('email');
// Returns: ['sendgrid', 'ses', 'mailgun']

const smsProviders = this.providerSelector.getEnabledProviders('sms');
// Returns: ['twilio', 'sns']
```

---

## Seeding Examples

### Development Environment

```env
# Single admin for quick testing
SEED_ADMIN_USERS=[{"email":"admin@local","password":"admin","role":"admin","firstName":"Admin","lastName":"User"}]

# Few test users
SEED_TEST_USERS=[{"email":"test@local","password":"test123","role":"user","firstName":"Test","lastName":"User"}]

# One service
SEED_SERVICE_ACCOUNTS=[{"clientId":"test-service","clientSecret":"test123","roles":["notification:send"],"description":"Test Service"}]

# One tenant
SEED_TENANTS=[{"name":"Test Tenant","domain":"test.local","isActive":true}]
```

### Production Environment

```env
# Real admin users
SEED_ADMIN_USERS=[
  {"email":"admin@company.com","password":"RealSecurePass123!","role":"admin","firstName":"John","lastName":"Doe"},
  {"email":"ops@company.com","password":"OpsSecurePass456!","role":"admin","firstName":"Jane","lastName":"Smith"}
]

# No test users in production
SEED_TEST_USERS=[]

# Real service accounts with strong secrets
SEED_SERVICE_ACCOUNTS=[
  {"clientId":"production-api","clientSecret":"super-long-secure-secret-min-32-chars","roles":["notification:send","notification:manage"],"description":"Production API Gateway"},
  {"clientId":"monitoring","clientSecret":"another-secure-secret-for-monitoring","roles":["notification:read","metrics:read"],"description":"Monitoring Service"}
]

# Real tenants
SEED_TENANTS=[
  {"name":"Acme Corporation","domain":"acme.com","isActive":true},
  {"name":"Widget Inc","domain":"widget.com","isActive":true}
]

# Disable reset
SEED_ENABLED=true
SEED_RESET_ON_START=false
```

---

## Configuration Best Practices

### 1. Provider Redundancy

Always configure at least 2 providers per critical channel:

```env
# Primary
EMAIL_DEFAULT_PROVIDER=sendgrid
EMAIL_SENDGRID_ENABLED=true

# Backup (automatically used if primary fails with circuit breaker)
EMAIL_SES_ENABLED=true
```

### 2. Credential Security

```env
# ❌ BAD: Weak password
SEED_ADMIN_PASSWORD=admin

# ✅ GOOD: Strong password
SEED_ADMIN_PASSWORD=Adm!n_S3cur3_P@ssw0rd_2026

# ❌ BAD: Short secret
KEYCLOAK_SERVICE_CLIENT_SECRET=secret123

# ✅ GOOD: Long random secret (32+ chars)
KEYCLOAK_SERVICE_CLIENT_SECRET=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
```

### 3. Environment Separation

```env
# Development
NODE_ENV=development
LOG_LEVEL=debug
SWAGGER_ENABLED=true
SEED_RESET_ON_START=true  # OK in dev

# Staging
NODE_ENV=staging
LOG_LEVEL=info
SWAGGER_ENABLED=true
SEED_RESET_ON_START=false

# Production
NODE_ENV=production
LOG_LEVEL=warn
SWAGGER_ENABLED=false
SEED_RESET_ON_START=false  # NEVER true in production!
```

### 4. Provider Organization

Group related configurations:

```env
# ============================================================================
# EMAIL PROVIDERS
# ============================================================================

# --- SendGrid ---
EMAIL_SENDGRID_API_KEY=SG.xxx
EMAIL_SENDGRID_FROM_EMAIL=noreply@domain.com
EMAIL_SENDGRID_FROM_NAME=Company
EMAIL_SENDGRID_ENABLED=true

# --- AWS SES ---
EMAIL_SES_REGION=us-east-1
EMAIL_SES_ACCESS_KEY_ID=AKIA...
EMAIL_SES_SECRET_ACCESS_KEY=xxx
EMAIL_SES_FROM_EMAIL=noreply@domain.com
EMAIL_SES_FROM_NAME=Company
EMAIL_SES_ENABLED=false
```

---

## Provider Selection Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Send Notification Request                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Check Request Body   │
                  │ provider: "ses"?     │
                  └──────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │ YES                         │ NO
              ▼                             ▼
    ┌─────────────────┐          ┌──────────────────┐
    │ Check if "ses"  │          │ Check Tenant DB  │
    │ is enabled      │          │ for config       │
    └────────┬────────┘          └────────┬─────────┘
             │                            │
             │                            │ (not found)
             ▼                            ▼
    ┌─────────────────┐          ┌──────────────────┐
    │ Use SES ✅      │          │ Get Default from │
    │                 │          │ EMAIL_DEFAULT... │
    └─────────────────┘          └────────┬─────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │ Use sendgrid ✅  │
                                 └──────────────────┘
```

---

## Testing Provider Selection

### Test 1: Default Provider
```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "channel": "email",
    "recipient": {"recipientEmail": "test@example.com"},
    "subject": "Test",
    "body": "Testing default provider"
  }'

# Check logs for: "Using default provider: sendgrid for email"
```

### Test 2: Override Provider
```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "channel": "email",
    "recipient": {"recipientEmail": "test@example.com"},
    "subject": "Test",
    "body": "Testing SES",
    "provider": "ses"
  }'

# Check logs for: "Using requested provider: ses for email"
```

### Test 3: Check Status
```bash
curl http://localhost:3000/api/v1/admin/providers/status \
  -H "Authorization: Bearer $TOKEN"
```

---

## Migration Guide

### From Old Config
```env
# Old (single provider)
SENDGRID_API_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
```

### To New Config
```env
# New (multiple providers + selection)
EMAIL_DEFAULT_PROVIDER=sendgrid
EMAIL_SENDGRID_API_KEY=xxx
EMAIL_SENDGRID_ENABLED=true

SMS_DEFAULT_PROVIDER=twilio
SMS_TWILIO_ACCOUNT_SID=xxx
SMS_TWILIO_ENABLED=true
```

**Backward Compatibility**: Old variable names still work but are deprecated.

---

## Summary

### What's New

✅ **Multiple providers per channel**  
✅ **Default provider selection**  
✅ **Per-request provider override**  
✅ **Per-tenant provider config (future)**  
✅ **Array-based seeding**  
✅ **JSON format for flexibility**  
✅ **Organized env sections**  
✅ **Real-world examples**  
✅ **Enable/disable providers**  
✅ **Provider status API**  

### Benefits

✅ **Redundancy**: Configure backup providers  
✅ **Flexibility**: Choose provider per request  
✅ **Cost optimization**: Use cheaper providers for bulk  
✅ **Regional routing**: Different providers per region  
✅ **A/B testing**: Test new providers easily  
✅ **Easy scaling**: Add new users/services/tenants  

---

**Status**: ✅ **Production-Ready**  
**Flexibility**: ⭐⭐⭐⭐⭐

---

*Last Updated: January 8, 2026*  
*Type: Configuration Enhancement*
