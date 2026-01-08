import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderRegistry } from './registry/provider.registry';
import { ProvidersService } from '../../modules/providers/providers.service';
import { IProvider, IProviderCredentials } from './interfaces/provider.interface';
import { ChannelType, ProviderOptions } from './types';

interface ProviderConfigFromEnv {
  enabled: boolean;
  [key: string]: unknown;
}

/**
 * Provider Selector Service
 * 
 * Selects the appropriate provider for each notification channel based on:
 * 1. Request-specific provider override
 * 2. Tenant-specific provider configuration (from database)
 * 3. Default provider from configuration
 * 4. First enabled provider as fallback
 */
@Injectable()
export class ProviderSelectorService {
  private readonly logger = new Logger(ProviderSelectorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly registry: ProviderRegistry,
    @Inject(forwardRef(() => ProvidersService))
    private readonly providersService: ProvidersService,
  ) {}

  /**
   * Get the provider instance to use for a channel
   * 
   * @param channel - The notification channel (email, sms, fcm, whatsapp)
   * @param options - Optional overrides
   * @returns Provider instance ready to send notifications
   */
  async getProvider(
    channel: ChannelType,
    options?: ProviderOptions,
  ): Promise<IProvider> {
    // 1. Check for request-specific override
    if (options?.requestedProvider) {
      const isAvailable = this.isProviderEnabled(
        channel,
        options.requestedProvider,
      );
      if (isAvailable) {
        this.logger.debug(
          `Using requested provider: ${options.requestedProvider} for ${channel}`,
        );
        const credentials = this.buildCredentialsFromEnv(channel, options.requestedProvider);
        return await this.registry.getProvider(options.requestedProvider, credentials);
      }
      this.logger.warn(
        `Requested provider ${options.requestedProvider} is not enabled for ${channel}`,
      );
    }

    // 2. Get tenant-specific provider from database
    if (options?.tenantId) {
      const dbProvider = await this.getTenantProviderFromDatabase(
        channel,
        options.tenantId,
      );
      if (dbProvider) {
        this.logger.debug(
          `Using database provider: ${dbProvider.providerName} for tenant ${options.tenantId}`,
        );
        return await this.registry.getProvider(
          dbProvider.providerName,
          dbProvider.credentials as unknown as IProviderCredentials,
        );
      }
    }

    // 3. Get default provider from configuration
    const defaultProvider = this.getDefaultProvider(channel);
    if (defaultProvider && this.isProviderEnabled(channel, defaultProvider)) {
      this.logger.debug(
        `Using default provider: ${defaultProvider} for ${channel}`,
      );
      const credentials = this.buildCredentialsFromEnv(channel, defaultProvider);
      return await this.registry.getProvider(defaultProvider, credentials);
    }

    // 4. Get first enabled provider as fallback
    const fallbackProvider =
      options?.fallbackProvider || this.getFirstEnabledProvider(channel);
    
    if (!fallbackProvider) {
      throw new Error(`No enabled provider found for channel: ${channel}`);
    }

    this.logger.warn(
      `Using fallback provider: ${fallbackProvider} for ${channel}`,
    );
    const credentials = this.buildCredentialsFromEnv(channel, fallbackProvider);
    return await this.registry.getProvider(fallbackProvider, credentials);
  }

  /**
   * Get tenant-specific provider from database
   */
  private async getTenantProviderFromDatabase(
    channel: string,
    tenantId: number,
  ): Promise<{ providerName: string; credentials: Record<string, unknown> } | null> {
    try {
      const providers = await this.providersService.findByChannelAndTenant(
        channel,
        tenantId,
        true, // includeCredentials
      );

      if (providers && providers.length > 0) {
        // Get primary provider or first active one
        const provider = providers.find(p => p.isPrimary) || providers[0];
        
        // Type guard: when includeCredentials is true, we get ProviderWithCredentials
        if ('credentials' in provider) {
          return {
            providerName: provider.providerName,
            credentials: provider.credentials,
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get tenant provider from database: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Build provider credentials from environment configuration
   */
  private buildCredentialsFromEnv(
    channel: ChannelType,
    providerName: string,
  ): IProviderCredentials {
    const config = this.getProviderConfig(channel, providerName);
    
    return {
      ...config,
      providerType: providerName,
      channel,
      enabled: config.enabled ?? true,
    } as unknown as IProviderCredentials;
  }

  /**
   * Get the default provider for a channel from configuration
   */
  getDefaultProvider(channel: ChannelType): string | null {
    return this.configService.get<string>(`providers.defaults.${channel}`) || null;
  }

  /**
   * Check if a specific provider is enabled
   */
  isProviderEnabled(channel: ChannelType, providerName: string): boolean {
    const configPath = `providers.${channel}.${providerName}.enabled`;
    return this.configService.get<boolean>(configPath, false);
  }

  /**
   * Get the first enabled provider for a channel
   */
  getFirstEnabledProvider(channel: ChannelType): string | null {
    const providers = this.configService.get<Record<string, ProviderConfigFromEnv>>(
      `providers.${channel}`,
      {},
    );

    for (const [providerName, config] of Object.entries(providers)) {
      if (config?.enabled === true) {
        return providerName;
      }
    }

    return null;
  }

  /**
   * Get all enabled providers for a channel
   */
  getEnabledProviders(channel: ChannelType): string[] {
    const providers = this.configService.get<Record<string, ProviderConfigFromEnv>>(
      `providers.${channel}`,
      {},
    );

    return Object.entries(providers)
      .filter(([_, config]) => config?.enabled === true)
      .map(([name]) => name);
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(channel: ChannelType, providerName: string): Record<string, unknown> {
    return this.configService.get<Record<string, unknown>>(
      `providers.${channel}.${providerName}`,
    ) || {};
  }

  /**
   * Validate that at least one provider is enabled for each channel
   */
  validateProviders(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const channels: ChannelType[] = ['email', 'sms', 'fcm', 'whatsapp'];

    for (const channel of channels) {
      const enabledProviders = this.getEnabledProviders(channel);
      if (enabledProviders.length === 0) {
        errors.push(`No enabled providers found for channel: ${channel}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get provider status summary
   */
  getProviderStatus(): Record<string, unknown> {
    const channels: ChannelType[] = ['email', 'sms', 'fcm', 'whatsapp'];
    const status: Record<string, unknown> = {};

    for (const channel of channels) {
      const defaultProvider = this.getDefaultProvider(channel);
      const enabledProviders = this.getEnabledProviders(channel);

      status[channel] = {
        default: defaultProvider,
        enabled: enabledProviders,
        count: enabledProviders.length,
      };
    }

    return status;
  }
}
