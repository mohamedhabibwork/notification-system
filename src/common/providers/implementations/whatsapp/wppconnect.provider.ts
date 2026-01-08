/**
 * WPPConnect Provider Implementation
 * 
 * Concrete implementation of the WhatsApp provider using WPPConnect.
 * Handles message sending through WhatsApp Web API.
 * 
 * Reference: https://wppconnect.io/docs/tutorial/basics/basic-functions
 */

import { Injectable } from '@nestjs/common';
import { BaseProvider } from '../../base/base.provider';
import type { WPPConnectCredentials } from '../../interfaces/credentials.interface';
import {
  ProviderSendPayload,
  ProviderSendResult,
  ProviderMetadata,
} from '../../interfaces/provider.interface';
import { ChannelType } from '../../types';
import { SessionManagerService } from './session-manager.service';

@Injectable()
export class WPPConnectProvider extends BaseProvider<WPPConnectCredentials> {
  private sessionManager: SessionManagerService;

  constructor(
    credentials: WPPConnectCredentials,
    sessionManager?: SessionManagerService,
  ) {
    super(credentials);
    
    // Session manager will be injected by provider factory
    if (sessionManager) {
      this.sessionManager = sessionManager;
    }
  }

  /**
   * Set session manager (called by provider factory)
   */
  setSessionManager(sessionManager: SessionManagerService): void {
    this.sessionManager = sessionManager;
  }

  /**
   * Send notification through WPPConnect
   */
  async send(payload: ProviderSendPayload): Promise<ProviderSendResult> {
    try {
      this.logSendAttempt(payload);

      if (!this.sessionManager) {
        throw new Error('Session manager not initialized');
      }

      // Extract tenant ID from options
      const tenantId = payload.options?.tenantId as number;
      if (!tenantId) {
        throw new Error('Tenant ID is required for WPPConnect');
      }

      // Get or create client session
      const client = await this.sessionManager.getClient(tenantId, {
        autoClose: this.credentials.autoClose,
        qrTimeout: this.credentials.qrTimeout,
        useChrome: this.credentials.useChrome,
        disableWelcome: this.credentials.disableWelcome,
        tokenStore: this.credentials.tokenStore,
        folderNameToken: this.credentials.folderNameToken,
      });

      // Send message based on type
      let messageId: string;
      const formattedPayload = this.formatPayload(payload);

      // Detect message type and send accordingly
      if (payload.options?.messageType === 'location' && payload.options?.location) {
        // Location message
        const location = payload.options.location as {
          latitude: number;
          longitude: number;
          name?: string;
        };
        
        const result = await client.sendLocation(
          formattedPayload.phone,
          location.latitude.toString(),
          location.longitude.toString(),
          location.name || 'Location',
        );
        messageId = result.id;
      } else if (payload.options?.messageType === 'contact' && payload.options?.contact) {
        // Contact/vCard message
        const contact = payload.options.contact as {
          contactId: string;
          name: string;
        };
        
        const result = await client.sendContactVcard(
          formattedPayload.phone,
          contact.contactId,
          contact.name,
        );
        messageId = result.id;
      } else if (payload.options?.messageType === 'media' && payload.options?.media) {
        // Media message (image, video, document)
        const media = payload.options.media as {
          base64: string;
          filename: string;
          caption?: string;
        };
        
        const result = await client.sendFileFromBase64(
          formattedPayload.phone,
          media.base64,
          media.filename,
          media.caption || formattedPayload.body,
        );
        messageId = result.id;
      } else {
        // Text message (default)
        const result = await client.sendText(
          formattedPayload.phone,
          formattedPayload.body,
        );
        messageId = result.id;
      }

      const sendResult: ProviderSendResult = {
        success: true,
        messageId,
        timestamp: new Date(),
        metadata: {
          provider: 'wppconnect',
          tenantId,
          sessionName: `tenant-${tenantId}`,
        },
      };

      this.logSendSuccess(sendResult);
      return sendResult;
    } catch (error) {
      return {
        success: false,
        timestamp: new Date(),
        error: this.handleError(error as Error),
      };
    }
  }

  /**
   * Validate credentials and session
   */
  async validate(): Promise<boolean> {
    if (!this.validateCredentials()) {
      return false;
    }

    try {
      // Basic validation - check if session manager is available
      if (!this.sessionManager) {
        this.logger.warn('Session manager not initialized');
        return false;
      }

      // Additional validation can be added here
      return true;
    } catch (error) {
      this.logger.error(`WPPConnect validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Format payload for WPPConnect
   */
  protected formatPayload(payload: ProviderSendPayload): {
    phone: string;
    body: string;
  } {
    // Format phone number for WhatsApp
    let phone = payload.recipient.phone!;

    // Remove non-numeric characters
    phone = phone.replace(/\D/g, '');

    // Ensure phone has country code
    if (!phone.includes('@c.us')) {
      phone = `${phone}@c.us`;
    }

    return {
      phone,
      body: payload.content.body,
    };
  }

  /**
   * Get required credentials
   */
  getRequiredCredentials(): string[] {
    return ['sessionName', 'phoneNumberId'];
  }

  /**
   * Get channel type
   */
  getChannel(): ChannelType {
    return 'whatsapp';
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'wppconnect';
  }

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      displayName: 'WPPConnect',
      description: 'WPPConnect WhatsApp Web client for multi-tenant messaging',
      version: '1.0.0',
      supportedFeatures: [
        'text',
        'media',
        'location',
        'contacts',
        'status-updates',
        'qr-authentication',
      ],
      rateLimit: {
        maxPerSecond: 5,
        maxPerDay: 10000,
      },
    };
  }

  /**
   * Extract error code from WPPConnect error
   */
  protected extractErrorCode(error: Error): string {
    if ('code' in error) {
      return (error as { code: string }).code;
    }
    
    // Check for common WPPConnect errors
    const message = error.message.toLowerCase();
    if (message.includes('not connected')) {
      return 'NOT_CONNECTED';
    } else if (message.includes('qr')) {
      return 'QR_AUTH_REQUIRED';
    } else if (message.includes('session')) {
      return 'SESSION_ERROR';
    } else if (message.includes('timeout')) {
      return 'TIMEOUT';
    }
    
    return 'WPPCONNECT_ERROR';
  }

  /**
   * Determine if error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    const errorCode = this.extractErrorCode(error);
    
    // Connection errors are retryable
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'TIMEOUT',
      'NOT_CONNECTED',
      'SESSION_ERROR',
    ];
    
    return retryableCodes.includes(errorCode);
  }
}
