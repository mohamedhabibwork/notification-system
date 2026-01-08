import {
  Injectable,
  Inject,
  NotFoundException,
  Inject as CacheInject,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { lookups, lookupTypes } from '../../database/schema';
import { eq, and, or, ilike, sql, count } from 'drizzle-orm';
import {
  CreateLookupDto,
  UpdateLookupDto,
  BulkCreateLookupDto,
  BulkUpdateLookupDto,
  SearchLookupDto,
} from './dto/lookup.dto';
import {
  CreateLookupTypeDto,
  UpdateLookupTypeDto,
} from './dto/lookup-type.dto';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class LookupsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    @CacheInject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ========== LOOKUP METHODS ==========

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

  async findAll(searchDto?: SearchLookupDto) {
    const page = searchDto?.page || 1;
    const limit = searchDto?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (searchDto?.lookupTypeId) {
      conditions.push(eq(lookups.lookupTypeId, searchDto.lookupTypeId));
    }

    if (searchDto?.isActive !== undefined) {
      conditions.push(eq(lookups.isActive, searchDto.isActive));
    }

    if (searchDto?.search) {
      conditions.push(
        or(
          ilike(lookups.code, `%${searchDto.search}%`),
          ilike(lookups.displayName, `%${searchDto.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(lookups)
      .where(whereClause);

    // Get paginated results
    const results = await this.db
      .select({
        id: lookups.id,
        uuid: lookups.uuid,
        lookupTypeId: lookups.lookupTypeId,
        code: lookups.code,
        displayName: lookups.displayName,
        description: lookups.description,
        sortOrder: lookups.sortOrder,
        isActive: lookups.isActive,
        metadata: lookups.metadata,
        createdAt: lookups.createdAt,
        createdBy: lookups.createdBy,
        updatedAt: lookups.updatedAt,
        updatedBy: lookups.updatedBy,
      })
      .from(lookups)
      .where(whereClause)
      .orderBy(lookups.sortOrder, lookups.code)
      .limit(limit)
      .offset(offset);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  async findById(id: number) {
    const [lookup] = await this.db
      .select()
      .from(lookups)
      .where(eq(lookups.id, id));

    if (!lookup) {
      throw new NotFoundException(`Lookup with ID ${id} not found`);
    }

    return lookup;
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

  async delete(id: number, userId: string) {
    const [deleted] = await this.db
      .update(lookups)
      .set({
        isActive: false,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(lookups.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Lookup with ID ${id} not found`);
    }

    // Invalidate cache
    await this.invalidateCache(deleted.lookupTypeId);

    return { message: 'Lookup deleted successfully', lookup: deleted };
  }

  async bulkCreate(bulkDto: BulkCreateLookupDto, createdBy: string) {
    const results = [];
    const errors = [];

    for (const lookupDto of bulkDto.lookups) {
      try {
        const [lookup] = await this.db
          .insert(lookups)
          .values({
            ...lookupDto,
            createdBy,
            updatedBy: createdBy,
          })
          .returning();
        results.push(lookup);

        // Invalidate cache
        await this.invalidateCache(lookupDto.lookupTypeId);
      } catch (error) {
        errors.push({
          lookup: lookupDto,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async bulkUpdate(bulkDto: BulkUpdateLookupDto, updatedBy: string) {
    const results = [];
    const errors = [];

    for (const updateItem of bulkDto.lookups) {
      try {
        const [updated] = await this.db
          .update(lookups)
          .set({
            ...updateItem,
            id: undefined, // Remove id from set clause
            updatedBy,
            updatedAt: new Date(),
          })
          .where(eq(lookups.id, updateItem.id))
          .returning();

        if (updated) {
          results.push(updated);
          await this.invalidateCache(updated.lookupTypeId);
        } else {
          errors.push({
            id: updateItem.id,
            error: 'Lookup not found',
          });
        }
      } catch (error) {
        errors.push({
          id: updateItem.id,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async validateCode(typeName: string, code: string) {
    const [type] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.typeName, typeName));

    if (!type) {
      throw new NotFoundException(`Lookup type ${typeName} not found`);
    }

    const [lookup] = await this.db
      .select()
      .from(lookups)
      .where(
        and(
          eq(lookups.lookupTypeId, type.id),
          eq(lookups.code, code),
          eq(lookups.isActive, true),
        ),
      );

    return {
      exists: !!lookup,
      lookup: lookup || null,
    };
  }

  // ========== LOOKUP TYPE METHODS ==========

  async findAllTypes() {
    const cacheKey = 'lookups:all-types';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.db
      .select()
      .from(lookupTypes)
      .orderBy(lookupTypes.typeName);

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, results, 3600 * 1000);

    return results;
  }

  async findTypeById(id: number) {
    const [type] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.id, id));

    if (!type) {
      throw new NotFoundException(`Lookup type with ID ${id} not found`);
    }

    return type;
  }

  async findTypeWithValues(typeName: string) {
    const cacheKey = `lookups:type-with-values:${typeName}`;
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

    const values = await this.db
      .select()
      .from(lookups)
      .where(and(eq(lookups.lookupTypeId, type.id), eq(lookups.isActive, true)))
      .orderBy(lookups.sortOrder);

    const result = {
      ...type,
      values,
    };

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, result, 3600 * 1000);

    return result;
  }

  async getAllTypesWithValues() {
    const cacheKey = 'lookups:all-types-with-values';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const types = await this.db
      .select()
      .from(lookupTypes)
      .orderBy(lookupTypes.typeName);

    const result = await Promise.all(
      types.map(async (type) => {
        const values = await this.db
          .select()
          .from(lookups)
          .where(
            and(eq(lookups.lookupTypeId, type.id), eq(lookups.isActive, true)),
          )
          .orderBy(lookups.sortOrder);

        return {
          ...type,
          values,
        };
      }),
    );

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, result, 3600 * 1000);

    return result;
  }

  async createType(createDto: CreateLookupTypeDto, createdBy: string) {
    // Check if type already exists
    const [existing] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.typeName, createDto.typeName));

    if (existing) {
      throw new ConflictException(
        `Lookup type with name ${createDto.typeName} already exists`,
      );
    }

    const [type] = await this.db
      .insert(lookupTypes)
      .values({
        ...createDto,
        createdBy,
      })
      .returning();

    // Invalidate all types cache
    await this.cacheManager.del('lookups:all-types');
    await this.cacheManager.del('lookups:all-types-with-values');

    return type;
  }

  async updateType(id: number, updateDto: UpdateLookupTypeDto) {
    const [updated] = await this.db
      .update(lookupTypes)
      .set(updateDto)
      .where(eq(lookupTypes.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Lookup type with ID ${id} not found`);
    }

    // Invalidate caches
    await this.cacheManager.del('lookups:all-types');
    await this.cacheManager.del('lookups:all-types-with-values');
    await this.cacheManager.del(`lookups:type:${updated.typeName}`);
    await this.cacheManager.del(`lookups:type-with-values:${updated.typeName}`);

    return updated;
  }

  async deleteType(id: number) {
    // Check if any lookups reference this type
    const [existingLookup] = await this.db
      .select()
      .from(lookups)
      .where(eq(lookups.lookupTypeId, id))
      .limit(1);

    if (existingLookup) {
      throw new BadRequestException(
        'Cannot delete lookup type that has associated lookup values',
      );
    }

    const [deleted] = await this.db
      .delete(lookupTypes)
      .where(eq(lookupTypes.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Lookup type with ID ${id} not found`);
    }

    // Invalidate caches
    await this.cacheManager.del('lookups:all-types');
    await this.cacheManager.del('lookups:all-types-with-values');
    await this.cacheManager.del(`lookups:type:${deleted.typeName}`);
    await this.cacheManager.del(`lookups:type-with-values:${deleted.typeName}`);

    return { message: 'Lookup type deleted successfully', type: deleted };
  }

  private async invalidateCache(lookupTypeId: number) {
    const [type] = await this.db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.id, lookupTypeId));

    if (type) {
      await this.cacheManager.del(`lookups:type:${type.typeName}`);
      await this.cacheManager.del(`lookups:type-with-values:${type.typeName}`);
      await this.cacheManager.del('lookups:all-types-with-values');
    }
  }
}
