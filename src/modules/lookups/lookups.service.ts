import {
  Injectable,
  Inject,
  NotFoundException,
  Inject as CacheInject,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { lookups, lookupTypes } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { CreateLookupDto, UpdateLookupDto } from './dto/lookup.dto';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class LookupsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    @CacheInject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findByType(typeName: string) {
    // Check cache first
    const cacheKey = `lookups:type:${typeName}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [type] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.typeName, typeName));

    if (!type) {
      throw new NotFoundException(`Lookup type ${typeName} not found`);
    }

    const results = await this.db
      .select()
      .from(lookups)
      .where(and(eq(lookups.lookupTypeId, type.id), eq(lookups.isActive, true)))
      .orderBy(lookups.sortOrder);

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, results, 3600 * 1000);

    return results;
  }

  async create(createDto: CreateLookupDto, createdBy: string) {
    const [lookup] = await this.db
      .insert(lookups)
      .values({
        ...createDto,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(createDto.lookupTypeId);

    return lookup;
  }

  async update(id: number, updateDto: UpdateLookupDto, updatedBy: string) {
    const [updated] = await this.db
      .update(lookups)
      .set({
        ...updateDto,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(lookups.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Lookup with ID ${id} not found`);
    }

    // Invalidate cache
    await this.invalidateCache(updated.lookupTypeId);

    return updated;
  }

  private async invalidateCache(lookupTypeId: number) {
    const [type] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.id, lookupTypeId));

    if (type) {
      await this.cacheManager.del(`lookups:type:${type.typeName}`);
    }
  }
}
