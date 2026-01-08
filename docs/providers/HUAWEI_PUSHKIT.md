# Huawei Push Kit Provider

## Overview

The Huawei Push Kit provider enables push notifications to Huawei devices through Huawei Mobile Services (HMS Core). This is essential for reaching users on Huawei devices that don't have Google Play Services installed.

## Features

- ✅ Push notifications to Huawei Android devices
- ✅ OAuth 2.0 authentication with automatic token refresh
- ✅ Support for notification and data messages
- ✅ Customizable priority levels (HIGH, NORMAL)
- ✅ Time-to-live (TTL) configuration
- ✅ Custom notification sounds
- ✅ Badge management
- ✅ Click actions (open app, open URL, custom intent)
- ✅ Android notification channels support
- ✅ Image/icon support
- ✅ Collapse key for message grouping

## Prerequisites

1. **Huawei Developer Account**: Register at [Huawei Developer Console](https://developer.huawei.com/)
2. **AppGallery Connect Project**: Create a project in [AppGallery Connect](https://developer.huawei.com/consumer/en/service/josp/agc/index.html)
3. **Enable Push Kit**: Enable Push Kit service in your AppGallery Connect project

## Getting Credentials

### Step 1: Create an App in AppGallery Connect

1. Log in to [AppGallery Connect](https://developer.huawei.com/consumer/en/service/josp/agc/index.html)
2. Click "My projects" and select or create a project
3. Click "Add app" and select "Android"
4. Fill in the app information:
   - App name
   - Package name (must match your Android app)
   - App category
5. Download the `agconnect-services.json` file

### Step 2: Enable Push Kit

1. In your project, go to "Build" > "Push Kit"
2. Click "Enable now" to activate Push Kit
3. Configure push notification settings

### Step 3: Get OAuth 2.0 Credentials

1. Go to "Project Settings" > "General information"
2. Under "App information", find your app
3. Note down the following credentials:
   - **App ID**: Found under "App information"
   - **App secret**: Click "View" next to App secret
   - **Client ID**: Found under OAuth 2.0 credentials
   - **Client secret**: Click "View" next to Client secret

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Huawei Push Kit Configuration
FCM_HUAWEI_APP_ID=your-app-id
FCM_HUAWEI_APP_SECRET=your-app-secret
FCM_HUAWEI_CLIENT_ID=your-client-id
FCM_HUAWEI_CLIENT_SECRET=your-client-secret
FCM_HUAWEI_ENABLED=true
```

### Database Configuration

Configure per tenant in the `notification_providers` table:

```sql
INSERT INTO notification_providers (
  tenant_id,
  channel,
  provider_name,
  credentials,
  is_primary,
  is_active,
  priority
) VALUES (
  1,
  'fcm',
  'huawei-pushkit',
  '{
    "providerType": "huawei-pushkit",
    "channel": "fcm",
    "enabled": true,
    "appId": "your-app-id",
    "appSecret": "your-app-secret",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }',
  false,
  true,
  3
);
```

## Usage

### Basic Push Notification

```typescript
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "fcm",
  "recipient": {
    "recipientUserId": "user123",
    "deviceToken": "huawei-device-token-here"
  },
  "directContent": {
    "subject": "New Message",
    "body": "You have a new message from John"
  },
  "metadata": {
    "provider": "huawei-pushkit"
  }
}
```

### With Custom Options

```typescript
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "fcm",
  "recipient": {
    "deviceToken": "huawei-device-token-here"
  },
  "directContent": {
    "subject": "Order Shipped",
    "body": "Your order #12345 has been shipped!"
  },
  "metadata": {
    "provider": "huawei-pushkit",
    "priority": "high",
    "ttl": 86400,
    "sound": "notification_sound.mp3",
    "badge": 5,
    "image": "https://example.com/image.png",
    "channelId": "orders",
    "clickAction": "https://example.com/orders/12345",
    "collapseKey": 12345
  }
}
```

### Data Message

```typescript
POST /api/v1/services/notifications/send
{
  "tenantId": 1,
  "channel": "fcm",
  "recipient": {
    "deviceToken": "huawei-device-token-here"
  },
  "directContent": {
    "body": "Background sync required",
    "data": {
      "action": "sync",
      "timestamp": "2024-01-01T00:00:00Z",
      "syncType": "full"
    }
  },
  "metadata": {
    "provider": "huawei-pushkit"
  }
}
```

## Message Format

### Notification Message

```json
{
  "message": {
    "notification": {
      "title": "Message Title",
      "body": "Message body text"
    },
    "android": {
      "urgency": "HIGH",
      "ttl": "86400s",
      "notification": {
        "title": "Android specific title",
        "body": "Android specific body",
        "icon": "/drawable/notification_icon",
        "color": "#FF5722",
        "sound": "notification_sound.mp3",
        "click_action": {
          "type": 1,
          "intent": "myapp://home"
        },
        "badge": {
          "add_num": 1
        }
      }
    },
    "token": ["device-token-1", "device-token-2"]
  }
}
```

## Priority Levels

- **HIGH**: Delivered immediately, wakes up device
- **NORMAL**: Delivered when device is active

```typescript
// High priority (default)
metadata: {
  priority: "high"
}

