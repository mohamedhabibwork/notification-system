# Seeding Guide

## Overview

The notification system provides a comprehensive seeding script that sets up your database with default tenants, templates, categories, and validates your environment configuration.

## Quick Start

```bash
# Run the master seeder
npm run seed:database

# Or run directly
ts-node src/database/seeds/run-all-seeds.ts
```

## What Gets Seeded

### 1. Environment Validation ✅
Before seeding, the system validates:
- ✅ `DATABASE_URL` is set
- ✅ `ENCRYPTION_KEY` is set and secure (32+ chars)
- ⚠️  At least one email provider is enabled
- ⚠️  At least one SMS provider is enabled
- ⚠️  Redis configuration (optional but recommended)
- ⚠️  Keycloak configuration (if `SEED_KEYCLOAK=true`)

### 2. Tenants
Creates default tenants from `src/database/seeds/seed-users.ts`:
- Default Tenant (default.local)
- Demo Company (demo.com)

Each tenant gets:
- Unique UUID for identification
- Active status
- Timezone and language settings

### 3. Template Categories
For each tenant, creates:
- Account Management (ACCOUNT)
- Security (SECURITY)
- Alerts (ALERTS)
- General (GENERAL)
- Marketing (MARKETING)

### 4. Notification Templates
For each tenant, creates default templates:
- Welcome Email
- Password Reset Email
- Email Verification
- Account Activated
- SMS Verification Code
- SMS Alert
- Push Notification Alert
- WhatsApp Notification
- Two-Factor Authentication

All templates include:
- Handlebars variables
- Both plain text and HTML versions
- Multi-language support (starting with English)

### 5. Providers (Skipped)
**Important**: Provider seeding is intentionally skipped. Providers should be configured:
- **Option 1**: Manually via API (recommended for production)
- **Option 2**: Automatically via environment config fallback (development)

This design allows:
- Different provider credentials per tenant
- Easy provider switching without code changes
- Secure credential management

## Environment Configuration

### Required Variables

```env
# Database (Required)
DATABASE_URL=postgresql://user:pass@localhost:5432/notification_db

# Encryption (Required)
ENCRYPTION_KEY=your-32-character-min-encryption-key-here

# Email Provider (At least one)
EMAIL_SENDGRID_ENABLED=true
EMAIL_SENDGRID_API_KEY=SG.xxxxx
EMAIL_SENDGRID_FROM_EMAIL=noreply@domain.com
EMAIL_SENDGRID_FROM_NAME=My Application

# SMS Provider (At least one)
SMS_TWILIO_ENABLED=true
SMS_TWILIO_ACCOUNT_SID=ACxxxxx
SMS_TWILIO_AUTH_TOKEN=xxxxx
SMS_TWILIO_FROM_PHONE=+1234567890
```

### Optional Variables

```env
# Redis (Recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Keycloak (Optional)
SEED_KEYCLOAK=false
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_REALM=notification-realm
```

## Seeding Order

The master seeder runs in this order:

1. **Environment Validation** - Checks all required variables
2. **Database Connection** - Connects to PostgreSQL
3. **Tenants** - Creates default tenants
4. **Categories** - Creates categories for each tenant
5. **Templates** - Creates templates for each tenant
6. **Keycloak** (Optional) - Creates users and service accounts

## Provider Configuration

### Method 1: Manual Configuration (Recommended)

After seeding, configure providers via API:

```bash
POST /api/providers
Content-Type: application/json

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

### Method 2: Environment Fallback (Development)

If no providers are configured in the database, the system automatically falls back to environment variables:

```env
EMAIL_DEFAULT_PROVIDER=sendgrid
EMAIL_SENDGRID_ENABLED=true
EMAIL_SENDGRID_API_KEY=SG.xxxxx
EMAIL_SENDGRID_FROM_EMAIL=noreply@domain.com
EMAIL_SENDGRID_FROM_NAME=My App
```

## Customizing Seed Data

### Adding Custom Tenants

Edit `src/database/seeds/seed-users.ts`:

```typescript
export const defaultTenants: SeedTenant[] = [
  {
    name: 'My Company',
    domain: 'mycompany.com',
    isActive: true,
    settings: {
      timezone: 'America/New_York',
      language: 'en',
    },
  },
  // Add more tenants...
];
```

### Adding Custom Templates

Edit `src/database/seeds/default-templates.ts`:

```typescript
export const defaultTemplates: DefaultTemplate[] = [
  {
    name: 'Custom Template',
    templateCode: 'CUSTOM_TEMPLATE',
    channel: 'email',
    subject: 'Subject here',
    bodyTemplate: 'Body with {{variables}}',
    variables: {
      variable1: 'string',
    },
    language: 'en',
    categoryCode: 'GENERAL',
  },
  // Add more templates...
];
```

### Adding Custom Categories

Edit `src/database/seeds/default-templates.ts`:

```typescript
export const defaultCategories = [
  { name: 'Custom Category', code: 'CUSTOM', icon: 'icon-name', color: '#FF5733' },
  // Add more categories...
];
```

## Seeder Scripts

```json
{
  "scripts": {
    "seed:database": "ts-node src/database/seeds/run-all-seeds.ts",
    "seed:keycloak": "ts-node src/database/seeds/keycloak/seed-keycloak-users.ts",
    "seed:all": "npm run seed:database && npm run seed:keycloak"
  }
}
```

## Troubleshooting

### Error: DATABASE_URL is required
**Solution**: Set the `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/notification_db"
```

### Error: ENCRYPTION_KEY is required
**Solution**: Set a secure encryption key (32+ characters):
```bash
export ENCRYPTION_KEY="your-32-character-minimum-secure-key-here"
```

### Warning: No email provider is enabled
**Solution**: Enable at least one email provider:
```bash
export EMAIL_SENDGRID_ENABLED=true
export EMAIL_SENDGRID_API_KEY=SG.xxxxx
```

### Error: Cannot connect to database
**Solution**: Ensure PostgreSQL is running and accessible:
```bash
docker-compose up -d postgres
# Or
pg_isready -h localhost -p 5432
```

## Best Practices

1. **Development**: Use environment config fallback for quick setup
2. **Staging**: Configure providers via API to test tenant isolation
3. **Production**: Always configure providers via API with encrypted credentials
4. **Security**: Never commit real credentials to version control
5. **Testing**: Run seeder on a separate test database

## Next Steps

After seeding:

1. ✅ Verify tenants were created: `GET /api/tenants`
2. ✅ Check templates: `GET /api/templates?tenantId=1`
3. ✅ Configure providers: `POST /api/providers`
4. ✅ Test notification: `POST /api/notifications/send`
5. ✅ Monitor queue: Check Redis/BullMQ dashboard

## Additional Resources

- [Provider Architecture](./PROVIDER_ARCHITECTURE.md) - Detailed provider documentation
- [API Documentation](./API_GATEWAY_INTEGRATION.md) - Complete API reference
- [Environment Variables](./env.example) - All available configuration options
