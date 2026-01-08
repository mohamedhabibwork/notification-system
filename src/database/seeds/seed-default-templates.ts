import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import {
  notificationTemplates,
  templateCategories,
} from '../schema';
import { eq, and } from 'drizzle-orm';
import {
  defaultTemplates,
  defaultCategories,
} from './default-templates';

dotenv.config();

const client = postgres(process.env.DATABASE_URL || '');
const db = drizzle(client);

export async function seedDefaultTemplatesForTenant(
  tenantId: number,
  createdBy: string = 'system',
): Promise<void> {
  console.log(`Seeding default templates for tenant ${tenantId}...`);

  try {
    // Create default categories first
    const categoryMap = new Map<string, number>();

    for (const category of defaultCategories) {
      const [existing] = await db
        .select()
        .from(templateCategories)
        .where(
          and(
            eq(templateCategories.tenantId, tenantId),
            eq(templateCategories.code, category.code),
          ),
        );

      if (!existing) {
        const [created] = await db
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
        console.log(`  ✓ Created category: ${category.name}`);
      } else {
        categoryMap.set(category.code, existing.id);
        console.log(`  → Category already exists: ${category.name}`);
      }
    }

    // Create default templates
    let createdCount = 0;
    let skippedCount = 0;

    for (const template of defaultTemplates) {
      const [existing] = await db
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

        await db.insert(notificationTemplates).values({
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

        createdCount++;
        console.log(`  ✓ Created template: ${template.name}`);
      } else {
        skippedCount++;
        console.log(`  → Template already exists: ${template.name}`);
      }
    }

    console.log(
      `\nCompleted! Created ${createdCount} templates, skipped ${skippedCount} existing.`,
    );
  } catch (error) {
    console.error('Error seeding default templates:', error);
    throw error;
  }
}

// Run directly if executed as a script
if (require.main === module) {
  const tenantId = parseInt(process.argv[2]);
  
  if (!tenantId) {
    console.error('Usage: ts-node seed-default-templates.ts <tenantId>');
    process.exit(1);
  }

  seedDefaultTemplatesForTenant(tenantId)
    .then(() => {
      console.log('Default templates seeded successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed default templates:', error);
      process.exit(1);
    });
}