// Normal priority
metadata: {
  priority: "normal"
}
```

## Click Actions

### Open App (Type 1)

```typescript
metadata: {
  clickAction: { type: 1 }
}
```

### Open URL (Type 2)

```typescript
metadata: {
  clickAction: "https://example.com/page"
}
```

### Custom Intent (Type 3)

```typescript
metadata: {
  clickAction: { 
    type: 3,
    intent: "myapp://custom-action"
  }
}
```

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| 80000000 | Success | N/A |
| 80100000 | Service not available | Yes |
| 80100001 | Request timeout | Yes |
| 80100002 | System error | Yes |
| 80100003 | Overload | Yes |
| 80200001 | OAuth token expired | Yes |
| 80300007 | Quota exceeded | Yes |
| 80300008 | Invalid token | No |
| 80300010 | Invalid message | No |

## Rate Limits

- **Free Tier**: 1,000,000 messages per day
- **Paid Tier**: Custom limits based on plan
- **Per Second**: 10 requests per second recommended

## Best Practices

### 1. Token Management

- Store device tokens securely
- Handle token refresh on the client side
- Remove invalid tokens from your database

### 2. Message Optimization

- Keep notification titles under 50 characters
- Keep notification bodies under 200 characters
- Compress images to reduce payload size
- Use collapse keys to replace outdated notifications

### 3. Testing

```bash
# Test with single device
curl -X POST http://localhost:3000/api/v1/services/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tenantId": 1,
    "channel": "fcm",
    "recipient": {
      "deviceToken": "test-device-token"
    },
    "directContent": {
      "subject": "Test",
      "body": "Test notification"
    },
    "metadata": {
      "provider": "huawei-pushkit"
    }
  }'
```

### 4. Monitoring

Track the following metrics:

- Delivery success rate
- Token failure rate
- Average delivery time
- Error rate by error code

## Troubleshooting

### Issue: "OAuth token generation failed"

**Solution**: Verify your client ID and client secret are correct

```bash
# Test OAuth endpoint directly
curl -X POST https://oauth-login.cloud.huawei.com/oauth2/v3/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

### Issue: "Invalid token"

**Solution**: Ensure the device token is valid and belongs to your app

### Issue: "Provider validation failed"

**Solution**: Check that all required credentials are provided and correct

## Client-Side Integration

### Android (HMS SDK)

```kotlin
// Get Huawei Push token
HmsInstanceId.getInstance(context).getToken(appId, "HCM")
```

## Resources

- [Huawei Push Kit Documentation](https://developer.huawei.com/consumer/en/doc/development/HMSCore-Guides/service-introduction-0000001050040060)
- [AppGallery Connect Console](https://developer.huawei.com/consumer/en/service/josp/agc/index.html)
- [HMS Core SDK](https://developer.huawei.com/consumer/en/hms/huawei-pushkit/)
- [Push Kit REST API Reference](https://developer.huawei.com/consumer/en/doc/development/HMSCore-References/https-send-api-0000001050986197)

## Support

For issues specific to Huawei Push Kit:
- Check logs with `LOG_LEVEL=debug`
- Verify credentials in AppGallery Connect
- Test with Huawei Push Kit testing tools
- Contact Huawei Developer Support for API issues
