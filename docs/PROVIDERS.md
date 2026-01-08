# Notification Providers

This document provides comprehensive information about all supported notification providers in the notification system.

## Overview

The notification system supports **17 implemented providers** plus access to **50+ additional services** through Apprise, organized into the following categories:

- **WebSocket**: Real-time bidirectional WebSocket notifications ⭐ NEW
- **Chat**: Discord, Slack, Microsoft Teams, Google Chat, Mattermost (+ others via Apprise)
- **Messenger**: Telegram, Signal, LINE Messenger, LINE Notify
- **Push**: Pushover, Gotify, Ntfy, Bark, and more
- **Alert**: PagerDuty, Opsgenie, Alerta, Splunk, and more
- **Webhook**: Generic webhook support for any HTTP endpoint
- **IoT**: Home Assistant, Nostr, OneBot
- **Email**: SendGrid, AWS SES, Mailgun
- **SMS**: Twilio, AWS SNS, ClickSend, Octopush, SMSEagle
- **FCM**: Firebase FCM, Apple APN, Huawei Push Kit
- **WhatsApp**: WhatsApp Business API, WPPConnect
- **Database**: Database-Inbox for in-app notifications

## 🆕 Multi-Channel Broadcast

Send the same notification across multiple channels simultaneously! See [Multi-Channel Broadcast Documentation](./MULTI_CHANNEL_BROADCAST.md) for details.

## Quick Start

1. **Choose a provider** from the list below
2. **Configure environment variables** in your `.env` file
3. **Send notifications** using the API

```bash
# Example: Configure Discord
CHAT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK
CHAT_DISCORD_ENABLED=true

# Send notification via API
curl -X POST http://localhost:3000/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "channel": "chat",
    "recipient": {"userId": "123"},
    "content": {
      "subject": "Hello",
      "body": "Your notification message"
    },
    "metadata": {
      "provider": "discord"
    }
  }'
```

## Provider Categories

### 1. WebSocket Provider ⭐ NEW

Real-time bidirectional WebSocket communication for instant notifications.

#### WebSocket
- **Status**: ✅ Implemented
- **Modes**: Internal (NotificationGateway) & External (ws/Socket.IO)
- **Features**: 
  - Real-time push notifications
  - Channel/room broadcasts
  - Bidirectional communication
  - Request-response pattern
  - Automatic reconnection
  - Multiple authentication methods
  - Message compression & acknowledgments
  - Event subscription & handling
- **Rate Limit**: 100 msg/sec, 10M/day
- **Setup**: Choose internal mode (no setup) or configure external WebSocket server
- **Use Cases**: 
  - Real-time user notifications
  - In-app alerts and updates
  - Channel broadcasts
  - Third-party WebSocket integration
  - Microservices communication
  - IoT device messaging
- **Docs**: [WebSocket Provider](./providers/WEBSOCKET_PROVIDER.md)

### 2. Chat Providers

For team collaboration and workspace notifications.

