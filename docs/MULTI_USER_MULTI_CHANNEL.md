# Multi-User Multi-Channel Notifications

## Overview

The Multi-User Multi-Channel feature allows you to send notifications to multiple users across multiple channels simultaneously with advanced timezone handling and provider fallback capabilities. This is ideal for bulk campaigns, system-wide announcements, and coordinated multi-channel outreach.

## Features

- ✅ Send to multiple users in parallel
- ✅ Multiple channels per user (email, SMS, FCM, WhatsApp, database)
- ✅ Timezone-aware scheduling (client, user, or mixed mode)
- ✅ Provider fallback chains with automatic failover
- ✅ Partial failure handling with detailed results
- ✅ Configurable parallel or sequential processing
- ✅ Stop-on-first-success mode per user
- ✅ Require-all-channels-success mode

## Use Cases

### 1. System-Wide Announcements

Send critical updates to all users across their preferred channels:

```typescript
POST /api/v1/services/notifications/send-multi
{
  "tenantId": 1,
  "channels": ["email", "database", "fcm"],
  "recipients": [
    { "recipientUserId": "user1", "recipientEmail": "user1@example.com" },
    { "recipientUserId": "user2", "recipientEmail": "user2@example.com" },
    { "recipientUserId": "user3", "recipientEmail": "user3@example.com" }
  ],
  "templateCode": "SYSTEM_MAINTENANCE",
  "templateVariables": {
    "maintenanceStart": "2026-01-10T02:00:00Z",
    "maintenanceDuration": "2 hours"
  }
}
```

### 2. Marketing Campaigns with Timezone Awareness

Send promotional emails at optimal times based on each user's timezone:

```typescript
POST /api/v1/services/notifications/send-multi
{
  "tenantId": 1,
  "channels": ["email", "database"],
  "recipients": [
    { "recipientUserId": "user123", "recipientEmail": "user1@example.com" },
    { "recipientUserId": "user456", "recipientEmail": "user2@example.com" }
  ],
  "templateCode": "FLASH_SALE",
  "templateVariables": {
    "discount": "50%",
    "endDate": "2026-01-15"
  },
  "scheduledAt": "2026-01-10T09:00:00Z",
  "options": {
    "timezoneOptions": {
      "mode": "user"  // Send at 9 AM in each user's local time
    }
  }
}
```

### 3. Critical Alerts with Provider Fallback

Ensure delivery with provider fallback chains:

```typescript
POST /api/v1/services/notifications/send-multi
{
  "tenantId": 1,
  "channels": ["email", "sms"],
  "recipients": [
    {
      "recipientUserId": "admin1",
      "recipientEmail": "admin1@example.com",
      "recipientPhone": "+1234567890"
    }
  ],
  "directContent": {
    "subject": "CRITICAL: Server Down",
    "body": "Production server is unresponsive"
  },
  "options": {
    "requireAllChannelsSuccess": true,
    "providerChains": {
      "email": {
        "primary": "sendgrid",
        "fallbacks": ["ses", "mailgun"]
      },
      "sms": {
        "primary": "twilio",
        "fallbacks": ["vonage"]
      }
    }
  }
}
```

### 4. Bulk Order Notifications

Send order confirmations to multiple customers:

```typescript
POST /api/v1/services/notifications/send-multi
{
  "tenantId": 1,
  "channels": ["email", "sms", "database"],
  "recipients": [
    {
      "recipientUserId": "cust1",
      "recipientEmail": "cust1@example.com",
      "recipientPhone": "+1111111111"
    },
    {
      "recipientUserId": "cust2",
      "recipientEmail": "cust2@example.com",
      "recipientPhone": "+2222222222"
    }
  ],
  "templateCode": "ORDER_SHIPPED",
  "templateVariables": {
    "trackingNumber": "TRK-123456"
  }
}
```

## API Reference

### Endpoint

```
POST /api/v1/services/notifications/send-multi
```

### Authentication

Requires Bearer token with `notification:send` scope.

### Headers

```
Authorization: Bearer YOUR_TOKEN
X-Tenant-Id: 1
Content-Type: application/json
```

