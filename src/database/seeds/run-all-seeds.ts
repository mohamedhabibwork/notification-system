#!/usr/bin/env ts-node

/**
 * Master Seeding Script
 * 
 * Runs all seeding operations in the correct order:
 * 1. Environment validation
 * 2. Tenants
 * 3. Categories
 * 4. Templates
 * 5. Lookup types and lookups
 * 6. Users (via Keycloak, optional)
 * 7. Service Accounts (via Keycloak, optional)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { eq, and } from 'drizzle-orm';
import {
  tenants,
  templateCategories,
  notificationTemplates,
  notificationProviders,
  type Tenant,
} from '../schema';
import {
  defaultTemplates,
  defaultCategories,
} from './default-templates';
import {
  allProviders,
} from './seed-providers';
import {
  defaultTenants,
} from './seed-users';
import { validateOrExit, printValidationResults, validateEnvironment } from './utils/env-validator';
import { seedSystemTemplates } from './seed-system-templates';

dotenv.config();

async function main() {
  console.log('🌱 Master Seeding Started\n');
  
  // 1. Validate environment
  console.log('🔍 Validating environment...');
  validateOrExit();

  // Connect to database
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    // ============================================================================
    // 2. SEED TENANTS
    // ============================================================================
    console.log('\n📋 Seeding tenants...');
    const createdTenants: Tenant[] = [];

    for (const tenantData of defaultTenants) {
      const [tenant] = await db
        .insert(tenants)
        .values({
          name: tenantData.name,
          domain: tenantData.domain,
          isActive: tenantData.isActive,
          settings: tenantData.settings || {},
          createdBy: 'system',
          updatedBy: 'system',
        })
        .onConflictDoNothing()
        .returning();

      if (tenant) {
        createdTenants.push(tenant);
        console.log(`  ✅ Created tenant: ${tenant.name}`);
      }
    }

    // ============================================================================
    // 3. SEED CATEGORIES (for each tenant)
    // ============================================================================
    console.log('\n📁 Seeding template categories...');
    
    for (const tenant of createdTenants) {
      for (const category of defaultCategories) {
        const [created] = await db
          .insert(templateCategories)
          .values({
            tenantId: tenant.id,
            name: category.name,
            code: category.code,
            description: category.name,
            icon: category.icon,
            color: category.color,
            isActive: true,
            createdBy: 'system',
            updatedBy: 'system',
          })
          .onConflictDoNothing()
          .returning();

        if (created) {
          console.log(`  ✅ Created category: ${category.name} for ${tenant.name}`);
        }
      }
    }

    // ============================================================================
    // 4. SEED SYSTEM TEMPLATES (tenantId = 0)
    // ============================================================================
    console.log('\n🌐 Seeding system templates (global defaults)...');
    await seedSystemTemplates(db);

    // ============================================================================
    // 5. SEED TENANT TEMPLATES (optional tenant-specific overrides)
    // ============================================================================
    console.log('\n📧 Seeding tenant-specific templates...');

    for (const tenant of createdTenants) {
      // Get categories for this tenant
      const categories = await db
        .select()
        .from(templateCategories)
        .where(eq(templateCategories.tenantId, tenant.id));

      const categoryMap = new Map(
        categories.map((c) => [c.code, c.id]),
      );

      for (const template of defaultTemplates) {
        const categoryId = template.categoryCode
          ? categoryMap.get(template.categoryCode)
          : undefined;

        const [created] = await db
          .insert(notificationTemplates)
          .values({
            tenantId: tenant.id,
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
            createdBy: 'system',
            updatedBy: 'system',
          })
          .onConflictDoNothing()
          .returning();

        if (created) {
          console.log(`  ✅ Created template: ${template.name} for ${tenant.name}`);
        }
      }
    }

    // ============================================================================
    // 5. SKIP PROVIDERS - Manual configuration only
    // ============================================================================
    console.log('\n🔌 Skipping provider seeding...');
    console.log('  ℹ️  Providers should be configured manually per tenant via API');
    console.log('  ℹ️  System will fall back to environment config if no tenant providers exist');

    // ============================================================================
    // 6. KEYCLOAK SEEDING (Optional)
    // ============================================================================
    if (process.env.SEED_KEYCLOAK === 'true') {
      console.log('\n👥 Keycloak seeding...');
      console.log('  ⚠️  Keycloak seeding not yet implemented');
      console.log('  ℹ️  Please use the Keycloak admin console to create users');
      // TODO: Implement Keycloak seeding service
      // await seedKeycloakRealm();
      // await seedKeycloakUsers(createdTenants);
      // await seedServiceAccounts();
    } else {
      console.log('\n👥 Skipping Keycloak seeding (SEED_KEYCLOAK=false)');
    }

    // ============================================================================
    // 7. SUMMARY
    // ============================================================================
    console.log('\n📊 Seeding Summary:');
    console.log(`  ✅ Tenants: ${createdTenants.length}`);
    console.log(`  ✅ Categories: ${defaultCategories.length} per tenant`);
    console.log(`  ✅ Templates: ${defaultTemplates.length} per tenant`);
    console.log('  ℹ️  Providers: Manual configuration via API (uses env fallback)');
    console.log('\n✨ Database seeding complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Configure providers via API: POST /api/providers');
    console.log('  2. Or rely on environment config fallback');
    console.log('  3. Start the application: npm run start:dev');
    console.log('  4. Access API: http://localhost:3000/api');
    console.log('  5. Access Swagger docs: http://localhost:3000/api/docs\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
