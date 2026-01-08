import { Module, Global, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { ProviderSelectorService } from './provider-selector.service';
import { ProviderFactory } from './factory/provider.factory';
import { ProviderRegistry } from './registry/provider.registry';
import { SessionManagerService } from './implementations/whatsapp/session-manager.service';
import { WebSocketMessageHandlerService } from './implementations/websocket/services/message-handler.service';
import { ProvidersModule } from '../../modules/providers/providers.module';
import { GatewayModule } from '../../gateways/gateway.module';
import { EventsModule } from '../../modules/events/events.module';

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
    HttpModule,
    forwardRef(() => ProvidersModule),
    forwardRef(() => GatewayModule),
    forwardRef(() => EventsModule),
  ],
  providers: [
    ProviderFactory,
    ProviderRegistry,
    ProviderSelectorService,
    SessionManagerService,
    WebSocketMessageHandlerService,
  ],
  exports: [
    ProviderFactory,
    ProviderRegistry,
    ProviderSelectorService,
    SessionManagerService,
    WebSocketMessageHandlerService,
  ],
})
export class ProviderModule {}
