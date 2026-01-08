import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProviderTemplatesController } from './provider-templates.controller';
import { ProvidersService } from './providers.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { TemplatesService } from '../templates/templates.service';
import { HandlebarsConfigService } from '../templates/html-templates/services/handlebars-config.service';
import { TemplateLoaderService } from '../templates/html-templates/services/template-loader.service';

@Module({
  controllers: [ProvidersController, ProviderTemplatesController],
  providers: [
    ProvidersService,
    EncryptionService,
    TemplatesService,
    HandlebarsConfigService,
    TemplateLoaderService,
  ],
  exports: [ProvidersService, EncryptionService],
})
export class ProvidersModule {}
