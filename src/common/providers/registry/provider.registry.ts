/**
 * Provider Registry
 *
 * Manages provider instances with caching and lifecycle management.
 * Automatically registers all available providers on module initialization.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ProviderFactory } from '../factory/provider.factory';
import {
  IProvider,
  IProviderCredentials,
} from '../interfaces/provider.interface';
import { ChannelType } from '../types';

// Import all provider implementations
import { SendGridProvider } from '../implementations/email/sendgrid.provider';
import { TwilioProvider } from '../implementations/sms/twilio.provider';
import { WPPConnectProvider } from '../implementations/whatsapp/wppconnect.provider';

// Chat providers
import { DiscordProvider } from '../implementations/chat/discord.provider';
import { SlackProvider } from '../implementations/chat/slack.provider';
import { TeamsProvider } from '../implementations/chat/teams.provider';
import { GoogleChatProvider } from '../implementations/chat/google-chat.provider';
import { MattermostProvider } from '../implementations/chat/mattermost.provider';

// Messenger providers
import { TelegramProvider } from '../implementations/messenger/telegram.provider';
import { SignalProvider } from '../implementations/messenger/signal.provider';

// Push providers
import { PushoverProvider } from '../implementations/push/pushover.provider';
import { GotifyProvider } from '../implementations/push/gotify.provider';
import { NtfyProvider } from '../implementations/push/ntfy.provider';

// Alert providers
import { PagerDutyProvider } from '../implementations/alert/pagerduty.provider';
import { OpsgenieProvider } from '../implementations/alert/opsgenie.provider';

// Webhook provider
import { WebhookProvider } from '../implementations/webhook/webhook.provider';

// Aggregator provider
import { AppriseProvider } from '../implementations/aggregator/apprise.provider';

@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly instances = new Map<string, IProvider>();

  constructor(private readonly factory: ProviderFactory) {}

  /**
   * Register all providers on module initialization
   */
  onModuleInit(): void {
    this.registerAllProviders();
  }

  /**
   * Register all available providers
   */
  private registerAllProviders(): void {
    // Email providers
    this.factory.register('sendgrid', SendGridProvider);

    // SMS providers
    this.factory.register('twilio', TwilioProvider);

    // WhatsApp providers
    this.factory.register('wppconnect', WPPConnectProvider);

    // Chat providers (Tier 1 & 2)
    this.factory.register('discord', DiscordProvider);
    this.factory.register('slack', SlackProvider);
    this.factory.register('teams', TeamsProvider);
    this.factory.register('GoogleChat', GoogleChatProvider);
    this.factory.register('mattermost', MattermostProvider);

    // Messenger providers (Tier 1 & 2)
    this.factory.register('telegram', TelegramProvider);
    this.factory.register('signal', SignalProvider);

    // Push providers (Tier 1 & 2)
    this.factory.register('pushover', PushoverProvider);
    this.factory.register('gotify', GotifyProvider);
    this.factory.register('ntfy', NtfyProvider);

    // Alert providers (Tier 1 & 2)
    this.factory.register('PagerDuty', PagerDutyProvider);
    this.factory.register('Opsgenie', OpsgenieProvider);

    // Webhook provider (Tier 1)
    this.factory.register('webhook', WebhookProvider);

    // Aggregator provider (Tier 1) - Provides access to 50+ services
    this.factory.register('apprise', AppriseProvider);

    // TODO: Register Tier 3 providers as needed
    // Many Tier 3 providers are already accessible via Apprise
    // this.factory.register('ses', SESProvider);
    // this.factory.register('mailgun', MailgunProvider);
    // this.factory.register('rocket.chat', RocketChatProvider);
    // this.factory.register('matrix', MatrixProvider);

    this.logger.log(
      `Registered ${this.factory.getAvailableProviders().length} providers`,
    );
  }

  /**
   * Get or create provider instance
   */
  async getProvider<T extends IProviderCredentials>(
    providerName: string,
    credentials: T,
    useCache = true,
  ): Promise<IProvider<T>> {
    const cacheKey = this.getCacheKey(providerName, credentials);

    if (useCache && this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey) as IProvider<T>;
    }

    const provider = this.factory.create(providerName, credentials);

    // Validate on first creation
    const isValid = await provider.validate();
    if (!isValid) {
      throw new Error(`Provider ${providerName} validation failed`);
    }

    if (useCache) {
      this.instances.set(cacheKey, provider);
    }

    return provider;
  }

  /**
   * Validate provider without creating instance
   */
  async validateProvider(
    providerName: string,
    credentials: IProviderCredentials,
  ): Promise<boolean> {
    try {
      const provider = this.factory.create(providerName, credentials);
      return await provider.validate();
    } catch (error) {
      this.logger.error(
        `Provider validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * List providers by channel
   */
  listProviders(channel?: ChannelType): string[] {
    const allProviders = this.factory.getAvailableProviders();

    if (!channel) {
      return allProviders;
    }

    // Filter by channel (would need provider metadata)
    return allProviders; // TODO: implement channel filtering
  }

  /**
   * Clear cached instances
   */
  clearCache(providerName?: string): void {
    if (providerName) {
      const keysToDelete: string[] = [];
      for (const key of this.instances.keys()) {
        if (key.startsWith(`${providerName}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.instances.delete(key));
    } else {
      this.instances.clear();
    }
  }

  /**
   * Generate cache key for provider instance
   */
  private getCacheKey(
    providerName: string,
    credentials: IProviderCredentials,
  ): string {
    // Simple hash of credentials (you might want a more sophisticated approach)
    const credHash = JSON.stringify(credentials).substring(0, 50);
    return `${providerName}:${credHash}`;
  }
}
