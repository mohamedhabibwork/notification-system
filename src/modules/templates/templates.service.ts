import { Injectable, Inject, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
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
    variables: Record<string, any>,
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
      this.logger.debug(`Using tenant template: ${templateCode} for tenant ${tenantId}`);
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
  async getSystemTemplates(): Promise<Array<typeof notificationTemplates.$inferSelect>> {
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
}
