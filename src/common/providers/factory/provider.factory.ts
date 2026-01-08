/**
 * Provider Factory
 *
 * Implements the Factory Pattern for creating provider instances dynamically.
 * Maintains a registry of available providers and creates instances on demand.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IProvider,
  IProviderCredentials,
} from '../interfaces/provider.interface';

type ProviderConstructor<
  T extends IProviderCredentials = IProviderCredentials,
> = new (credentials: T) => IProvider<T>;

@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);
  private readonly providers = new Map<string, ProviderConstructor>();

  /**
   * Register a provider class
   */
  register<T extends IProviderCredentials>(
    providerName: string,
    providerClass: ProviderConstructor<T>,
  ): void {
    if (this.providers.has(providerName)) {
      this.logger.warn(
        `Provider ${providerName} already registered, overwriting`,
      );
    }

    this.providers.set(providerName, providerClass as ProviderConstructor);
    this.logger.log(`Registered provider: ${providerName}`);
  }

  /**
   * Create provider instance
   */
  create<T extends IProviderCredentials>(
    providerName: string,
    credentials: T,
  ): IProvider<T> {
    const ProviderClass = this.providers.get(providerName);

    if (!ProviderClass) {
      throw new Error(
        `Provider ${providerName} not registered. Available: ${this.getAvailableProviders().join(', ')}`,
      );
    }

    const provider = new ProviderClass(credentials) as IProvider<T>;
    return provider;
  }

  /**
   * Check if provider is registered
   */
  isRegistered(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get all registered provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear all registered providers (useful for testing)
   */
  clear(): void {
    this.providers.clear();
  }
}
