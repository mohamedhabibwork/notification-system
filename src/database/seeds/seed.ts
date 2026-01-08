import { config } from 'dotenv';
import { seedLookupTypes } from './seed-lookup-types';
import { seedLookups } from './seed-lookups';
import { seedTenants } from './seed-tenants';
import { seedTemplates } from './seed-templates';

// Load environment variables
config();

async function runSeeders() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🌱 Starting database seeding...\n');

  try {
    // Run seeders in order
    await seedLookupTypes(connectionString);
    await seedLookups(connectionString);
    await seedTenants(connectionString);
    await seedTemplates(connectionString);

    console.log('✅ All seeders completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

runSeeders();
