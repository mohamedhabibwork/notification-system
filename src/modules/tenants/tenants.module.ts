import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantProvidersController } from './tenant-providers.controller';
import { TenantTemplatesController } from './tenant-templates.controller';
import { ProvidersService } from '../providers/providers.service';
import { TemplatesService } from '../templates/templates.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { HandlebarsConfigService } from '../templates/html-templates/services/handlebars-config.service';
import { TemplateLoaderService } from '../templates/html-templates/services/template-loader.service';

@Module({
  controllers: [
    TenantsController,
    TenantProvidersController,
    TenantTemplatesController,
  ],
  providers: [
    TenantsService,
    ProvidersService,
    TemplatesService,
    EncryptionService,
    HandlebarsConfigService,
    TemplateLoaderService,
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
