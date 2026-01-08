import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BulkJobsController } from './bulk-jobs.controller';
import { BulkJobsService } from './bulk-jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { GatewayModule } from '../../gateways/gateway.module';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'text/csv') {
          cb(new Error('Only CSV files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
    NotificationsModule,
    GatewayModule,
  ],
  controllers: [BulkJobsController],
  providers: [BulkJobsService],
})
export class BulkJobsModule {}
