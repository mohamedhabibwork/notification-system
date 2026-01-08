import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTenantHeader } from '../../../common/decorators/api-tenant-header.decorator';

@ApiTenantHeader()
@ApiTags('Webhooks - WhatsApp')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  @Get()
  @Public()
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  handleVerification(@Query() query: any) {
    // WhatsApp sends a verification request with hub.challenge
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    // Verify token (should match your configured verify token)
    if (mode === 'subscribe' && token === 'your_verify_token') {
      this.logger.log('WhatsApp webhook verified');
      return challenge;
    }

    return { error: 'Verification failed' };
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Receive WhatsApp Business API webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() body: any) {
    this.logger.log(`Received WhatsApp webhook: ${JSON.stringify(body)}`);

    // Process WhatsApp webhook events
    const { entry } = body;

    if (entry && entry.length > 0) {
      for (const item of entry) {
        const changes = item.changes || [];
        for (const change of changes) {
          await this.processChange(change);
        }
      }
    }

    return { received: true };
  }

  private async processChange(change: any) {
    const { value } = change;

    if (value.statuses) {
      // Message status updates
      for (const status of value.statuses) {
        this.logger.log(
          `WhatsApp message ${status.id} status: ${status.status}`,
        );

        // Map WhatsApp status to notification status
        switch (status.status) {
          case 'sent':
            this.logger.log(`WhatsApp message sent`);
            break;
          case 'delivered':
            this.logger.log(`WhatsApp message delivered`);
            break;
          case 'read':
            this.logger.log(`WhatsApp message read`);
            break;
          case 'failed':
            this.logger.log(`WhatsApp message failed`);
            break;
        }
      }
    }

    if (value.messages) {
      // Incoming messages (for two-way communication)
      this.logger.log(
        `Received ${value.messages.length} incoming WhatsApp messages`,
      );
    }
  }
}
