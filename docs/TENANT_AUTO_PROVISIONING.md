# Tenant Auto-Provisioning

## Overview

When a new tenant is created, the system automatically provisions default data including:
- ✅ Template categories (5 categories)
- ✅ Notification templates (10 templates across all channels)
- ✅ Provider configurations (10 providers with placeholder credentials)

## What Gets Created

### 1. Template Categories
- Account Management
- Security
- Alerts
- General
- Marketing

### 2. Default Tenant Settings/Preferences

Tenant-level configuration settings are automatically configured with sensible defaults:

#### Notification Defaults
- **Default Channels**: All channels enabled (email, sms, fcm, whatsapp, database)
- **Quiet Hours**: Disabled by default (can be configured: 22:00-08:00 UTC)
- **Rate Limits**:
  - Email: 100/hour, 500/day
  - SMS: 20/hour, 100/day
  - FCM: 200/hour, 1000/day
  - WhatsApp: 50/hour, 200/day

#### Retention Policies
- Database notifications: 90 days (auto-delete enabled)
- Logs: 30 days (auto-delete enabled)

#### Delivery Settings
- Retry attempts: 3
- Retry delays: 1min, 5min, 15min
- Batch size: 100
- Priority processing: Enabled

#### Channel-Specific Defaults
- **Email**: Open/click tracking enabled, unsubscribe link enabled
- **SMS**: Max 160 characters, Unicode support, short links
- **FCM**: High priority, 28-day TTL, sound & badge enabled
- **WhatsApp**: Media support enabled

#### Features
- Bulk notifications: Enabled
- Scheduled notifications: Enabled
- Webhooks: Enabled
- Analytics: Enabled
- API access: Enabled

### 3. Templates
**Email Templates:**
- Welcome Email
- Password Reset Email
- Email Verification
- Account Activated
- Two-Factor Authentication

**SMS Templates:**
- SMS Verification Code
- SMS Alert

**FCM Templates:**
- Push Notification Alert

**WhatsApp Templates:**
- WhatsApp Notification

### 4. Provider Configurations

All providers are created with **placeholder credentials** and are **inactive by default** (except Database provider).

#### Email Providers
1. **SendGrid** (Primary, Priority 1)
   - Status: Inactive (requires configuration)
   - Required credentials: `apiKey`, `fromEmail`, `fromName`

2. **AWS SES** (Priority 2)
   - Status: Inactive (requires configuration)
   - Required credentials: `accessKeyId`, `secretAccessKey`, `region`

3. **Mailgun** (Priority 3)
   - Status: Inactive (requires configuration)
   - Required credentials: `apiKey`, `domain`

#### SMS Providers
1. **Twilio** (Primary, Priority 1)
   - Status: Inactive (requires configuration)
   - Required credentials: `accountSid`, `authToken`, `fromNumber`

2. **AWS SNS** (Priority 2)
   - Status: Inactive (requires configuration)
   - Required credentials: `accessKeyId`, `secretAccessKey`, `region`

#### FCM Providers
1. **Firebase** (Primary, Priority 1)
   - Status: Inactive (requires configuration)
   - Required credentials: `projectId`, `privateKey`, `clientEmail`

2. **Apple APN** (Priority 2)
   - Status: Inactive (requires configuration)
   - Required credentials: `keyId`, `teamId`, `privateKey`

#### WhatsApp Providers
1. **WhatsApp Business API** (Primary, Priority 1)
   - Status: Inactive (requires configuration)
   - Required credentials: `businessAccountId`, `phoneNumberId`, `accessToken`

2. **WPPConnect** (Priority 2)
   - Status: Inactive (requires configuration)
   - Required credentials: `sessionName`, `secretKey`

#### Database Provider
1. **Database Inbox** (Primary, Priority 1)
   - Status: **Active** (no external credentials required)
   - Used for in-app notifications

## Testing the Implementation

### 1. Create a New Tenant

```bash
# Using cURL (requires authentication token)
curl -X POST http://localhost:3000/api/v1/admin/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: 1" \
  -d '{
    "name": "Test Tenant",
    "domain": "test-tenant.com",
    "isActive": true
  }'
```

