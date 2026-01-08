import { notificationTemplates } from '../schema';
import { TemplateLoaderService } from '../../modules/templates/html-templates/services/template-loader.service';
import { HandlebarsConfigService } from '../../modules/templates/html-templates/services/handlebars-config.service';
import { templateMetadata } from '../../modules/templates/html-templates/templates.metadata';

export async function seedSystemTemplates(db: any): Promise<void> {
  console.log('\n📧 Seeding system templates...');

  const handlebarsConfig = new HandlebarsConfigService();
  const templateLoader = new TemplateLoaderService(handlebarsConfig);

  // Initialize partials
  await templateLoader.onModuleInit();

  let seededCount = 0;
  let skippedCount = 0;

  for (const meta of templateMetadata) {
    try {
      // Load template content from .hbs file
      const htmlTemplate = await templateLoader.loadTemplate(meta.filePath);

      // Create plain text body from HTML (strip tags and normalize whitespace)
      const bodyTemplate = htmlTemplate
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      await db
        .insert(notificationTemplates)
        .values({
          tenantId: 0, // System template
          name: meta.name,
          templateCode: meta.templateCode,
          channel: meta.channel,
          subject: meta.subject,
          bodyTemplate,
          htmlTemplate,
          variables: meta.variables as Record<string, unknown>,
          tags: meta.tags,
          language: meta.language,
          isActive: true,
          createdBy: 'system',
          updatedBy: 'system',
        })
        .onConflictDoNothing(); // Skip if already exists

      seededCount++;
      console.log(`  ✓ ${meta.templateCode}`);
    } catch (error) {
      console.error(`  ✗ ${meta.templateCode}: ${(error as Error).message}`);
      skippedCount++;
    }
  }

  console.log(
    `\n✅ Seeded ${seededCount} system templates${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`,
  );
}