#### Discord
- **Status**: ✅ Implemented
- **Features**: Webhooks, embeds, markdown, mentions
- **Rate Limit**: 5 req/sec, 50K/day
- **Setup**: Create webhook in Discord server settings
- **Docs**: [Discord Provider](./providers/CHAT_PROVIDERS.md#discord)

#### Slack
- **Status**: ✅ Implemented
- **Features**: Webhooks, blocks, mentions, interactive messages
- **Rate Limit**: 1 req/sec, 10K/day
- **Setup**: Create webhook or use bot token
- **Docs**: [Slack Provider](./providers/CHAT_PROVIDERS.md#slack)

#### Microsoft Teams
- **Status**: ✅ Implemented
- **Features**: Adaptive cards, mentions, actions
- **Rate Limit**: 4 req/sec, 20K/day
- **Setup**: Create incoming webhook in Teams channel
- **Docs**: [Teams Provider](./providers/CHAT_PROVIDERS.md#teams)

#### Google Chat
- **Status**: ✅ Implemented
- **Features**: Cards, buttons, threads
- **Rate Limit**: 1 req/sec, 10K/day
- **Setup**: Create webhook in Google Chat space
- **Docs**: [Google Chat Provider](./providers/CHAT_PROVIDERS.md#google-chat)

#### Mattermost
- **Status**: ✅ Implemented
- **Features**: Webhooks, markdown, attachments
- **Rate Limit**: 10 req/sec, 100K/day
- **Setup**: Create incoming webhook in Mattermost
- **Docs**: [Mattermost Provider](./providers/CHAT_PROVIDERS.md#mattermost)

### 3. Messenger Providers

For instant messaging and direct user communication.

#### Telegram
- **Status**: ✅ Implemented
- **Features**: Bot API, markdown, HTML, media, keyboards
- **Rate Limit**: 30 req/sec, 1M/day
- **Setup**: Create bot via @BotFather
- **Docs**: [Telegram Provider](./providers/MESSENGER_PROVIDERS.md#telegram)

#### Signal
- **Status**: ✅ Implemented
- **Features**: End-to-end encryption, groups, media
- **Rate Limit**: 10 req/sec, 50K/day
- **Setup**: Set up Signal CLI or API gateway
- **Docs**: [Signal Provider](./providers/MESSENGER_PROVIDERS.md#signal)

#### LINE Messenger
- **Status**: 🔄 Via Apprise
- **Features**: Rich messages, templates, quick replies
- **Setup**: Create LINE messaging API channel
- **Docs**: [LINE Provider](./providers/MESSENGER_PROVIDERS.md#line)

#### LINE Notify
- **Status**: 🔄 Via Apprise
- **Features**: Simple notifications to LINE
- **Setup**: Generate LINE Notify token
- **Docs**: [LINE Notify Provider](./providers/MESSENGER_PROVIDERS.md#line-notify)

### 3. FCM (Mobile Push) Providers

For mobile app push notifications.

#### Firebase Cloud Messaging (FCM)
- **Status**: ✅ Implemented
- **Platform**: Android, iOS, Web
- **Features**: Push notifications, data messages, topics, device groups
- **Rate Limit**: 10 req/sec, 1M/day (free tier)
- **Setup**: Configure Firebase project, download service account key
- **Docs**: [Firebase FCM Documentation](https://firebase.google.com/docs/cloud-messaging)

#### Apple Push Notification Service (APNs)
- **Status**: ✅ Implemented
- **Platform**: iOS, macOS, watchOS, tvOS
- **Features**: Push notifications, background updates, badges, sounds
- **Rate Limit**: 10 req/sec, unlimited (Apple doesn't impose limits)
- **Setup**: Generate APNs certificate or token-based key
- **Docs**: [Apple APNs Documentation](https://developer.apple.com/documentation/usernotifications)

#### Huawei Push Kit ⭐ NEW
- **Status**: ✅ Implemented
- **Platform**: Android (Huawei devices)
- **Features**: Push notifications for Huawei Mobile Services (HMS)
- **Rate Limit**: 10 req/sec, 1M/day (free tier)
- **Setup**: Create app in AppGallery Connect, get OAuth credentials
- **Docs**: [Huawei Push Kit Provider](./providers/HUAWEI_PUSHKIT.md)

### 4. Push Notification Providers

For mobile and desktop push notifications.

#### Pushover
- **Status**: ✅ Implemented
- **Features**: iOS/Android/Desktop, priority levels, sounds
- **Rate Limit**: 5 req/sec, 10K/day
- **Setup**: Create Pushover application
- **Docs**: [Pushover Provider](./providers/PUSH_PROVIDERS.md#pushover)

#### Gotify
- **Status**: ✅ Implemented
- **Features**: Self-hosted, markdown, priority
- **Rate Limit**: 100 req/sec (self-hosted)
- **Setup**: Install Gotify server, create app
- **Docs**: [Gotify Provider](./providers/PUSH_PROVIDERS.md#gotify)

#### Ntfy
- **Status**: ✅ Implemented
- **Features**: Simple HTTP pub-sub, self-hosted option
- **Rate Limit**: 60 req/sec (public), unlimited (self-hosted)
- **Setup**: Choose topic name (no registration needed)
- **Docs**: [Ntfy Provider](./providers/PUSH_PROVIDERS.md#ntfy)

### 5. Database Provider ⭐ NEW

For in-app notifications and persistent storage.

#### Database-Inbox
- **Status**: ✅ Implemented
- **Features**: In-app inbox, notification history, read/unread tracking
- **Rate Limit**: 1000 req/sec (database-dependent)
- **Setup**: Automatically enabled, no external credentials needed
- **Docs**: [Database Provider](./providers/DATABASE_PROVIDER.md)

### 6. Alert/Incident Management Providers

For DevOps alerts and incident management.

#### PagerDuty
- **Status**: ✅ Implemented
- **Features**: Incidents, escalations, on-call, deduplication
- **Rate Limit**: 10 req/sec, 100K/day
- **Setup**: Create integration in PagerDuty service
- **Docs**: [PagerDuty Provider](./providers/ALERT_PROVIDERS.md#pagerduty)

#### Opsgenie
- **Status**: ✅ Implemented
- **Features**: Alerts, priorities, on-call management
- **Rate Limit**: 10 req/sec, 100K/day
- **Setup**: Create API integration in Opsgenie
- **Docs**: [Opsgenie Provider](./providers/ALERT_PROVIDERS.md#opsgenie)

### 7. Webhook Provider

For custom integrations with any HTTP endpoint.

#### Generic Webhook
- **Status**: ✅ Implemented
- **Features**: Custom headers, multiple auth methods, any HTTP method
- **Rate Limit**: Configurable
- **Setup**: Provide endpoint URL and authentication
- **Docs**: [Webhook Provider](./providers/WEBHOOK_PROVIDER.md)

### 8. Aggregator Provider

#### Apprise
- **Status**: ✅ Implemented
- **Features**: Access to 50+ services via unified API
- **Supported Services**:
  - All providers listed above
  - Plus: Matrix, Rocket.Chat, Kook, Zoho Cliq, Stackfield
  - Plus: Pushbullet, Pushy, Bark, LunaSea, and 30+ more
- **Setup**: Provide service URLs in Apprise format
- **Docs**: [Apprise Provider](./providers/APPRISE_PROVIDER.md)

## Configuration Examples

### Environment Variables

```bash
# Chat - Discord
CHAT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123/abc
CHAT_DISCORD_ENABLED=true

# Messenger - Telegram
MESSENGER_TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
MESSENGER_TELEGRAM_CHAT_ID=@yourchannel
MESSENGER_TELEGRAM_ENABLED=true

# Push - Pushover
PUSH_PUSHOVER_API_TOKEN=your-app-token
PUSH_PUSHOVER_USER_KEY=your-user-key
PUSH_PUSHOVER_ENABLED=true

# Alert - PagerDuty
ALERT_PAGERDUTY_INTEGRATION_KEY=your-integration-key
ALERT_PAGERDUTY_ENABLED=true
```

### Database Configuration

Alternatively, configure providers per tenant via the database:

```sql
INSERT INTO notification_providers (
  tenant_id, 
  channel, 
  provider_name, 
  credentials, 
  is_primary, 
  is_active
) VALUES (
  1,
  'chat',
  'discord',
  '{"webhookUrl": "https://discord.com/api/webhooks/..."}',
  true,
  true
);
```

## Provider Selection Priority

The system selects providers in this order:

1. **Request Override**: Specified in API call metadata
2. **Database Configuration**: Tenant-specific provider
3. **Environment Default**: Default provider from `.env`
4. **First Enabled**: First available enabled provider

Example with request override:

```json
{
  "channel": "chat",
  "metadata": {
    "provider": "slack"  // Override default Discord with Slack
  }
}
```

## API Usage Examples

### Send via Discord

```bash
POST /api/v1/notifications/send
{
  "tenantId": 1,
  "channel": "chat",
  "recipient": {"userId": "user123"},
  "content": {
    "subject": "Deployment Complete",
    "body": "Version 2.0 has been deployed successfully"
  },
  "metadata": {
    "provider": "discord"
  }
}
```

### Send via Telegram

```bash
POST /api/v1/notifications/send
{
  "tenantId": 1,
  "channel": "messenger",
  "recipient": {"userId": "telegram:123456"},
  "content": {
    "body": "Your order #12345 has shipped!"
  },
  "metadata": {
    "provider": "telegram"
  }
}
```

### Send via PagerDuty

```bash
POST /api/v1/notifications/send
{
  "tenantId": 1,
  "channel": "alert",
  "recipient": {"userId": "oncall-engineer"},
  "content": {
    "subject": "Database CPU Usage Critical",
    "body": "Database server CPU usage has exceeded 90% for 5 minutes"
  },
  "metadata": {
    "provider": "PagerDuty"
  }
}
```

## Rate Limiting

Each provider has different rate limits. The system automatically:

- Queues notifications to respect rate limits
- Implements exponential backoff for rate limit errors
- Distributes load across multiple workers
- Provides fallback to alternative providers

## Error Handling

All providers implement comprehensive error handling:

- **Retryable Errors**: Automatically retried with exponential backoff
- **Non-Retryable Errors**: Immediately marked as failed
- **Circuit Breaker**: Temporarily disables failing providers
- **Fallback**: Switches to backup provider if configured

## Monitoring

Track provider performance with built-in metrics:

- `notifications_sent_total{channel, provider, status}`
- `notifications_failed_total{channel, provider, error_type}`
- `notification_send_duration_seconds{channel, provider}`
- `provider_rate_limit_errors{provider}`

Access metrics at: `http://localhost:3000/metrics`

## Multi-Channel Broadcast

Send notifications to multiple channels simultaneously:

```bash
POST /api/v1/services/notifications/broadcast
{
  "tenantId": 1,
  "channels": ["email", "sms", "database", "fcm"],
  "recipient": {
    "recipientUserId": "user123",
    "recipientEmail": "user@example.com",
    "recipientPhone": "+1234567890",
    "deviceToken": "fcm-token-here"
  },
  "directContent": {
    "subject": "Critical Alert",
    "body": "Your account requires immediate attention"
  }
}
```

See [Multi-Channel Broadcast Documentation](./MULTI_CHANNEL_BROADCAST.md) for details.

## Next Steps

- [Huawei Push Kit Provider](./providers/HUAWEI_PUSHKIT.md) ⭐ NEW
- [Database Provider](./providers/DATABASE_PROVIDER.md) ⭐ NEW
- [Multi-Channel Broadcast](./MULTI_CHANNEL_BROADCAST.md) ⭐ NEW
- [Chat Providers Documentation](./providers/CHAT_PROVIDERS.md)
- [Messenger Providers Documentation](./providers/MESSENGER_PROVIDERS.md)
- [Push Providers Documentation](./providers/PUSH_PROVIDERS.md)
- [Alert Providers Documentation](./providers/ALERT_PROVIDERS.md)
- [Webhook Provider Documentation](./providers/WEBHOOK_PROVIDER.md)
- [Apprise Provider Documentation](./providers/APPRISE_PROVIDER.md)

## Support

For issues or questions:
- Check provider-specific documentation
- Review API documentation at `/api` (Swagger)
- Check logs for detailed error messages
- Enable debug logging: `LOG_LEVEL=debug`
