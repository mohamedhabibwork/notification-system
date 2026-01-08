/**
 * Common types for provider system
 */

export type ChannelType =
  | 'email'
  | 'sms'
  | 'fcm'
  | 'whatsapp'
  | 'database'
  | 'websocket' // WebSocket real-time notifications (internal gateway & external servers)
  | 'chat' // Discord, Slack, Teams, Google Chat, Mattermost, Rocket.Chat, Matrix, Kook, ZohoCliq, Stackfield
  | 'messenger' // Telegram, Signal, LINE Messenger, LINE Notify
  | 'push' // Pushover, Pushbullet, Pushy, Push by Techulus, Gorush, Gotify, Ntfy, Bark, LunaSea
  | 'alert' // Alerta, AlertNow, GoAlert, Opsgenie, PagerDuty, PagerTree, Splunk, Squadcast
  | 'webhook' // Generic webhooks
  | 'iot'; // Home Assistant, Nostr, OneBot

export interface ProviderOptions {
  requestedProvider?: string;
  tenantId?: number;
  fallbackProvider?: string;
}
