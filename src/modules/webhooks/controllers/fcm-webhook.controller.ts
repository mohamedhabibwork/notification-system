import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTenantHeader } from '../../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Webhooks - FCM')
@Controller('webhooks/fcm')
export class FcmWebhookController {
  private readonly logger = new Logger(FcmWebhookController.name);

  @Post('token-refresh')
  @Public()
  @ApiOperation({ summary: 'Handle FCM token refresh' })
  @ApiResponse({ status: 200, description: 'Token refresh processed' })
  async handleTokenRefresh(@Body() body: any) {
    this.logger.log(`FCM token refresh for user ${body.userId}`);

    const { userId, oldToken, newToken } = body;

    // Update user's FCM token in database
    this.logger.log(
      `Updating FCM token for user ${userId}: ${oldToken} -> ${newToken}`,
    );

    return { updated: true };
  }

  @Post('delivery-receipt')
  @Public()
  @ApiOperation({ summary: 'Handle FCM delivery receipts' })
  @ApiResponse({ status: 200, description: 'Delivery receipt processed' })
  async handleDeliveryReceipt(@Body() body: any) {
    this.logger.log(`FCM delivery receipt: ${JSON.stringify(body)}`);

    // Process FCM delivery receipt
    // This would update notification status based on FCM response

    return { received: true };
  }
}
