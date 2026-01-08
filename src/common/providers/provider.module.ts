import { Module, Global, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ProviderSelectorService } from './provider-selector.service';
import { ProviderFactory } from './factory/provider.factory';
import { ProviderRegistry } from './registry/provider.registry';
import { SessionManagerService } from './implementations/whatsapp/session-manager.service';
import { ProvidersModule } from '../../modules/providers/providers.module';

/**
 * Provider Module
 *
 * Global module that provides provider selection functionality
 * across the entire application.
 *
 * Registers:
 * - ProviderFactory: Creates provider instances
 * - ProviderRegistry: Manages provider lifecycle and caching
 * - ProviderSelectorService: Selects appropriate provider for notifications
 * - SessionManagerService: Manages WPPConnect sessions
 */
@Global()
@Module({
  imports: [
    CacheModule.register(),
    forwardRef(() => ProvidersModule),
  ],
  providers: [
    ProviderFactory,
    ProviderRegistry,
    ProviderSelectorService,
    SessionManagerService,
  ],
  exports: [
    ProviderFactory,
    ProviderRegistry,
    ProviderSelectorService,
    SessionManagerService,
  ],
})
export class ProviderModule {}
