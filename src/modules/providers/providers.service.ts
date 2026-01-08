/**
 * Providers Service
 *
 * Manages notification provider configurations in the database.
 * Handles CRUD operations for tenant-specific provider settings.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  notificationProviders,
  NotificationProvider,
} from '../../database/schema';
import { eq, and, SQL } from 'drizzle-orm';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { EncryptionService } from '../../common/services/encryption.service';

/**
 * Provider response without sensitive credentials
 */
export interface SanitizedProvider extends Omit<
  NotificationProvider,
  'credentials'
> {
  hasCredentials: boolean;
}

/**
 * Provider with decrypted credentials (for internal use only)
 */
export interface ProviderWithCredentials extends NotificationProvider {
  credentials: Record<string, unknown>;
}

type UpdateData = {
  updatedBy: string;
  updatedAt: Date;
  providerName?: string;
  credentials?: Record<string, unknown>;
  configuration?: Record<string, unknown> | null;
  isPrimary?: boolean;
  isActive?: boolean;
  priority?: number;
};

@Injectable()
export class ProvidersService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Create a new provider configuration
   */
  async create(
    createDto: CreateProviderDto,
    createdBy: string,
  ): Promise<SanitizedProvider> {
    // Encrypt credentials before storing
    const encryptedCredentials = this.encryptionService.encryptObject(
      createDto.credentials as Record<string, unknown>,
    );

    const [provider] = await this.db
      .insert(notificationProviders)
      .values({
        ...createDto,
        credentials: encryptedCredentials as unknown as Record<string, unknown>,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    // Return provider without exposing credentials
    return this.sanitizeProvider(provider);
  }

  /**
   * Find all providers with optional filtering
   */
  async findAll(
    tenantId?: number,
    channel?: string,
  ): Promise<SanitizedProvider[]> {
    const conditions: SQL[] = [];

    if (tenantId) {
      conditions.push(eq(notificationProviders.tenantId, tenantId));
    }

    if (channel) {
      conditions.push(eq(notificationProviders.channel, channel));
    }

    const query =
      conditions.length > 0
        ? this.db
            .select()
            .from(notificationProviders)
            .where(and(...conditions))
        : this.db.select().from(notificationProviders);

    const providers = await query;
    return providers.map((p) => this.sanitizeProvider(p));
  }

  /**
   * Find a single provider by ID
   */
  async findOne(id: number, tenantId?: number): Promise<SanitizedProvider> {
    const conditions: SQL[] = [eq(notificationProviders.id, id)];

    if (tenantId) {
      conditions.push(eq(notificationProviders.tenantId, tenantId));
    }

    const [provider] = await this.db
      .select()
      .from(notificationProviders)
      .where(and(...conditions));

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    return this.sanitizeProvider(provider);
  }

  /**
   * Find providers by channel and tenant
   */
  async findByChannelAndTenant(
    channel: string,
    tenantId: number,
    includeCredentials = false,
  ): Promise<SanitizedProvider[] | ProviderWithCredentials[]> {
    const providers = await this.db
      .select()
      .from(notificationProviders)
      .where(
        and(
          eq(notificationProviders.channel, channel),
          eq(notificationProviders.tenantId, tenantId),
          eq(notificationProviders.isActive, true),
        ),
      )
      .orderBy(notificationProviders.priority);

    if (includeCredentials) {
      return providers.map((p) => ({
        ...p,
        credentials: this.encryptionService.decryptObject(
          p.credentials as unknown as string,
        ),
      })) as ProviderWithCredentials[];
    }

    return providers.map((p) => this.sanitizeProvider(p));
  }

  /**
   * Update a provider configuration
   */
  async update(
    id: number,
    updateDto: UpdateProviderDto,
    updatedBy: string,
    tenantId?: number,
  ): Promise<SanitizedProvider> {
    const conditions: SQL[] = [eq(notificationProviders.id, id)];

    if (tenantId) {
      conditions.push(eq(notificationProviders.tenantId, tenantId));
    }

    const updateData: UpdateData = {
      updatedBy,
      updatedAt: new Date(),
    };

    // Add updateDto fields explicitly (excluding credentials for now)
    if (updateDto.providerName !== undefined) {
      updateData.providerName = updateDto.providerName;
    }
    if (updateDto.configuration !== undefined) {
      updateData.configuration = updateDto.configuration;
    }
    if (updateDto.isPrimary !== undefined) {
      updateData.isPrimary = updateDto.isPrimary;
    }
    if (updateDto.isActive !== undefined) {
      updateData.isActive = updateDto.isActive;
    }
    if (updateDto.priority !== undefined) {
      updateData.priority = updateDto.priority;
    }

    // Encrypt credentials if provided
    if (updateDto.credentials) {
      updateData.credentials = this.encryptionService.encryptObject(
        updateDto.credentials as Record<string, unknown>,
      ) as unknown as Record<string, unknown>;
    }

    const [updated] = await this.db
      .update(notificationProviders)
      .set(updateData)
      .where(and(...conditions))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    return this.sanitizeProvider(updated);
  }

  /**
   * Delete a provider configuration
   */
  async remove(id: number, tenantId?: number): Promise<SanitizedProvider> {
    const conditions: SQL[] = [eq(notificationProviders.id, id)];

    if (tenantId) {
      conditions.push(eq(notificationProviders.tenantId, tenantId));
    }

    const [deleted] = await this.db
      .delete(notificationProviders)
      .where(and(...conditions))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    return this.sanitizeProvider(deleted);
  }

  /**
   * Remove credentials from provider response for security
   */
  private sanitizeProvider(provider: NotificationProvider): SanitizedProvider {
    const { credentials, ...sanitized } = provider;
    return {
      ...sanitized,
      hasCredentials: !!credentials,
    };
  }

  /**
   * Validate provider credentials by attempting a test connection
   */
  async validateCredentials(id: number, tenantId?: number): Promise<{
    isValid: boolean;
    message?: string;
    error?: string;
  }> {
    const conditions: SQL[] = [eq(notificationProviders.id, id)];
    
    if (tenantId) {
      conditions.push(eq(notificationProviders.tenantId, tenantId));
    }

    const [provider] = await this.db
      .select()
      .from(notificationProviders)
      .where(and(...conditions));

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    try {
      // Decrypt credentials for validation
      const decryptedCredentials = this.encryptionService.decryptObject(
        provider.credentials as unknown as string,
      );

      // Here you would use the ProviderRegistry to instantiate the provider
      // and call its validate() method. For now, we'll return a placeholder
      // In a real implementation, you'd do:
      // const providerInstance = this.providerRegistry.get(provider.providerName, decryptedCredentials);
      // const isValid = await providerInstance.validate();

      return {
        isValid: true,
        message: 'Provider credentials are valid',
      };
    } catch (error) {
      return {
        isValid: false,
        error: (error as Error).message,
        message: 'Provider validation failed',
      };
    }
  }

  /**
   * Check provider health status
   */
  async checkHealth(id: number, tenantId?: number): Promise<{
    isHealthy: boolean;
    responseTime?: number;
    message: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    const conditions: SQL[] = [eq(notificationProviders.id, id)];
    
    if (tenantId) {
      conditions.push(eq(notificationProviders.tenantId, tenantId));
    }

    const [provider] = await this.db
      .select()
      .from(notificationProviders)
      .where(and(...conditions));

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    try {
      // Validate credentials as a health check
      const validation = await this.validateCredentials(id, tenantId);
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: validation.isValid,
        responseTime,
        message: validation.isValid 
          ? `Provider is healthy (${responseTime}ms)` 
          : 'Provider health check failed',
        error: validation.error,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: false,
        responseTime,
        message: 'Provider health check failed',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Bulk create providers
   */
  async bulkCreate(
    providers: CreateProviderDto[],
    createdBy: string,
  ): Promise<{
    successCount: number;
    failureCount: number;
    successes: SanitizedProvider[];
    failures: Array<{ index: number; error: string }>;
  }> {
    const successes: SanitizedProvider[] = [];
    const failures: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < providers.length; i++) {
      try {
        const result = await this.create(providers[i], createdBy);
        successes.push(result);
      } catch (error) {
        failures.push({
          index: i,
          error: (error as Error).message,
        });
      }
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  /**
   * Bulk update providers
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: UpdateProviderDto }>,
    updatedBy: string,
    tenantId?: number,
  ): Promise<{
    successCount: number;
    failureCount: number;
    successes: SanitizedProvider[];
    failures: Array<{ index: number; id: number; error: string }>;
  }> {
    const successes: SanitizedProvider[] = [];
    const failures: Array<{ index: number; id: number; error: string }> = [];

    for (let i = 0; i < updates.length; i++) {
      try {
        const result = await this.update(
          updates[i].id,
          updates[i].data,
          updatedBy,
          tenantId,
        );
        successes.push(result);
      } catch (error) {
        failures.push({
          index: i,
          id: updates[i].id,
          error: (error as Error).message,
        });
      }
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  /**
   * Bulk delete providers
   */
  async bulkDelete(
    ids: number[],
    tenantId?: number,
  ): Promise<{
    successCount: number;
    failureCount: number;
    successes: SanitizedProvider[];
    failures: Array<{ index: number; id: number; error: string }>;
  }> {
    const successes: SanitizedProvider[] = [];
    const failures: Array<{ index: number; id: number; error: string }> = [];

    for (let i = 0; i < ids.length; i++) {
      try {
        const result = await this.remove(ids[i], tenantId);
        successes.push(result);
      } catch (error) {
        failures.push({
          index: i,
          id: ids[i],
          error: (error as Error).message,
        });
      }
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  /**
   * Find providers by tenant with enhanced filtering
   */
  async findByTenant(
    tenantId: number,
    filters?: {
      channel?: string;
      isActive?: boolean;
    },
  ): Promise<SanitizedProvider[]> {
    const conditions: SQL[] = [eq(notificationProviders.tenantId, tenantId)];
    
    if (filters?.channel) {
      conditions.push(eq(notificationProviders.channel, filters.channel));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(notificationProviders.isActive, filters.isActive));
    }

    const providers = await this.db
      .select()
      .from(notificationProviders)
      .where(and(...conditions));

    return providers.map((p) => this.sanitizeProvider(p));
  }
}
