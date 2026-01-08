# Multi-Channel Broadcast

## Overview

The Multi-Channel Broadcast feature allows you to send the same notification across multiple channels simultaneously. This ensures your message reaches users through their preferred communication methods and provides redundancy for critical notifications.

## Features

- ✅ Send to multiple channels in parallel
- ✅ Configurable success criteria
- ✅ Per-channel provider override
- ✅ Partial failure handling
- ✅ Detailed results per channel
- ✅ Automatic retry for retryable errors
- ✅ Stop-on-first-success mode
- ✅ Require-all-success mode

## Use Cases

### 1. Critical Notifications

Send urgent notifications through multiple channels to ensure delivery:

```typescript
// Security alert via email, SMS, and database
POST /api/v1/services/notifications/broadcast
{
  "tenantId": 1,
  "channels": ["email", "sms", "database"],
  "recipient": {
    "recipientUserId": "user123",
    "recipientEmail": "user@example.com",
    "recipientPhone": "+1234567890"
  },
  "directContent": {
    "subject": "Security Alert: New Login Detected",
    "body": "A new login was detected from a new device. If this wasn't you, please secure your account immediately."
  },
  "options": {
    "requireAllSuccess": true  // Ensure all channels succeed
  }
}
```

### 2. User Engagement

Maximize reach by using multiple channels:

```typescript
// Marketing campaign via email, push, and database
POST /api/v1/services/notifications/broadcast
{
  "tenantId": 1,
  "channels": ["email", "fcm", "database"],
  "recipient": {
    "recipientUserId": "user123",
    "recipientEmail": "user@example.com",
    "deviceToken": "fcm-token-here"
  },
  "templateCode": "PROMO_CAMPAIGN",
  "templateVariables": {
    "promoCode": "SAVE20",
    "expiryDate": "2024-12-31"
  }
}
```

### 3. Redundancy

Ensure delivery with fallback channels:

```typescript
// Try push first, fall back to SMS and email
POST /api/v1/services/notifications/broadcast
{
  "tenantId": 1,
  "channels": ["fcm", "sms", "email", "database"],
  "recipient": {
    "recipientUserId": "user123",
    "recipientEmail": "user@example.com",
    "recipientPhone": "+1234567890",
    "deviceToken": "fcm-token-here"
  },
  "directContent": {
    "subject": "Order Update",
    "body": "Your order #12345 has been delivered"
  }
}
```

### 4. Notification History

Store all notifications in database while sending to other channels:

```typescript
// Send via email and store in database
POST /api/v1/services/notifications/broadcast
{
  "tenantId": 1,
  "channels": ["email", "database"],
  "recipient": {
    "recipientUserId": "user123",
    "recipientEmail": "user@example.com"
  },
  "directContent": {
    "subject": "Receipt for Order #12345",
    "body": "Thank you for your purchase!"
  }
}
```

## API Reference

### Endpoint

```
POST /api/v1/services/notifications/broadcast
```

### Request Body

```typescript
{
  "tenantId": number,
  "channels": string[],  // Array of channel names
  "recipient": {
    "recipientUserId"?: string,
    "recipientEmail"?: string,
    "recipientPhone"?: string,
    "deviceToken"?: string,
    "recipientMetadata"?: object
  },
  "templateId"?: number,
  "templateCode"?: string,
  "templateVariables"?: object,
  "directContent"?: {
    "subject"?: string,
    "body": string,
    "htmlBody"?: string
  },
  "metadata"?: object,
  "options"?: {
    "stopOnFirstSuccess"?: boolean,    // Default: false
    "requireAllSuccess"?: boolean,     // Default: false
    "providers"?: {                     // Per-channel provider override
      [channel: string]: string
    }
  }
}
```

### Response

```typescript
{
  "success": boolean,           // True if at least one channel succeeded
  "totalChannels": number,      // Number of channels attempted
  "successCount": number,       // Number of successful deliveries
  "failureCount": number,       // Number of failed deliveries
  "results": [
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
  "timestamp": string,
  "metadata": object
}
```

## Configuration Options

### Stop on First Success

Send to channels until one succeeds, then stop:

```typescript
{
  "channels": ["fcm", "sms", "email"],
  "options": {
    "stopOnFirstSuccess": true
  }
}
```

**Use case**: Cost optimization when any channel is acceptable

### Require All Success

