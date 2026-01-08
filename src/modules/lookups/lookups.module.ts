import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { LookupsController } from './lookups.controller';
import { LookupTypesController } from './lookup-types.controller';
import { LookupsService } from './lookups.service';

@Module({
  imports: [CacheModule.register()],
  controllers: [LookupsController, LookupTypesController],
  providers: [LookupsService],
  exports: [LookupsService],
})
export class LookupsModule {}
