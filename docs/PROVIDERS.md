# Notification Providers

This document provides comprehensive information about all supported notification providers in the notification system.

## Overview

The notification system supports **14 implemented providers** plus access to **50+ additional services** through Apprise, organized into the following categories:

- **Chat**: Discord, Slack, Microsoft Teams, Google Chat, Mattermost (+ others via Apprise)
- **Messenger**: Telegram, Signal, LINE Messenger, LINE Notify
- **Push**: Pushover, Gotify, Ntfy, Bark, and more
- **Alert**: PagerDuty, Opsgenie, Alerta, Splunk, and more
- **Webhook**: Generic webhook support for any HTTP endpoint
- **IoT**: Home Assistant, Nostr, OneBot
- **Email**: SendGrid, AWS SES, Mailgun
- **SMS**: Twilio, AWS SNS, ClickSend, Octopush, SMSEagle
- **WhatsApp**: WhatsApp Business API, WPPConnect

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

### 1. Chat Providers

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

### 2. Messenger Providers

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

### 3. Push Notification Providers

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

### 4. Alert/Incident Management Providers

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

### 5. Webhook Provider

For custom integrations with any HTTP endpoint.

#### Generic Webhook
- **Status**: ✅ Implemented
- **Features**: Custom headers, multiple auth methods, any HTTP method
- **Rate Limit**: Configurable
- **Setup**: Provide endpoint URL and authentication
- **Docs**: [Webhook Provider](./providers/WEBHOOK_PROVIDER.md)

### 6. Aggregator Provider

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

## Next Steps

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