### 2. Verify Templates Were Created

```bash
# List templates for the new tenant
curl -X GET "http://localhost:3000/api/v1/templates?tenantId=NEW_TENANT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: NEW_TENANT_ID"
```

Expected: Should see 10 templates

### 3. Verify Categories Were Created

```bash
# List categories for the new tenant
curl -X GET "http://localhost:3000/api/v1/templates/categories?tenantId=NEW_TENANT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: NEW_TENANT_ID"
```

Expected: Should see 5 categories

### 4. Verify Tenant Settings/Preferences

```bash
# Get tenant details including settings
curl -X GET "http://localhost:3000/api/v1/admin/tenants/NEW_TENANT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: 1"
```

Expected: Tenant object should include comprehensive `settings` object with notification defaults, rate limits, retention policies, etc.

### 5. Verify Providers Were Created

```bash
# List providers for the new tenant
curl -X GET "http://localhost:3000/api/v1/providers?tenantId=NEW_TENANT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: NEW_TENANT_ID"
```

Expected: Should see 10 providers
- 9 inactive (email, sms, fcm, whatsapp)
- 1 active (database-inbox)

### 6. Query Database Directly

```sql
-- Check tenant and settings
SELECT id, name, domain, settings FROM tenants WHERE name = 'Test Tenant';

-- Check categories for tenant
SELECT id, name, code FROM template_categories WHERE tenant_id = NEW_TENANT_ID;

-- Check templates for tenant
SELECT id, name, template_code, channel FROM notification_templates WHERE tenant_id = NEW_TENANT_ID;

-- Check providers for tenant
SELECT id, channel, provider_name, is_active, is_primary, priority 
FROM notification_providers 
WHERE tenant_id = NEW_TENANT_ID
ORDER BY channel, priority;
```

## Activating Providers

After tenant creation, each provider must be configured with real credentials:

```bash
# Example: Update SendGrid provider with real credentials
curl -X PUT "http://localhost:3000/api/v1/providers/PROVIDER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: TENANT_ID" \
  -d '{
    "credentials": {
      "apiKey": "SG.real-api-key",
      "fromEmail": "noreply@tenant.com",
      "fromName": "Tenant Name"
    },
    "isActive": true
  }'
```

## Implementation Details

### Code Changes

1. **`src/modules/tenants/tenants.service.ts`**
   - Added `EncryptionService` injection
   - Implemented `seedDefaultProviders()` method
   - Implemented `seedDefaultPreferences()` method
   - Updated `seedDefaultData()` to include provider and preference seeding

### Credential Security

- All provider credentials are **encrypted** before storage using `EncryptionService`
- Even placeholder credentials (null values) are encrypted
- Credentials are never exposed in API responses (sanitized)

### Database Provider Exception

The Database provider is the only provider created as **active** by default because:
- It doesn't require external API credentials
- It uses the internal database
- Essential for in-app notification functionality

## Lookups (System-Wide)

Lookups remain **system-wide** and are **not tenant-specific**:
- Notification statuses (pending, queued, sent, delivered, failed, etc.)
- Notification priorities (low, medium, high, urgent)
- Notification channels (email, sms, fcm, whatsapp, database)
- Provider types
- Template types

These are seeded once during initial system setup and shared across all tenants.

## Migration for Existing Tenants

If you have existing tenants without default providers:

```sql
-- Run this script to backfill providers for existing tenants
-- This would need to be implemented as a migration script
```

Or manually create providers via API for each existing tenant.

## Troubleshooting

### Issue: Tenant created but no providers

**Check logs:**
```bash
# Look for seeding errors
grep "Failed to seed default data" logs/app.log
```

**Possible causes:**
- EncryptionService not available
- Database constraints
- Missing schema

### Issue: Providers created but all inactive

**This is expected behavior!** Only the database provider should be active by default. All other providers require credential configuration before activation.

## Next Steps

1. Create tenant via API
2. Verify all default data is created
3. Configure provider credentials
4. Activate providers
5. Test sending notifications through each channel
