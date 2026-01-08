import { Injectable, BadRequestException } from '@nestjs/common';
import { SendNotificationDto } from '../dto/send-notification.dto';

@Injectable()
export class NotificationValidatorService {
  validateNotificationRequest(dto: SendNotificationDto): void {
    // Ensure either templateId or directContent is provided
    if (!dto.templateId && !dto.directContent) {
      throw new BadRequestException(
        'Either templateId or directContent must be provided',
      );
    }

    // Ensure recipient has at least one identifier
    const { recipient } = dto;
    if (
      !recipient.recipientUserId &&
      !recipient.recipientEmail &&
      !recipient.recipientPhone
    ) {
      throw new BadRequestException(
        'Recipient must have at least one identifier (userId, email, or phone)',
      );
    }

    // Channel-specific validation
    this.validateChannelRequirements(dto);
  }

  private validateChannelRequirements(dto: SendNotificationDto): void {
    const { channel, recipient, directContent, templateId } = dto;

    switch (channel) {
      case 'email':
        if (!recipient.recipientEmail && !recipient.recipientUserId) {
          throw new BadRequestException(
            'Email channel requires recipientEmail or recipientUserId',
          );
        }
        if (directContent && !directContent.subject) {
          throw new BadRequestException('Email requires a subject');
        }
        break;

      case 'sms':
        if (!recipient.recipientPhone && !recipient.recipientUserId) {
          throw new BadRequestException(
            'SMS channel requires recipientPhone or recipientUserId',
          );
        }
        break;

      case 'fcm':
        if (!recipient.recipientUserId) {
          throw new BadRequestException('FCM channel requires recipientUserId');
        }
        break;

      case 'whatsapp':
        if (!recipient.recipientPhone && !recipient.recipientUserId) {
          throw new BadRequestException(
            'WhatsApp channel requires recipientPhone or recipientUserId',
          );
        }
        break;

      case 'database':
        if (!recipient.recipientUserId) {
          throw new BadRequestException(
            'Database channel requires recipientUserId',
          );
        }
        break;
    }
  }
}