All channels must succeed, or the entire broadcast fails:

```typescript
{
  "channels": ["email", "sms"],
  "options": {
    "requireAllSuccess": true
  }
}
```

**Use case**: Critical notifications that must reach all channels

### Per-Channel Provider Override

Specify different providers for different channels:

```typescript
{
  "channels": ["email", "sms", "fcm"],
  "options": {
    "providers": {
      "email": "sendgrid",
      "sms": "twilio",
      "fcm": "huawei-pushkit"
    }
  }
}
```

**Use case**: A/B testing, provider-specific features

## Examples

### Example 1: Password Reset (Critical)

```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "tenantId": 1,
    "channels": ["email", "sms"],
    "recipient": {
      "recipientUserId": "user123",
      "recipientEmail": "user@example.com",
      "recipientPhone": "+1234567890"
    },
    "templateCode": "PASSWORD_RESET",
    "templateVariables": {
      "resetLink": "https://app.example.com/reset?token=xyz",
      "expiresIn": "15 minutes"
    },
    "options": {
      "requireAllSuccess": true
    }
  }'
```

### Example 2: Marketing Campaign (Broad Reach)

```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "tenantId": 1,
    "channels": ["email", "fcm", "database"],
    "recipient": {
      "recipientUserId": "user123",
      "recipientEmail": "user@example.com",
      "deviceToken": "fcm-token-here"
    },
    "directContent": {
      "subject": "Limited Time Offer: 50% Off!",
      "body": "Get 50% off your next purchase. Use code SAVE50 at checkout."
    },
    "metadata": {
      "campaignId": "summer-sale-2024",
      "promoCode": "SAVE50"
    }
  }'
```

### Example 3: Order Notification (With Fallback)

```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "tenantId": 1,
    "channels": ["fcm", "email", "database"],
    "recipient": {
      "recipientUserId": "user123",
      "recipientEmail": "user@example.com",
      "deviceToken": "fcm-token-here"
    },
    "templateCode": "ORDER_SHIPPED",
    "templateVariables": {
      "orderId": "12345",
      "trackingNumber": "TRK-ABC-123",
      "estimatedDelivery": "2024-12-25"
    }
  }'
```

### Example 4: System Alert (Developer-Specific Channels)

```bash
curl -X POST http://localhost:3000/api/v1/services/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: 1" \
  -d '{
    "tenantId": 1,
    "channels": ["chat", "alert", "database"],
    "recipient": {
      "recipientUserId": "admin123"
    },
    "directContent": {
      "subject": "High CPU Usage Alert",
      "body": "Server CPU usage exceeded 90% for 5 minutes"
    },
    "metadata": {
      "severity": "high",
      "server": "prod-api-01",
      "cpuUsage": "94%"
    },
    "options": {
      "providers": {
        "chat": "slack",
        "alert": "pagerduty"
      }
    }
  }'
```

## Response Examples

### Successful Broadcast

```json
{
  "success": true,
  "totalChannels": 3,
  "successCount": 3,
  "failureCount": 0,
  "results": [
    {
      "channel": "email",
      "success": true,
      "messageId": "msg-email-123",
      "provider": "sendgrid",
      "timestamp": "2024-01-01T12:00:00Z"
    },
    {
      "channel": "sms",
      "success": true,
      "messageId": "msg-sms-456",
      "provider": "twilio",
      "timestamp": "2024-01-01T12:00:00Z"
    },
    {
      "channel": "database",
      "success": true,
      "messageId": "12345",
      "provider": "database-inbox",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z",
  "metadata": {
    "broadcastId": "1704110400000",
    "tenantId": 1,
    "recipientUserId": "user123"
  }
}
```

### Partial Failure

```json
{
  "success": true,
  "totalChannels": 3,
  "successCount": 2,
  "failureCount": 1,
  "results": [
    {
      "channel": "email",
      "success": true,
      "messageId": "msg-email-123",
      "provider": "sendgrid",
      "timestamp": "2024-01-01T12:00:00Z"
    },
    {
      "channel": "sms",
      "success": false,
      "error": {
        "code": "INVALID_PHONE_NUMBER",
        "message": "The phone number format is invalid"
      },
      "timestamp": "2024-01-01T12:00:00Z"
    },
    {
      "channel": "database",
      "success": true,
      "messageId": "12345",
      "provider": "database-inbox",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z",
  "metadata": {
    "broadcastId": "1704110400000",
    "tenantId": 1,
    "recipientUserId": "user123"
  }
}
```

