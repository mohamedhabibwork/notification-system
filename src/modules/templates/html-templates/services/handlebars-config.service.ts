import * as Handlebars from 'handlebars';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

@Injectable()
export class HandlebarsConfigService {
  private readonly logger = new Logger(HandlebarsConfigService.name);
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.configureHandlebars();
  }

  private configureHandlebars(): void {
    // Configure to keep original {{variable}} for missing variables
    this.handlebars.registerHelper('helperMissing', function () {
      const options = arguments[arguments.length - 1];
      const name = options.name;
      return new Handlebars.SafeString(`{{${name}}}`);
    });

    // Register custom helpers
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Date formatting helper
    this.handlebars.registerHelper(
      'formatDate',
      (date: Date | string, format: string) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString();
      },
    );

    // Currency helper
    this.handlebars.registerHelper(
      'currency',
      (amount: number, currency = 'USD') => {
        if (amount === undefined || amount === null) return '';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(amount);
      },
    );

    // Uppercase helper
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    // Default value helper
    this.handlebars.registerHelper(
      'default',
      (value: unknown, defaultValue: unknown) => {
        return value !== undefined && value !== null ? value : defaultValue;
      },
    );

    // Conditional equality helper
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => {
      return a === b;
    });

    // Conditional not equal helper
    this.handlebars.registerHelper('ne', (a: unknown, b: unknown) => {
      return a !== b;
    });
  }

  async registerPartial(name: string, filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.handlebars.registerPartial(name, content);
      this.logger.debug(`Registered partial: ${name}`);
    } catch (error) {
      this.logger.error(
        `Failed to register partial ${name}: ${(error as Error).message}`,
      );
    }
  }

  compile(template: string): HandlebarsTemplateDelegate {
    return this.handlebars.compile(template, {
      strict: false, // Don't throw on missing variables
      noEscape: false, // Keep HTML escaping for security
    });
  }

  getHandlebars(): typeof Handlebars {
    return this.handlebars;
  }
}
