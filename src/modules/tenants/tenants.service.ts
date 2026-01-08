import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  tenants,
  templateCategories,
  notificationTemplates,
  notificationProviders,
} from '../../database/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import {
  defaultTemplates,
  defaultCategories,
} from '../../database/seeds/default-templates';
import { EncryptionService } from '../../common/services/encryption.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly encryptionService: EncryptionService,
  ) {}

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
        `Failed to seed default data for tenant ${tenant.id}: ${(error as Error).message}`,
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

    // Seed default providers
    await this.seedDefaultProviders(tenantId, createdBy);

    // Seed default preferences
    await this.seedDefaultPreferences(tenantId, createdBy);
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

  private async seedDefaultProviders(
    tenantId: number,
    createdBy: string,
  ): Promise<void> {
    const defaultProviders = [
      // Email Providers
      {
        channel: 'email',
        providerName: 'sendgrid',
        isPrimary: true,
        isActive: false,
        priority: 1,
        credentials: { apiKey: null, fromEmail: null, fromName: null },
        configuration: {
          requiredCredentials: ['apiKey', 'fromEmail', 'fromName'],
          description: 'SendGrid email delivery service',
        },
      },
      {
        channel: 'email',
        providerName: 'aws-ses',
        isPrimary: false,
        isActive: false,
        priority: 2,
        credentials: {
          accessKeyId: null,
          secretAccessKey: null,
          region: 'us-east-1',
        },
        configuration: {
          requiredCredentials: ['accessKeyId', 'secretAccessKey', 'region'],
          description: 'Amazon Simple Email Service',
        },
      },
      {
        channel: 'email',
        providerName: 'mailgun',
        isPrimary: false,
        isActive: false,
        priority: 3,
        credentials: { apiKey: null, domain: null },
        configuration: {
          requiredCredentials: ['apiKey', 'domain'],
          description: 'Mailgun email delivery platform',
        },
      },
      // SMS Providers
      {
        channel: 'sms',
        providerName: 'twilio',
        isPrimary: true,
        isActive: false,
        priority: 1,
        credentials: {
          accountSid: null,
          authToken: null,
          fromNumber: null,
        },
        configuration: {
          requiredCredentials: ['accountSid', 'authToken', 'fromNumber'],
          description: 'Twilio SMS delivery service',
        },
      },
      {
        channel: 'sms',
        providerName: 'aws-sns',
        isPrimary: false,
        isActive: false,
        priority: 2,
        credentials: {
          accessKeyId: null,
          secretAccessKey: null,
          region: 'us-east-1',
        },
        configuration: {
          requiredCredentials: ['accessKeyId', 'secretAccessKey', 'region'],
          description: 'Amazon Simple Notification Service',
        },
      },
      // FCM Providers
      {
        channel: 'fcm',
        providerName: 'firebase',
        isPrimary: true,
        isActive: false,
        priority: 1,
        credentials: {
          projectId: null,
          privateKey: null,
          clientEmail: null,
        },
        configuration: {
          requiredCredentials: ['projectId', 'privateKey', 'clientEmail'],
          description: 'Firebase Cloud Messaging (FCM) for Android/iOS/Web',
        },
      },
      {
        channel: 'fcm',
        providerName: 'apple-apn',
        isPrimary: false,
        isActive: false,
        priority: 2,
        credentials: {
          keyId: null,
          teamId: null,
          privateKey: null,
        },
        configuration: {
          requiredCredentials: ['keyId', 'teamId', 'privateKey'],
          description: 'Apple Push Notification Service (APNs)',
        },
      },
      {
        channel: 'fcm',
        providerName: 'huawei-pushkit',
        isPrimary: false,
        isActive: false,
        priority: 3,
        credentials: {
          appId: null,
          appSecret: null,
          clientId: null,
          clientSecret: null,
        },
        configuration: {
          requiredCredentials: [
            'appId',
            'appSecret',
            'clientId',
            'clientSecret',
          ],
          description:
            'Huawei Push Kit for Android devices (Huawei Mobile Services)',
        },
      },
      // WhatsApp Providers
      {
        channel: 'whatsapp',
        providerName: 'whatsapp-business',
        isPrimary: true,
        isActive: false,
        priority: 1,
        credentials: {
          businessAccountId: null,
          phoneNumberId: null,
          accessToken: null,
        },
        configuration: {
          requiredCredentials: [
            'businessAccountId',
            'phoneNumberId',
            'accessToken',
          ],
          description: 'WhatsApp Business API for messaging',
        },
      },
      {
        channel: 'whatsapp',
        providerName: 'wppconnect',
        isPrimary: false,
        isActive: false,
        priority: 2,
        credentials: {
          sessionName: null,
          secretKey: null,
        },
        configuration: {
          requiredCredentials: ['sessionName', 'secretKey'],
          description:
            'WPPConnect WhatsApp Web client for multi-tenant messaging',
        },
      },
      // Database Provider - Active by default, no external credentials needed
      {
        channel: 'database',
        providerName: 'database-inbox',
        isPrimary: true,
        isActive: true,
        priority: 1,
        credentials: {},
        configuration: {
          tableName: 'user_notifications',
          retentionDays: 90,
          description: 'Store notifications in database for in-app inbox',
        },
      },
    ];

    for (const provider of defaultProviders) {
      const [existing] = await this.db
        .select()
        .from(notificationProviders)
        .where(
          and(
            eq(notificationProviders.tenantId, tenantId),
            eq(notificationProviders.channel, provider.channel),
            eq(notificationProviders.providerName, provider.providerName),
          ),
        );

      if (!existing) {
        // Encrypt credentials (even if empty/null)
        const encryptedCredentials = this.encryptionService.encryptObject(
          provider.credentials,
        );

        await this.db.insert(notificationProviders).values({
          tenantId,
          channel: provider.channel,
          providerName: provider.providerName,
          credentials: encryptedCredentials as unknown as Record<
            string,
            unknown
          >,
          configuration: provider.configuration,
          isPrimary: provider.isPrimary,
          isActive: provider.isActive,
          priority: provider.priority,
          createdBy,
          updatedBy: createdBy,
        });

        this.logger.log(
          `Created ${provider.channel} provider: ${provider.providerName} for tenant ${tenantId}`,
        );
      }
    }
  }

  private async seedDefaultPreferences(
    tenantId: number,
    createdBy: string,
  ): Promise<void> {
    // Update tenant with default notification preferences/settings
    const defaultSettings = {
      notifications: {
        // Default channels enabled for all users
        defaultChannelsEnabled: {
          email: true,
          sms: true,
          fcm: true,
          whatsapp: true,
          database: true,
        },
        // Default quiet hours (no notifications during these times)
        quietHours: {
          enabled: false,
          startTime: '22:00', // 10 PM
          endTime: '08:00', // 8 AM
          timezone: 'UTC',
        },
        // Rate limiting defaults
        rateLimits: {
          email: {
            maxPerHour: 100,
            maxPerDay: 500,
          },
          sms: {
            maxPerHour: 20,
            maxPerDay: 100,
          },
          fcm: {
            maxPerHour: 200,
            maxPerDay: 1000,
          },
          whatsapp: {
            maxPerHour: 50,
            maxPerDay: 200,
          },
        },
        // Notification retention
        retention: {
          database: {
            days: 90,
            autoDelete: true,
          },
          logs: {
            days: 30,
            autoDelete: true,
          },
        },
        // Delivery preferences
        delivery: {
          retryAttempts: 3,
          retryDelaySeconds: [60, 300, 900], // 1min, 5min, 15min
          batchSize: 100,
          priorityProcessing: true,
        },
        // Email specific defaults
        emailDefaults: {
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true,
          replyTo: null,
        },
        // SMS specific defaults
        smsDefaults: {
          maxLength: 160,
          unicode: true,
          shortLinks: true,
        },
        // FCM specific defaults
        fcmDefaults: {
          priority: 'high',
          timeToLive: 2419200, // 28 days in seconds
          sound: 'default',
          badge: true,
        },
        // WhatsApp specific defaults
        whatsappDefaults: {
          mediaSupport: true,
          templateRequired: false,
        },
      },
      // Timezone and locale
      timezone: 'UTC',
      defaultLanguage: 'en',
      // Feature flags
      features: {
        bulkNotifications: true,
        scheduledNotifications: true,
        webhooks: true,
        analytics: true,
        apiAccess: true,
      },
    };

    // Get existing tenant settings
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (tenant) {
      // Merge with existing settings (don't overwrite if they exist)
      const mergedSettings = {
        ...defaultSettings,
        ...(tenant.settings as Record<string, unknown>),
      };

      await this.db
        .update(tenants)
        .set({
          settings: mergedSettings,
          updatedBy: createdBy,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      this.logger.log(
        `Default preferences/settings seeded for tenant ${tenantId}`,
      );
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
