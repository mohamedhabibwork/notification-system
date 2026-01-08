import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { lookupTypes, lookups } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function seedLookups(connectionString: string) {
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('🌱 Seeding lookup values...');

  const lookupValues: Array<{
    type: string;
    lookupCode: string;
    lookupValue: string;
    orderIndex: number;
    metadata?: Record<string, any>;
  }> = [
    // Notification statuses
    {
      type: 'notification_status',
      lookupCode: 'pending',
      lookupValue: 'Pending',
      orderIndex: 1,
    },
    {
      type: 'notification_status',
      lookupCode: 'queued',
      lookupValue: 'Queued',
      orderIndex: 2,
    },
    {
      type: 'notification_status',
      lookupCode: 'sent',
      lookupValue: 'Sent',
      orderIndex: 3,
    },
    {
      type: 'notification_status',
      lookupCode: 'delivered',
      lookupValue: 'Delivered',
      orderIndex: 4,
    },
    {
      type: 'notification_status',
      lookupCode: 'failed',
      lookupValue: 'Failed',
      orderIndex: 5,
    },
    {
      type: 'notification_status',
      lookupCode: 'bounced',
      lookupValue: 'Bounced',
      orderIndex: 6,
    },
    {
      type: 'notification_status',
      lookupCode: 'read',
      lookupValue: 'Read',
      orderIndex: 7,
    },

    // Priorities
    {
      type: 'notification_priority',
      lookupCode: 'low',
      lookupValue: 'Low',
      orderIndex: 1,
    },
    {
      type: 'notification_priority',
      lookupCode: 'medium',
      lookupValue: 'Medium',
      orderIndex: 2,
    },
    {
      type: 'notification_priority',
      lookupCode: 'high',
      lookupValue: 'High',
      orderIndex: 3,
    },
    {
      type: 'notification_priority',
      lookupCode: 'urgent',
      lookupValue: 'Urgent',
      orderIndex: 4,
    },

    // Channels
    {
      type: 'notification_channel',
      lookupCode: 'email',
      lookupValue: 'Email',
      orderIndex: 1,
    },
    {
      type: 'notification_channel',
      lookupCode: 'sms',
      lookupValue: 'SMS',
      orderIndex: 2,
    },
    {
      type: 'notification_channel',
      lookupCode: 'fcm',
      lookupValue: 'Push Notification',
      orderIndex: 3,
    },
    {
      type: 'notification_channel',
      lookupCode: 'whatsapp',
      lookupValue: 'WhatsApp',
      orderIndex: 4,
    },
    {
      type: 'notification_channel',
      lookupCode: 'database',
      lookupValue: 'In-App',
      orderIndex: 5,
    },

    // Template types
    {
      type: 'template_type',
      lookupCode: 'transactional',
      lookupValue: 'Transactional',
      orderIndex: 1,
    },
    {
      type: 'template_type',
      lookupCode: 'marketing',
      lookupValue: 'Marketing',
      orderIndex: 2,
    },
    {
      type: 'template_type',
      lookupCode: 'system',
      lookupValue: 'System',
      orderIndex: 3,
    },
    {
      type: 'template_type',
      lookupCode: 'alert',
      lookupValue: 'Alert',
      orderIndex: 4,
    },

    // User types
    {
      type: 'user_type',
      lookupCode: 'admin',
      lookupValue: 'Administrator',
      orderIndex: 1,
    },
    {
      type: 'user_type',
      lookupCode: 'customer',
      lookupValue: 'Customer',
      orderIndex: 2,
    },
    {
      type: 'user_type',
      lookupCode: 'vendor',
      lookupValue: 'Vendor',
      orderIndex: 3,
    },
    {
      type: 'user_type',
      lookupCode: 'driver',
      lookupValue: 'Driver',
      orderIndex: 4,
    },
    {
      type: 'user_type',
      lookupCode: 'support',
      lookupValue: 'Support Agent',
      orderIndex: 5,
    },
    {
      type: 'user_type',
      lookupCode: 'guest',
      lookupValue: 'Guest',
      orderIndex: 6,
    },

    // Batch statuses
    {
      type: 'batch_status',
      lookupCode: 'pending',
      lookupValue: 'Pending',
      orderIndex: 1,
    },
    {
      type: 'batch_status',
      lookupCode: 'processing',
      lookupValue: 'Processing',
      orderIndex: 2,
    },
    {
      type: 'batch_status',
      lookupCode: 'completed',
      lookupValue: 'Completed',
      orderIndex: 3,
    },
    {
      type: 'batch_status',
      lookupCode: 'failed',
      lookupValue: 'Failed',
      orderIndex: 4,
    },
    {
      type: 'batch_status',
      lookupCode: 'cancelled',
      lookupValue: 'Cancelled',
      orderIndex: 5,
    },

    // Email Providers
    {
      type: 'email_provider',
      lookupCode: 'sendgrid',
      lookupValue: 'SendGrid',
      orderIndex: 1,
      metadata: { channel: 'email' },
    },
    {
      type: 'email_provider',
      lookupCode: 'ses',
      lookupValue: 'AWS SES',
      orderIndex: 2,
      metadata: { channel: 'email' },
    },
    {
      type: 'email_provider',
      lookupCode: 'mailgun',
      lookupValue: 'Mailgun',
      orderIndex: 3,
      metadata: { channel: 'email' },
    },

    // SMS Providers
    {
      type: 'sms_provider',
      lookupCode: 'twilio',
      lookupValue: 'Twilio',
      orderIndex: 1,
      metadata: { channel: 'sms' },
    },
    {
      type: 'sms_provider',
      lookupCode: 'sns',
      lookupValue: 'AWS SNS',
      orderIndex: 2,
      metadata: { channel: 'sms' },
    },

    // FCM Providers
    {
      type: 'fcm_provider',
      lookupCode: 'firebase',
      lookupValue: 'Firebase Cloud Messaging',
      orderIndex: 1,
      metadata: { channel: 'fcm' },
    },
    {
      type: 'fcm_provider',
      lookupCode: 'apn',
      lookupValue: 'Apple Push Notification',
      orderIndex: 2,
      metadata: { channel: 'fcm' },
    },

    // WhatsApp Providers
    {
      type: 'whatsapp_provider',
      lookupCode: 'whatsapp-business',
      lookupValue: 'WhatsApp Business API',
      orderIndex: 1,
      metadata: { channel: 'whatsapp', official: true },
    },
    {
      type: 'whatsapp_provider',
      lookupCode: 'wppconnect',
      lookupValue: 'WPPConnect',
      orderIndex: 2,
      metadata: { channel: 'whatsapp', unofficial: true },
    },

    // Database Provider
    {
      type: 'database_provider',
      lookupCode: 'database',
      lookupValue: 'Database Inbox',
      orderIndex: 1,
      metadata: { channel: 'database' },
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const lookup of lookupValues) {
    // Get lookupTypeId
    const [lookupType] = await db
      .select()
      .from(lookupTypes)
      .where(eq(lookupTypes.typeName, lookup.type))
      .limit(1);

    if (!lookupType) {
      console.log(`  ⚠ Lookup type not found: ${lookup.type}`);
      continue;
    }

    // Check if lookup exists
    const [existing] = await db
      .select()
      .from(lookups)
      .where(
        and(
          eq(lookups.lookupTypeId, lookupType.id),
          eq(lookups.code, lookup.lookupCode),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(lookups).values({
        lookupTypeId: lookupType.id,
        code: lookup.lookupCode,
        displayName: lookup.lookupValue,
        sortOrder: lookup.orderIndex,
        isActive: true,
        metadata: lookup.metadata,
      });
      console.log(`  ✓ Created lookup: ${lookup.type}.${lookup.lookupCode}`);
      created++;
    } else {
      skipped++;
    }
  }

  await client.end();
  console.log(
    `✅ Lookup values seeded: ${created} created, ${skipped} skipped\n`,
  );
}
