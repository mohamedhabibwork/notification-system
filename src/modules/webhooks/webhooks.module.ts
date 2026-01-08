import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookClientService } from './webhook-client.service';
import { WebhookConfigService } from './webhook-config.service';
import { SendGridWebhookController } from './controllers/sendgrid-webhook.controller';
import { TwilioWebhookController } from './controllers/twilio-webhook.controller';
import { FcmWebhookController } from './controllers/fcm-webhook.controller';
import { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
import { WPPConnectWebhookController } from './controllers/wppconnect-webhook.controller';
import { WebhookConfigController } from './controllers/webhook-config.controller';
import { EncryptionService } from '../../common/services/encryption.service';
import { SessionManagerService } from '../../common/providers/implementations/whatsapp/session-manager.service';

@Module({
  imports: [HttpModule],
  controllers: [
    SendGridWebhookController,
    TwilioWebhookController,
    FcmWebhookController,
    WhatsAppWebhookController,
    WPPConnectWebhookController,
    WebhookConfigController,
  ],
  providers: [
    WebhookClientService,
    WebhookConfigService,
    EncryptionService,
    SessionManagerService,
  ],
  exports: [WebhookClientService, WebhookConfigService, SessionManagerService],
})
export class WebhooksModule {}
