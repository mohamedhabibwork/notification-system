import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { HandlebarsConfigService } from './html-templates/services/handlebars-config.service';
import { TemplateLoaderService } from './html-templates/services/template-loader.service';

@Module({
  controllers: [TemplatesController],
  providers: [
    TemplatesService,
    HandlebarsConfigService,
    TemplateLoaderService,
  ],
  exports: [TemplatesService, HandlebarsConfigService, TemplateLoaderService],
})
export class TemplatesModule {}
