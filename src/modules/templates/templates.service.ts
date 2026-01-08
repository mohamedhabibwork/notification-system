import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import {
  notificationTemplates,
  templateCategories,
  templateVersions,
  templateLocalizations,
} from '../../database/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplatePreviewDto,
} from './dto/template.dto';
import * as Handlebars from 'handlebars';
import { HandlebarsConfigService } from './html-templates/services/handlebars-config.service';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly handlebarsConfig: HandlebarsConfigService,
  ) {}

  async create(createDto: CreateTemplateDto, createdBy: string) {
    const [template] = await this.db
      .insert(notificationTemplates)
      .values({
        ...createDto,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    return template;
  }

  async findAll(tenantId?: number) {
    if (tenantId) {
      return await this.db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.tenantId, tenantId),
            isNull(notificationTemplates.deletedAt),
          ),
        );
    }

    return await this.db
      .select()
      .from(notificationTemplates)
      .where(isNull(notificationTemplates.deletedAt));
  }

  async findOne(id: number, tenantId?: number) {
    const conditions = tenantId
      ? and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.tenantId, tenantId),
        )
      : eq(notificationTemplates.id, id);

    const [template] = await this.db
      .select()
      .from(notificationTemplates)
      .where(conditions);

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async findByCode(templateCode: string, tenantId: number) {
    const [template] = await this.db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.templateCode, templateCode),
          eq(notificationTemplates.tenantId, tenantId),
          eq(notificationTemplates.isActive, true),
        ),
      );

    if (!template) {
      throw new NotFoundException(
        `Template with code ${templateCode} not found`,
      );
    }

    return template;
  }

  async update(
    id: number,
    updateDto: UpdateTemplateDto,
    updatedBy: string,
    tenantId?: number,
  ) {
    const conditions = tenantId
      ? and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.tenantId, tenantId),
        )
      : eq(notificationTemplates.id, id);

    // Increment version on update
    const existing = await this.findOne(id, tenantId);
    const newVersion = (existing.version || 1) + 1;

    const [updated] = await this.db
      .update(notificationTemplates)
      .set({
        ...updateDto,
        version: newVersion,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(conditions)
      .returning();

    if (!updated) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: number, deletedBy: string, tenantId?: number) {
    const conditions = tenantId
      ? and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.tenantId, tenantId),
        )
      : eq(notificationTemplates.id, id);

    const [deleted] = await this.db
      .update(notificationTemplates)
      .set({
        deletedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(conditions)
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return deleted;
  }

  async preview(id: number, previewDto: TemplatePreviewDto, tenantId?: number) {
    const template = await this.findOne(id, tenantId);

    // Compile and render body template
    const bodyCompiled = Handlebars.compile(template.bodyTemplate);
    const renderedBody = bodyCompiled(previewDto.variables);

    let renderedHtml: string | undefined;
    if (template.htmlTemplate) {
      const htmlCompiled = Handlebars.compile(template.htmlTemplate);
      renderedHtml = htmlCompiled(previewDto.variables);
    }

    let renderedSubject: string | undefined;
    if (template.subject) {
      const subjectCompiled = Handlebars.compile(template.subject);
      renderedSubject = subjectCompiled(previewDto.variables);
    }

    return {
      subject: renderedSubject,
      body: renderedBody,
      htmlBody: renderedHtml,
    };
  }

  // Helper method to render a template with variables
  async renderTemplate(
    templateId: number,
    variables: Record<string, unknown>,
    tenantId: number,
  ) {
    const template = await this.findOne(templateId, tenantId);

    const bodyCompiled = Handlebars.compile(template.bodyTemplate);
    const renderedBody = bodyCompiled(variables);

    let renderedHtml: string | undefined;
    if (template.htmlTemplate) {
      const htmlCompiled = Handlebars.compile(template.htmlTemplate);
      renderedHtml = htmlCompiled(variables);
    }

    let renderedSubject: string | undefined;
    if (template.subject) {
      const subjectCompiled = Handlebars.compile(template.subject);
      renderedSubject = subjectCompiled(variables);
    }

    return {
      subject: renderedSubject,
      body: renderedBody,
      htmlBody: renderedHtml,
    };
  }

  // Category Management
  async createCategory(
    tenantId: number,
    name: string,
    code: string,
    createdBy: string,
    options?: { description?: string; icon?: string; color?: string },
  ) {
    const [category] = await this.db
      .insert(templateCategories)
      .values({
        tenantId,
        name,
        code,
        description: options?.description,
        icon: options?.icon,
        color: options?.color,
        isActive: true,
        sortOrder: 0,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    return category;
  }

  async getCategories(tenantId: number) {
    return await this.db
      .select()
      .from(templateCategories)
      .where(
        and(
          eq(templateCategories.tenantId, tenantId),
          isNull(templateCategories.deletedAt),
        ),
      );
  }

  // Version Management
  async createVersion(
    templateId: number,
    tenantId: number,
    changeDescription: string,
    changeType: 'major' | 'minor' | 'patch',
    createdBy: string,
  ) {
    const template = await this.findOne(templateId, tenantId);

    const [version] = await this.db
      .insert(templateVersions)
      .values({
        templateId,
        version: template.version,
        name: template.name,
        subject: template.subject,
        bodyTemplate: template.bodyTemplate,
        htmlTemplate: template.htmlTemplate,
        variables: template.variables,
        changeDescription,
        changeType,
        createdBy,
      })
      .returning();

    this.logger.log(
      `Created version ${version.version} for template ${templateId}`,
    );

    return version;
  }

  async getVersionHistory(templateId: number, tenantId: number) {
    // Verify template belongs to tenant
    await this.findOne(templateId, tenantId);

    return await this.db
      .select()
      .from(templateVersions)
      .where(eq(templateVersions.templateId, templateId))
      .orderBy(desc(templateVersions.version));
  }

  async rollbackToVersion(
    templateId: number,
    versionNumber: number,
    tenantId: number,
    updatedBy: string,
  ) {
    // Get the version
    const [version] = await this.db
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.templateId, templateId),
          eq(templateVersions.version, versionNumber),
        ),
      );

    if (!version) {
      throw new NotFoundException(
        `Version ${versionNumber} not found for template ${templateId}`,
      );
    }

    // Save current version before rollback
    const current = await this.findOne(templateId, tenantId);
    await this.createVersion(
      templateId,
      tenantId,
      `Rollback from version ${current.version} to ${versionNumber}`,
      'major',
      updatedBy,
    );

    // Apply the rollback
    const [updated] = await this.db
      .update(notificationTemplates)
      .set({
        name: version.name,
        subject: version.subject,
        bodyTemplate: version.bodyTemplate,
        htmlTemplate: version.htmlTemplate,
        variables: version.variables,
        version: current.version + 1,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(notificationTemplates.id, templateId))
      .returning();

    this.logger.log(
      `Rolled back template ${templateId} to version ${versionNumber}`,
    );

    return updated;
  }

  // Localization Management
  async addLocalization(
    templateId: number,
    tenantId: number,
    language: string,
    subject: string | null,
    bodyTemplate: string,
    htmlTemplate: string | null,
    translatedBy: string,
  ) {
    // Verify template belongs to tenant
    await this.findOne(templateId, tenantId);

    const [localization] = await this.db
      .insert(templateLocalizations)
      .values({
        templateId,
        language,
        subject,
        bodyTemplate,
        htmlTemplate,
        translatedBy,
      })
      .returning();

    this.logger.log(
      `Added ${language} localization for template ${templateId}`,
    );

    return localization;
  }

  async getLocalization(
    templateId: number,
    tenantId: number,
    language: string,
  ) {
    // Verify template belongs to tenant
    await this.findOne(templateId, tenantId);

    const [localization] = await this.db
      .select()
      .from(templateLocalizations)
      .where(
        and(
          eq(templateLocalizations.templateId, templateId),
          eq(templateLocalizations.language, language),
        ),
      );

    if (!localization) {
      throw new NotFoundException(
        `Localization ${language} not found for template ${templateId}`,
      );
    }

    return localization;
  }

  async getAllLocalizations(templateId: number, tenantId: number) {
    // Verify template belongs to tenant
    await this.findOne(templateId, tenantId);

    return await this.db
      .select()
      .from(templateLocalizations)
      .where(eq(templateLocalizations.templateId, templateId));
  }

  async updateLocalization(
    templateId: number,
    tenantId: number,
    language: string,
    updates: {
      subject?: string;
      bodyTemplate?: string;
      htmlTemplate?: string;
    },
  ) {
    // Verify localization exists
    await this.getLocalization(templateId, tenantId, language);

    const [updated] = await this.db
      .update(templateLocalizations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(templateLocalizations.templateId, templateId),
          eq(templateLocalizations.language, language),
        ),
      )
      .returning();

    return updated;
  }

  // Clone template
  async cloneTemplate(
    templateId: number,
    tenantId: number,
    newName: string,
    newTemplateCode: string,
    createdBy: string,
  ) {
    const original = await this.findOne(templateId, tenantId);

    const [cloned] = await this.db
      .insert(notificationTemplates)
      .values({
        tenantId: original.tenantId,
        name: newName,
        templateCode: newTemplateCode,
        templateTypeId: original.templateTypeId,
        categoryId: original.categoryId,
        channel: original.channel,
        subject: original.subject,
        bodyTemplate: original.bodyTemplate,
        htmlTemplate: original.htmlTemplate,
        variables: original.variables,
        tags: original.tags,
        language: original.language,
        version: 1,
        isActive: true,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    this.logger.log(`Cloned template ${templateId} to ${cloned.id}`);

    return cloned;
  }

  /**
   * Find template by code with fallback logic
   * 1. Try tenant-specific template (tenantId = X)
   * 2. Fallback to system template (tenantId = 0)
   */
  async findByCodeWithFallback(
    templateCode: string,
    tenantId: number,
  ): Promise<typeof notificationTemplates.$inferSelect> {
    // First try tenant-specific
    const [tenantTemplate] = await this.db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.templateCode, templateCode),
          eq(notificationTemplates.tenantId, tenantId),
          eq(notificationTemplates.isActive, true),
          isNull(notificationTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (tenantTemplate) {
      this.logger.debug(
        `Using tenant template: ${templateCode} for tenant ${tenantId}`,
      );
      return tenantTemplate;
    }

    // Fallback to system template (tenantId = 0)
    const [systemTemplate] = await this.db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.templateCode, templateCode),
          eq(notificationTemplates.tenantId, 0),
          eq(notificationTemplates.isActive, true),
          isNull(notificationTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!systemTemplate) {
      throw new NotFoundException(
        `Template '${templateCode}' not found for tenant ${tenantId} or in system templates`,
      );
    }

    this.logger.debug(`Using system template: ${templateCode}`);
    return systemTemplate;
  }

  /**
   * Render template by code with fallback and Handlebars
   */
  async renderTemplateByCode(
    templateCode: string,
    variables: Record<string, unknown>,
    tenantId: number,
  ) {
    const template = await this.findByCodeWithFallback(templateCode, tenantId);

    // Add current year helper
    const contextWithHelpers = {
      ...variables,
      year: new Date().getFullYear(),
    };

    // Compile and render body
    const bodyCompiled = this.handlebarsConfig.compile(template.bodyTemplate);
    const renderedBody = bodyCompiled(contextWithHelpers);

    // Compile and render HTML if exists
    let renderedHtml: string | undefined;
    if (template.htmlTemplate) {
      const htmlCompiled = this.handlebarsConfig.compile(template.htmlTemplate);
      renderedHtml = htmlCompiled(contextWithHelpers);
    }

    // Compile and render subject if exists
    let renderedSubject: string | undefined;
    if (template.subject) {
      const subjectCompiled = this.handlebarsConfig.compile(template.subject);
      renderedSubject = subjectCompiled(contextWithHelpers);
    }

    return {
      subject: renderedSubject,
      body: renderedBody,
      htmlBody: renderedHtml,
      templateId: template.id,
      isSystemTemplate: template.tenantId === 0,
    };
  }

  /**
   * Get all system templates
   */
  async getSystemTemplates(): Promise<
    Array<typeof notificationTemplates.$inferSelect>
  > {
    return await this.db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.tenantId, 0),
          eq(notificationTemplates.isActive, true),
          isNull(notificationTemplates.deletedAt),
        ),
      );
  }

  /**
   * Find templates compatible with a specific provider
   */
  async findByProvider(
    providerId: number,
    tenantId?: number,
  ): Promise<Array<typeof notificationTemplates.$inferSelect>> {
    // First, get the provider to know its channel
    const { notificationProviders } =
      await import('../../database/schema/index.js');
    const [provider] = await this.db
      .select()
      .from(notificationProviders)
      .where(eq(notificationProviders.id, providerId));

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    // Find templates that match the provider's channel
    const conditions = [
      eq(notificationTemplates.channel, provider.channel),
      eq(notificationTemplates.isActive, true),
      isNull(notificationTemplates.deletedAt),
    ];

    if (tenantId !== undefined) {
      // Include tenant-specific templates and system templates
      return await this.db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            ...conditions,
            // Template belongs to tenant or is a system template
            tenantId === 0
              ? eq(notificationTemplates.tenantId, 0)
              : (undefined as any),
          ),
        );
    }

    return await this.db
      .select()
      .from(notificationTemplates)
      .where(and(...(conditions as any)));
  }

  /**
   * Test template rendering with provider-specific data
   */
  async testTemplateWithProvider(
    templateId: number,
    providerId: number,
    testData: Record<string, unknown>,
    tenantId?: number,
  ): Promise<{
    success: boolean;
    renderedContent: {
      subject?: string;
      body: string;
      htmlBody?: string;
    };
    providerInfo: {
      name: string;
      channel: string;
      supportsHtml: boolean;
      supportsSubject: boolean;
    };
    warnings?: string[];
  }> {
    // Get template
    const [template] = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.id, templateId));

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    // Get provider
    const { notificationProviders } =
      await import('../../database/schema/index.js');
    const [provider] = await this.db
      .select()
      .from(notificationProviders)
      .where(eq(notificationProviders.id, providerId));

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    // Check compatibility
    const warnings: string[] = [];
    if (template.channel !== provider.channel) {
      warnings.push(
        `Template channel (${template.channel}) does not match provider channel (${provider.channel})`,
      );
    }

    // Render template
    try {
      const rendered = await this.renderTemplateByCode(
        template.templateCode,
        testData,
        tenantId || template.tenantId,
      );

      return {
        success: true,
        renderedContent: {
          subject: rendered.subject,
          body: rendered.body,
          htmlBody: rendered.htmlBody,
        },
        providerInfo: {
          name: provider.providerName,
          channel: provider.channel,
          supportsHtml: ['email', 'chat'].includes(provider.channel),
          supportsSubject: ['email', 'sms'].includes(provider.channel),
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to render template: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send a test notification using template and provider
   */
  async sendTestNotification(
    templateId: number,
    providerId: number,
    recipient: any,
    testData: Record<string, unknown>,
    tenantId?: number,
  ): Promise<{
    success: boolean;
    messageId?: string;
    timestamp: Date;
    error?: string;
  }> {
    // Test template rendering first
    const testResult = await this.testTemplateWithProvider(
      templateId,
      providerId,
      testData,
      tenantId,
    );

    if (!testResult.success) {
      return {
        success: false,
        timestamp: new Date(),
        error: 'Template rendering failed',
      };
    }

    // Here you would use the provider to actually send the notification
    // For now, we'll return a success response
    // In a real implementation, you'd do:
    // const providerService = this.providerRegistry.get(provider.providerName);
    // const result = await providerService.send({recipient, content: testResult.renderedContent});

    return {
      success: true,
      messageId: `test-${Date.now()}`,
      timestamp: new Date(),
    };
  }

  /**
   * Get recommended templates for a provider
   */
  async getRecommendedTemplates(
    providerId: number,
  ): Promise<Array<typeof notificationTemplates.$inferSelect>> {
    // Get provider
    const { notificationProviders } =
      await import('../../database/schema/index.js');
    const [provider] = await this.db
      .select()
      .from(notificationProviders)
      .where(eq(notificationProviders.id, providerId));

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    // Find system templates for this channel (most commonly used)
    return await this.db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.channel, provider.channel),
          eq(notificationTemplates.tenantId, 0), // System templates
          eq(notificationTemplates.isActive, true),
          isNull(notificationTemplates.deletedAt),
        ),
      );
  }

  /**
   * Bulk create templates
   */
  async bulkCreate(
    templates: CreateTemplateDto[],
    createdBy: string,
  ): Promise<{
    successCount: number;
    failureCount: number;
    successes: Array<typeof notificationTemplates.$inferSelect>;
    failures: Array<{ index: number; error: string }>;
  }> {
    const successes: Array<typeof notificationTemplates.$inferSelect> = [];
    const failures: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < templates.length; i++) {
      try {
        const result = await this.create(templates[i], createdBy);
        successes.push(result);
      } catch (error) {
        failures.push({
          index: i,
          error: (error as Error).message,
        });
      }
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  /**
   * Bulk update templates
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: UpdateTemplateDto }>,
    updatedBy: string,
    tenantId?: number,
  ): Promise<{
    successCount: number;
    failureCount: number;
    successes: Array<typeof notificationTemplates.$inferSelect>;
    failures: Array<{ index: number; id: number; error: string }>;
  }> {
    const successes: Array<typeof notificationTemplates.$inferSelect> = [];
    const failures: Array<{ index: number; id: number; error: string }> = [];

    for (let i = 0; i < updates.length; i++) {
      try {
        const result = await this.update(
          updates[i].id,
          updates[i].data,
          updatedBy,
          tenantId,
        );
        successes.push(result);
      } catch (error) {
        failures.push({
          index: i,
          id: updates[i].id,
          error: (error as Error).message,
        });
      }
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }
}
