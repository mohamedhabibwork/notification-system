import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  tenants,
  templateCategories,
  notificationTemplates,
} from '../../database/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import {
  defaultTemplates,
  defaultCategories,
} from '../../database/seeds/default-templates';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async create(createDto: CreateTenantDto, createdBy: string) {
    const [tenant] = await this.db
      .insert(tenants)
      .values({
        ...createDto,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    // Seed default templates and data for the new tenant
    try {
      await this.seedDefaultData(tenant.id, createdBy);
      this.logger.log(
        `Default data seeded successfully for tenant ${tenant.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to seed default data for tenant ${tenant.id}: ${error.message}`,
      );
      // Don't fail tenant creation if seeding fails
    }

    return tenant;
  }

  private async seedDefaultData(
    tenantId: number,
    createdBy: string,
  ): Promise<void> {
    // Seed default categories
    await this.seedDefaultCategories(tenantId, createdBy);

    // Seed default templates
    await this.seedDefaultTemplates(tenantId, createdBy);

    // Seed default preferences (if needed)
    // await this.seedDefaultPreferences(tenantId, createdBy);
  }

  private async seedDefaultCategories(
    tenantId: number,
    createdBy: string,
  ): Promise<Map<string, number>> {
    const categoryMap = new Map<string, number>();

    for (const category of defaultCategories) {
      const [existing] = await this.db
        .select()
        .from(templateCategories)
        .where(
          and(
            eq(templateCategories.tenantId, tenantId),
            eq(templateCategories.code, category.code),
          ),
        );

      if (!existing) {
        const [created] = await this.db
          .insert(templateCategories)
          .values({
            tenantId,
            name: category.name,
            code: category.code,
            icon: category.icon,
            color: category.color,
            isActive: true,
            sortOrder: defaultCategories.indexOf(category),
            createdBy,
            updatedBy: createdBy,
          })
          .returning();

        categoryMap.set(category.code, created.id);
      } else {
        categoryMap.set(category.code, existing.id);
      }
    }

    return categoryMap;
  }

  private async seedDefaultTemplates(
    tenantId: number,
    createdBy: string,
  ): Promise<void> {
    const categoryMap = await this.seedDefaultCategories(tenantId, createdBy);

    for (const template of defaultTemplates) {
      const [existing] = await this.db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.tenantId, tenantId),
            eq(notificationTemplates.templateCode, template.templateCode),
          ),
        );

      if (!existing) {
        const categoryId = template.categoryCode
          ? categoryMap.get(template.categoryCode)
          : undefined;

        await this.db.insert(notificationTemplates).values({
          tenantId,
          name: template.name,
          templateCode: template.templateCode,
          channel: template.channel,
          subject: template.subject,
          bodyTemplate: template.bodyTemplate,
          htmlTemplate: template.htmlTemplate,
          variables: template.variables,
          language: template.language,
          ...(categoryId && { categoryId }),
          isActive: true,
          version: 1,
          createdBy,
          updatedBy: createdBy,
        });
      }
    }
  }

  async findAll() {
    return await this.db
      .select()
      .from(tenants)
      .where(isNull(tenants.deletedAt));
  }

  async findOne(id: number) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id));

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findByUuid(uuid: string) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.uuid, uuid));

    if (!tenant) {
      throw new NotFoundException(`Tenant with UUID ${uuid} not found`);
    }

    return tenant;
  }

  async update(id: number, updateDto: UpdateTenantDto, updatedBy: string) {
    const [updated] = await this.db
      .update(tenants)
      .set({
        ...updateDto,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: number, deletedBy: string) {
    const [deleted] = await this.db
      .update(tenants)
      .set({
        deletedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(eq(tenants.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return deleted;
  }
}