### Request Body

```typescript
{
  "tenantId": number,
  "channels": string[],
  "recipients": [
    {
      "recipientUserId"?: string,
      "recipientEmail"?: string,
      "recipientPhone"?: string,
      "recipientMetadata"?: object
    }
  ],
  "templateId"?: number,
  "templateCode"?: string,
  "templateVariables"?: object,
  "directContent"?: {
    "subject"?: string,
    "body": string,
    "htmlBody"?: string
  },
  "scheduledAt"?: string,  // ISO 8601
  "metadata"?: object,
  "options"?: {
    "stopOnFirstChannelSuccess"?: boolean,
    "requireAllChannelsSuccess"?: boolean,
    "providerChains"?: {
      [channel: string]: {
        "primary": string,
        "fallbacks"?: string[]
      }
    },
    "timezoneOptions"?: {
      "mode": "client" | "user" | "mixed",
      "timezone"?: string  // IANA timezone
    },
    "parallelUsers"?: boolean
  }
}
```

### Response

```typescript
{
  "success": boolean,
  "totalUsers": number,
  "totalChannels": number,
  "userResults": [
    {
      "userId": string,
      "channels": [
        {
          "channel": string,
          "success": boolean,
          "messageId"?: string,
          "provider"?: string,
          "error"?: {
            "code": string,
            "message": string
          },
          "timestamp": string
        }
      ],
      "successCount": number,
      "failureCount": number,
      "timezone"?: string,
      "scheduledAt"?: string
    }
  ],
  "timestamp": string,
  "metadata"?: object
}
```

## Configuration Options

### Timezone Handling

#### Client Mode

All users receive notification at the same absolute time:

```typescript
{
  "scheduledAt": "2026-01-10T10:00:00Z",
  "options": {
    "timezoneOptions": {
      "mode": "client",
      "timezone": "UTC"
    }
  }
}
```

#### User Mode

Each user receives notification at the same local time:

```typescript
{
  "scheduledAt": "2026-01-10T09:00:00Z",
  "options": {
    "timezoneOptions": {
      "mode": "user"  // 9 AM in each user's timezone
    }
  }
}
```

#### Mixed Mode

Uses client timezone if provided, falls back to user's timezone:

```typescript
{
  "scheduledAt": "2026-01-10T10:00:00Z",
  "options": {
    "timezoneOptions": {
      "mode": "mixed",
      "timezone": "America/New_York"  // Optional fallback
    }
  }
}
```

### Provider Fallback Chains

Specify primary and fallback providers per channel:

```typescript
{
  "options": {
    "providerChains": {
      "email": {
        "primary": "sendgrid",
        "fallbacks": ["ses", "mailgun"]
      },
      "sms": {
        "primary": "twilio",
        "fallbacks": ["vonage"]
      }
    }
  }
}
```

**How it works:**
1. Tries primary provider
2. If primary fails, tries first fallback
3. Continues through fallback chain
4. Returns success with provider used, or failure with all errors

### Stop on First Channel Success

Per user, stop sending after first successful channel:

```typescript
{
  "options": {
    "stopOnFirstChannelSuccess": true
  }
}
```

**Use case:** Cost optimization when any channel is acceptable

### Require All Channels Success

All channels must succeed for each user:

```typescript
{
  "options": {
    "requireAllChannelsSuccess": true
  }
}
```

**Use case:** Critical notifications that must reach all channels

### Parallel vs Sequential User Processing

```typescript
{
  "options": {
    "parallelUsers": true  // Default: process users in parallel
  }
}
```

Set to `false` for sequential processing (useful for rate limiting).

## Examples

### Example 1: Simple Multi-User Email

```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/send-multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "tenantId": 1,
    "channels": ["email"],
    "recipients": [
      { "recipientUserId": "user1", "recipientEmail": "user1@example.com" },
      { "recipientUserId": "user2", "recipientEmail": "user2@example.com" }
    ],
    "directContent": {
      "subject": "Welcome to our platform!",
      "body": "Thank you for joining us."
    }
  }'
```