## Error Handling

### Partial Failures

By default, the broadcast is considered successful if **at least one channel** succeeds:

```typescript
// Returns success: true if any channel succeeds
{
  "success": true,
  "successCount": 2,
  "failureCount": 1
}
```

### All Failures

If all channels fail, the broadcast is marked as failed:

```typescript
{
  "success": false,
  "successCount": 0,
  "failureCount": 3,
  "results": [...]
}
```

### Require All Success Mode

When `requireAllSuccess: true`, any failure causes an error:

```typescript
// Throws error if any channel fails
{
  "error": "Broadcast failed: 1 out of 3 channels failed. Required all channels to succeed."
}
```

## Performance Considerations

### Parallel Execution

All channels are processed in parallel for optimal performance:

```typescript
// These execute simultaneously
channels: ["email", "sms", "fcm", "database"]
// Total time ≈ max(email_time, sms_time, fcm_time, database_time)
```

### Rate Limiting

Each channel respects its provider's rate limits:

- Email (SendGrid): 5 req/sec
- SMS (Twilio): 10 req/sec
- FCM: 10 req/sec
- Database: 1000+ req/sec

### Timeout Handling

Each channel has independent timeout handling:

```typescript
// If one channel times out, others continue
{
  "results": [
    { "channel": "email", "success": true },
    { "channel": "sms", "success": false, "error": "Timeout" },
    { "channel": "database", "success": true }
  ]
}
```

## Best Practices

### 1. Choose Channels Wisely

```typescript
// Good: Complementary channels
channels: ["email", "database"]  // Email for delivery, database for history

// Good: Redundant channels for critical alerts
channels: ["email", "sms", "fcm"]  // Multiple delivery methods

// Avoid: Redundant similar channels
channels: ["email", "email"]  // Duplicate channel
```

### 2. Set Appropriate Options

```typescript
// Critical notifications
options: {
  requireAllSuccess: true  // All must succeed
}

// Cost-sensitive notifications
options: {
  stopOnFirstSuccess: true  // Stop after first success
}

// Standard notifications
options: {}  // Best effort, no special requirements
```

### 3. Include Metadata

```typescript
metadata: {
  broadcastType: "transactional",
  priority: "high",
  campaignId: "onboarding-day-1",
  source: "automation"
}
```

### 4. Monitor Results

```typescript
// Log partial failures
if (result.failureCount > 0) {
  console.warn('Partial broadcast failure', {
    successCount: result.successCount,
    failureCount: result.failureCount,
    failedChannels: result.results
      .filter(r => !r.success)
      .map(r => r.channel)
  });
}
```

## Monitoring and Analytics

### Key Metrics

```sql
-- Broadcast success rate by channel
SELECT 
  channel,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
  (SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as success_rate
FROM broadcast_results
GROUP BY channel;

-- Average channels per broadcast
SELECT AVG(total_channels) as avg_channels
FROM broadcast_logs;

-- Most common channel combinations
SELECT 
  channels,
  COUNT(*) as frequency
FROM broadcast_logs
GROUP BY channels
ORDER BY frequency DESC
LIMIT 10;
```

## Troubleshooting

### Issue: All channels failing

**Solution**: Check provider configurations and credentials

```bash
# Test each provider individually
curl -X POST http://localhost:3000/api/v1/services/notifications/send \
  -d '{"channel": "email", ...}'
```

### Issue: Slow broadcast performance

**Solution**: Ensure parallel execution is working

```typescript
// Check that all channels execute in parallel
// Total time should be ≈ slowest channel, not sum of all channels
```

### Issue: Partial failures not logged

**Solution**: Check application logs and enable debug mode

```bash
LOG_LEVEL=debug npm start
```

## Related Documentation

- [Huawei Push Kit Provider](./providers/HUAWEI_PUSHKIT.md)
- [Database Provider](./providers/DATABASE_PROVIDER.md)
- [Provider Architecture](./PROVIDER_ARCHITECTURE.md)
- [Notifications API](/api/v1/docs)

## Support

For issues with multi-channel broadcast:
- Check logs for each channel individually
- Verify provider configurations
- Test channels separately before broadcasting
- Review rate limits for each provider
