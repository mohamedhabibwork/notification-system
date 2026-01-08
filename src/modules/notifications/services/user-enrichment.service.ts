import { Injectable, Logger } from '@nestjs/common';
import { UserServiceClient } from '../../user-service/user-service.client';
import { RecipientDto } from '../dto/send-notification.dto';

@Injectable()
export class UserEnrichmentService {
  private readonly logger = new Logger(UserEnrichmentService.name);

  constructor(private readonly userServiceClient: UserServiceClient) {}

  async enrichRecipient(
    recipient: RecipientDto,
    tenantId: number,
  ): Promise<RecipientDto> {
    // If userId is provided but email/phone are missing, fetch from User Service
    if (
      recipient.recipientUserId &&
      (!recipient.recipientEmail || !recipient.recipientPhone)
    ) {
      try {
        const user = await this.userServiceClient.getUserById(
          recipient.recipientUserId,
          true,
        );

        if (!user) {
          this.logger.warn(
            `User ${recipient.recipientUserId} not found in User Service`,
          );
          return recipient;
        }

        return {
          ...recipient,
          recipientEmail: recipient.recipientEmail || user.email || undefined,
          recipientPhone: recipient.recipientPhone || user.phone || undefined,
          recipientUserType:
            recipient.recipientUserType || user.userType || undefined,
          recipientMetadata: {
            ...recipient.recipientMetadata,
            ...(user.email && { userEmail: user.email }),
            ...(user.phone && { userPhone: user.phone }),
            ...(user.userType && { userType: user.userType }),
          },
        };
      } catch (error) {
        this.logger.warn(
          `Failed to enrich user ${recipient.recipientUserId} from User Service: ${error.message}`,
        );
        // Continue with provided data
        return recipient;
      }
    }

    return recipient;
  }

  async enrichMultipleRecipients(
    recipients: RecipientDto[],
    tenantId: number,
  ): Promise<RecipientDto[]> {
    const enrichedRecipients = await Promise.all(
      recipients.map((recipient) => this.enrichRecipient(recipient, tenantId)),
    );

    return enrichedRecipients;
  }
}
