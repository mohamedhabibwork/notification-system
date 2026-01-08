import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTenantHeader } from './common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
