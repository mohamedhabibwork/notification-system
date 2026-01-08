import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants } from '../schema';
import { eq } from 'drizzle-orm';

export async function seedTenants(connectionString: string) {
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('🌱 Seeding tenants...');

  const defaultTenants = [
    {
      name: 'Development Tenant',
      domain: 'dev',
      settings: {
        timezone: 'UTC',
        defaultLanguage: 'en',
        features: ['email', 'sms', 'fcm', 'whatsapp', 'database'],
      },
      isActive: true,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const tenant of defaultTenants) {
    const [existing] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.domain, tenant.domain))
      .limit(1);

    if (!existing) {
      await db.insert(tenants).values(tenant as any);
      console.log(`  ✓ Created tenant: ${tenant.name}`);
      created++;
    } else {
      console.log(`  ⊙ Skipped existing: ${tenant.name}`);
      skipped++;
    }
  }

  await client.end();
  console.log(`✅ Tenants seeded: ${created} created, ${skipped} skipped\n`);
}
