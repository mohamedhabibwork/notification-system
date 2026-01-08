import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Webhooks - Twilio')
@Controller('webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  @Post()
  @Public()
  @ApiOperation({ summary: 'Receive Twilio SMS status callbacks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log(`Received Twilio webhook: ${body.MessageStatus}`);

    // Extract Twilio status callback data
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } =
      body;

    // Process status
    await this.processStatus(
      MessageSid,
      MessageStatus,
      To,
      ErrorCode,
      ErrorMessage,
    );

    return { received: true };
  }

  private async processStatus(
    messageSid: string,
    status: string,
    to: string,
    errorCode?: string,
    errorMessage?: string,
  ) {
    this.logger.log(`Twilio SMS ${messageSid} status: ${status} to ${to}`);

    // Map Twilio status to notification status
    switch (status) {
      case 'delivered':
        // Update notification to delivered
        this.logger.log(`SMS delivered to ${to}`);
        break;

      case 'sent':
        // SMS sent successfully
        this.logger.log(`SMS sent to ${to}`);
        break;

      case 'failed':
      case 'undelivered':
        // SMS failed
        this.logger.log(`SMS failed for ${to}: ${errorCode} - ${errorMessage}`);
        break;

      default:
        this.logger.log(`SMS status ${status} for ${to}`);
    }
  }
}
