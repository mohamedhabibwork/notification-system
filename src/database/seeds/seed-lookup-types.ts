import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { lookupTypes } from '../schema';
import { eq } from 'drizzle-orm';

export async function seedLookupTypes(connectionString: string) {
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('🌱 Seeding lookup types...');

  const types = [
    {
      typeName: 'notification_status',
      description: 'Notification delivery status values',
    },
    {
      typeName: 'notification_priority',
      description: 'Notification priority levels',
    },
    {
      typeName: 'notification_channel',
      description: 'Available notification channels',
    },
    {
      typeName: 'template_type',
      description: 'Template categorization types',
    },
    {
      typeName: 'user_type',
      description: 'User role types in the system',
    },
    {
      typeName: 'batch_status',
      description: 'Batch job status values',
    },
    {
      typeName: 'email_provider',
      description: 'Available email provider implementations',
    },
    {
      typeName: 'sms_provider',
      description: 'Available SMS provider implementations',
    },
    {
      typeName: 'fcm_provider',
      description: 'Available push notification provider implementations',
    },
    {
      typeName: 'whatsapp_provider',
      description: 'Available WhatsApp provider implementations',
    },
    {
      typeName: 'database_provider',
      description: 'Available database notification provider implementations',
    },
    {
      typeName: 'chat_provider',
      description: 'Available chat/collaboration platform providers',
    },
    {
      typeName: 'messenger_provider',
      description: 'Available instant messenger providers',
    },
    {
      typeName: 'push_provider',
      description: 'Available push notification providers',
    },
    {
      typeName: 'alert_provider',
      description: 'Available incident/alert management providers',
    },
    {
      typeName: 'webhook_provider',
      description: 'Generic webhook providers',
    },
    {
      typeName: 'iot_provider',
      description: 'IoT and smart home providers',
    },
    {
      typeName: 'aggregator_provider',
      description: 'Multi-service aggregator providers',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const type of types) {
    const [existing] = await db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.typeName, type.typeName))
      .limit(1);

    if (!existing) {
      await db.insert(lookupTypes).values(type);
      console.log(`  ✓ Created lookup type: ${type.typeName}`);
      created++;
    } else {
      console.log(`  ⊙ Skipped existing: ${type.typeName}`);
      skipped++;
    }
  }

  await client.end();
  console.log(
    `✅ Lookup types seeded: ${created} created, ${skipped} skipped\n`,
  );
}