### Example 2: Scheduled Multi-Channel with Timezone

```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/send-multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "tenantId": 1,
    "channels": ["email", "sms", "database"],
    "recipients": [
      {
        "recipientUserId": "user123",
        "recipientEmail": "user@example.com",
        "recipientPhone": "+1234567890"
      }
    ],
    "templateCode": "APPOINTMENT_REMINDER",
    "templateVariables": {
      "appointmentTime": "10:00 AM",
      "appointmentDate": "2026-01-15"
    },
    "scheduledAt": "2026-01-14T08:00:00Z",
    "options": {
      "timezoneOptions": {
        "mode": "user"
      }
    }
  }'
```

### Example 3: Provider Fallback Chain

```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/send-multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "tenantId": 1,
    "channels": ["email"],
    "recipients": [
      { "recipientUserId": "user1", "recipientEmail": "user1@example.com" }
    ],
    "directContent": {
      "subject": "Important Update",
      "body": "Please read this important message."
    },
    "options": {
      "providerChains": {
        "email": {
          "primary": "sendgrid",
          "fallbacks": ["ses", "mailgun"]
        }
      }
    }
  }'
```

## Response Examples

### Successful Multi-User Multi-Channel

```json
{
  "success": true,
  "totalUsers": 2,
  "totalChannels": 3,
  "userResults": [
    {
      "userId": "user123",
      "timezone": "America/New_York",
      "scheduledAt": "2026-01-09T05:00:00-05:00",
      "successCount": 3,
      "failureCount": 0,
      "channels": [
        {
          "channel": "email",
          "success": true,
          "messageId": "123",
          "provider": "sendgrid",
          "timestamp": "2026-01-08T20:00:00Z"
        },
        {
          "channel": "sms",
          "success": true,
          "messageId": "456",
          "provider": "twilio",
          "timestamp": "2026-01-08T20:00:00Z"
        },
        {
          "channel": "database",
          "success": true,
          "messageId": "789",
          "provider": "database-inbox",
          "timestamp": "2026-01-08T20:00:00Z"
        }
      ]
    },
    {
      "userId": "user456",
      "timezone": "Europe/London",
      "scheduledAt": "2026-01-09T10:00:00+00:00",
      "successCount": 3,
      "failureCount": 0,
      "channels": [
        {
          "channel": "email",
          "success": true,
          "messageId": "321",
          "provider": "sendgrid",
          "timestamp": "2026-01-08T20:00:00Z"
        },
        {
          "channel": "sms",
          "success": true,
          "messageId": "654",
          "provider": "twilio",
          "timestamp": "2026-01-08T20:00:00Z"
        },
        {
          "channel": "database",
          "success": true,
          "messageId": "987",
          "provider": "database-inbox",
          "timestamp": "2026-01-08T20:00:00Z"
        }
      ]
    }
  ],
  "timestamp": "2026-01-08T20:00:00Z",
  "metadata": {
    "multiNotificationId": "multi-1704744000000",
    "tenantId": 1
  }
}
```

### Partial Failure with Fallback

```json
{
  "success": true,
  "totalUsers": 1,
  "totalChannels": 2,
  "userResults": [
    {
      "userId": "user123",
      "successCount": 1,
      "failureCount": 1,
      "channels": [
        {
          "channel": "email",
          "success": true,
          "messageId": "123",
          "provider": "ses",
          "timestamp": "2026-01-08T20:00:00Z"
        },
        {
          "channel": "sms",
          "success": false,
          "error": {
            "code": "ALL_PROVIDERS_FAILED",
            "message": "twilio: Rate limit exceeded, vonage: Invalid phone"
          },
          "timestamp": "2026-01-08T20:00:00Z"
        }
      ]
    }
  ],
  "timestamp": "2026-01-08T20:00:00Z"
}
```

## Best Practices

### 1. Choose Appropriate Processing Mode

```typescript
// For time-sensitive notifications (< 100 users)
{
  "options": { "parallelUsers": true }  // Default
}

// For large batches (> 1000 users) with rate limits
{
  "options": { "parallelUsers": false }
}
```

