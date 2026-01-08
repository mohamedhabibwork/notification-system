/**
 * Providers Service
 * 
 * Manages notification provider configurations in the database.
 * Handles CRUD operations for tenant-specific provider settings.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { notificationProviders, NotificationProvider } from '../../database/schema';
import { eq, and, SQL } from 'drizzle-orm';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { EncryptionService } from '../../common/services/encryption.service';

/**
 * Provider response without sensitive credentials
 */
export interface SanitizedProvider extends Omit<NotificationProvider, 'credentials'> {
  hasCredentials: boolean;
}

/**
 * Provider with decrypted credentials (for internal use only)
 */
export interface ProviderWithCredentials extends NotificationProvider {
  credentials: Record<string, unknown>;
}

type UpdateData = Partial<NotificationProvider> & {
  updatedBy: string;
  updatedAt: Date;
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
  async create(createDto: CreateProviderDto, createdBy: string): Promise<SanitizedProvider> {
    // Encrypt credentials before storing
    const encryptedCredentials = this.encryptionService.encryptObject(
      createDto.credentials,
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
  async findAll(tenantId?: number, channel?: string): Promise<SanitizedProvider[]> {
    const conditions: SQL[] = [];
    
    if (tenantId) {
      conditions.push(eq(notificationProviders.tenantId, tenantId));
    }
    
    if (channel) {
      conditions.push(eq(notificationProviders.channel, channel));
    }

    const query = conditions.length > 0
      ? this.db.select().from(notificationProviders).where(and(...conditions))
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
        credentials: this.encryptionService.decryptObject(p.credentials as unknown as string) as Record<string, unknown>,
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
      ...updateDto,
      updatedBy,
      updatedAt: new Date(),
    };

    // Encrypt credentials if provided
    if (updateDto.credentials) {
      updateData.credentials = this.encryptionService.encryptObject(
        updateDto.credentials,
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
}
