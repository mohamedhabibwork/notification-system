import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HandlebarsConfigService } from './handlebars-config.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TemplateLoaderService implements OnModuleInit {
  private readonly logger = new Logger(TemplateLoaderService.name);
  private readonly templatesPath = path.join(__dirname, '..');

  constructor(private readonly handlebarsConfig: HandlebarsConfigService) {}

  async onModuleInit() {
    await this.loadPartials();
  }

  private async loadPartials(): Promise<void> {
    const partialsPath = path.join(this.templatesPath, 'components');

    try {
      // Load layout partials
      const layoutsPath = path.join(partialsPath, 'layouts');
      await this.registerPartialsFromDirectory(layoutsPath, 'layout');

      // Load component partials
      const componentsPath = path.join(partialsPath, 'partials');
      await this.registerPartialsFromDirectory(componentsPath, 'partial');
    } catch (error) {
      this.logger.warn(
        `Could not initialize partials: ${(error as Error).message}`,
      );
    }
  }

  private async registerPartialsFromDirectory(
    dir: string,
    prefix: string,
  ): Promise<void> {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const name = file.replace('.hbs', '');
          const filePath = path.join(dir, file);
          await this.handlebarsConfig.registerPartial(
            `${prefix}-${name}`,
            filePath,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Could not load partials from ${dir}: ${(error as Error).message}`,
      );
    }
  }

  async loadTemplate(templatePath: string): Promise<string> {
    const fullPath = path.join(this.templatesPath, templatePath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      this.logger.error(
        `Failed to load template ${templatePath}: ${(error as Error).message}`,
      );
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  async loadAllTemplates(): Promise<Map<string, string>> {
    const templates = new Map<string, string>();
    const categories = ['transactional', 'marketing'];

    for (const category of categories) {
      const categoryPath = path.join(this.templatesPath, category);
      await this.loadTemplatesFromDirectory(categoryPath, templates, category);
    }

    return templates;
  }

  private async loadTemplatesFromDirectory(
    dir: string,
    templates: Map<string, string>,
    prefix: string,
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.loadTemplatesFromDirectory(
            fullPath,
            templates,
            `${prefix}/${entry.name}`,
          );
        } else if (entry.name.endsWith('.hbs')) {
          const templateKey = `${prefix}/${entry.name}`;
          const content = await fs.readFile(fullPath, 'utf-8');
          templates.set(templateKey, content);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Could not load templates from ${dir}: ${(error as Error).message}`,
      );
    }
  }
}