### 2. Set Realistic Provider Chains

```typescript
// Good: 2-3 fallbacks
{
  "providerChains": {
    "email": {
      "primary": "sendgrid",
      "fallbacks": ["ses", "mailgun"]
    }
  }
}

// Avoid: Too many fallbacks (increases latency)
{
  "providerChains": {
    "email": {
      "primary": "sendgrid",
      "fallbacks": ["ses", "mailgun", "postmark", "sparkpost"]
    }
  }
}
```

### 3. Use Appropriate Timezone Mode

```typescript
// Marketing campaigns: user mode
{
  "timezoneOptions": { "mode": "user" }
}

// System announcements: client mode
{
  "timezoneOptions": { "mode": "client", "timezone": "UTC" }
}

// Mixed scenarios: mixed mode
{
  "timezoneOptions": { "mode": "mixed", "timezone": "UTC" }
}
```

### 4. Handle Partial Failures

Always check individual user results:

```typescript
if (result.success) {
  // At least one user had success
  result.userResults.forEach(userResult => {
    if (userResult.successCount === 0) {
      console.error(`All channels failed for user ${userResult.userId}`);
    } else if (userResult.failureCount > 0) {
      console.warn(`Partial failure for user ${userResult.userId}`);
    }
  });
}
```

### 5. Monitor Provider Performance

Track which providers are used:

```typescript
const providerUsage = {};
result.userResults.forEach(ur => {
  ur.channels.forEach(ch => {
    if (ch.success && ch.provider) {
      providerUsage[ch.provider] = (providerUsage[ch.provider] || 0) + 1;
    }
  });
});
console.log('Provider usage:', providerUsage);
```

## Performance Considerations

### Scalability

- **Parallel Processing**: Default mode processes users simultaneously
- **Rate Limiting**: Respects provider rate limits per channel
- **Batch Size**: Recommended max 1000 users per request

### Timeouts

- Each channel has independent timeout (30s default)
- Total request timeout: 5 minutes
- Use sequential mode for large batches to avoid timeout

### Cost Optimization

```typescript
// Stop after first successful channel (cheapest)
{
  "options": { "stopOnFirstChannelSuccess": true }
}

// Send to all channels (most reliable but expensive)
{
  "options": { "requireAllChannelsSuccess": true }
}
```

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "At least one recipient must be specified"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Invalid or missing authentication token"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions: notification:send scope required"
}
```

### Handling Provider Failures

All provider failures are included in the response:

```json
{
  "channel": "email",
  "success": false,
  "error": {
    "code": "ALL_PROVIDERS_FAILED",
    "message": "sendgrid: API key invalid, ses: Rate limit, mailgun: Timeout"
  }
}
```

## Monitoring and Analytics

### Key Metrics

```sql
-- Multi-notification success rate
SELECT 
  COUNT(*) as total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  AVG(total_users) as avg_users_per_request,
  AVG(total_channels) as avg_channels_per_request
FROM multi_notification_logs;

-- Provider fallback usage
SELECT 
  channel,
  provider,
  COUNT(*) as times_used,
  SUM(CASE WHEN is_fallback THEN 1 ELSE 0 END) as fallback_usage
FROM provider_attempts
GROUP BY channel, provider;

-- Timezone distribution
SELECT 
  resolved_timezone,
  COUNT(*) as user_count
FROM notifications
WHERE resolved_timezone IS NOT NULL
GROUP BY resolved_timezone
ORDER BY user_count DESC;
```

## Related Documentation

- [Multi-Channel Broadcast](./MULTI_CHANNEL_BROADCAST.md) - Single user, multiple channels
- [Batch Notifications](./BATCH_NOTIFICATIONS.md) - Multiple users, single channel
- [Provider Architecture](./PROVIDERS.md) - Provider system overview
- [Timezone Handling](./TIMEZONE_HANDLING.md) - Detailed timezone guide

## Support

For issues with multi-user multi-channel notifications:
- Check logs for detailed error messages
- Verify provider credentials and configurations
- Test individual channels before combining
- Monitor rate limits for each provider
- Review timezone settings for scheduled notifications
