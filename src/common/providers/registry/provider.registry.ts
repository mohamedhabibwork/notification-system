/**
 * Provider Registry
 * 
 * Manages provider instances with caching and lifecycle management.
 * Automatically registers all available providers on module initialization.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ProviderFactory } from '../factory/provider.factory';
import { IProvider, IProviderCredentials } from '../interfaces/provider.interface';
import { ChannelType } from '../types';

// Import all provider implementations
import { SendGridProvider } from '../implementations/email/sendgrid.provider';
import { TwilioProvider } from '../implementations/sms/twilio.provider';
import { WPPConnectProvider } from '../implementations/whatsapp/wppconnect.provider';

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
    
    // TODO: Register other providers as they are implemented
    // this.factory.register('ses', SESProvider);
    // this.factory.register('mailgun', MailgunProvider);
    // this.factory.register('sns', SNSProvider);
    // this.factory.register('firebase', FirebaseProvider);
    // this.factory.register('apn', APNProvider);
    // this.factory.register('whatsapp-business', WhatsAppBusinessProvider);
    
    this.logger.log(`Registered ${this.factory.getAvailableProviders().length} providers`);
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
    
    return provider as IProvider<T>;
  }
  
  /**
   * Validate provider without creating instance
   */
  async validateProvider(providerName: string, credentials: IProviderCredentials): Promise<boolean> {
    try {
      const provider = this.factory.create(providerName, credentials);
      return await provider.validate();
    } catch (error) {
      this.logger.error(`Provider validation failed: ${(error as Error).message}`);
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
      keysToDelete.forEach(key => this.instances.delete(key));
    } else {
      this.instances.clear();
    }
  }
  
  /**
   * Generate cache key for provider instance
   */
  private getCacheKey(providerName: string, credentials: IProviderCredentials): string {
    // Simple hash of credentials (you might want a more sophisticated approach)
    const credHash = JSON.stringify(credentials).substring(0, 50);
    return `${providerName}:${credHash}`;
  }
}
