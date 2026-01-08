import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Webhooks - SendGrid')
@Controller('webhooks/sendgrid')
export class SendGridWebhookController {
  private readonly logger = new Logger(SendGridWebhookController.name);

  @Post()
  @Public()
  @ApiOperation({ summary: 'Receive SendGrid webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() events: any[], @Headers() headers: any) {
    this.logger.log(`Received SendGrid webhook with ${events.length} events`);

    // Process each event
    for (const event of events) {
      await this.processEvent(event);
    }

    return { received: true };
  }

  private async processEvent(event: any) {
    const { event: eventType, email, sg_message_id, timestamp } = event;

    this.logger.log(`SendGrid event: ${eventType} for ${email}`);

    // Map SendGrid events to notification status updates
    switch (eventType) {
      case 'delivered':
        // Update notification status to delivered
        this.logger.log(`Email delivered to ${email}`);
        break;

      case 'bounce':
      case 'dropped':
        // Update notification status to failed
        this.logger.log(`Email bounced/dropped for ${email}: ${event.reason}`);
        break;

      case 'open':
        // Track email open
        this.logger.log(`Email opened by ${email}`);
        break;

      case 'click':
        // Track email click
        this.logger.log(`Email link clicked by ${email}: ${event.url}`);
        break;

      case 'spamreport':
      case 'unsubscribe':
        // Handle spam report or unsubscribe
        this.logger.log(`Email spam report/unsubscribe from ${email}`);
        break;

      default:
        this.logger.log(`Unhandled SendGrid event: ${eventType}`);
    }
  }
}
