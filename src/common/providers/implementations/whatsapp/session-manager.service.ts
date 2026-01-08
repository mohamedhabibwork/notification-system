/**
 * WPPConnect Session Manager Service
 *
 * Manages WhatsApp Web sessions per tenant using WPPConnect.
 * Handles QR code generation, authentication, and session lifecycle.
 *
 * Reference: https://wppconnect.io/docs/tutorial/basics/creating-client
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as wppconnect from '@wppconnect-team/wppconnect';
import { ConfigService } from '@nestjs/config';

export interface QRCodeData {
  qrCode: string;
  asciiQR: string;
  urlCode: string;
  expiresAt: Date;
  attempts: number;
}

export interface SessionStatus {
  tenantId: number;
  sessionName: string;
  status: string;
  isConnected: boolean;
  lastActivity?: Date;
}

@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly clients = new Map<string, wppconnect.Whatsapp>();
  private readonly qrCodes = new Map<string, QRCodeData>();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    // Set WPPConnect logger level based on environment
    if (process.env.NODE_ENV === 'production') {
      wppconnect.defaultLogger.level = 'warn';
    } else {
      wppconnect.defaultLogger.level =
        this.configService.get<string>('LOG_LEVEL') || 'info';
    }
  }

  /**
   * Get session key for tenant
   */
  private getSessionKey(tenantId: number): string {
    return `tenant-${tenantId}`;
  }

  /**
   * Get QR code Redis key
   */
  private getQRCodeKey(tenantId: number): string {
    return `wppconnect:qr:${tenantId}`;
  }

  /**
   * Get or create WhatsApp client for tenant
   */
  async getClient(
    tenantId: number,
    config?: {
      autoClose?: number;
      qrTimeout?: number;
      useChrome?: boolean;
      disableWelcome?: boolean;
      tokenStore?: string;
      folderNameToken?: string;
    },
  ): Promise<wppconnect.Whatsapp> {
    const sessionKey = this.getSessionKey(tenantId);

    // Return existing client if available
    if (this.clients.has(sessionKey)) {
      const client = this.clients.get(sessionKey)!;

      // Check if client is still connected
      try {
        const state = await client.getConnectionState();
        if (state === 'CONNECTED') {
          this.logger.log(`Reusing existing session for tenant ${tenantId}`);
          return client;
        } else {
          this.logger.warn(
            `Existing session for tenant ${tenantId} is not connected (${state}), creating new session`,
          );
          this.clients.delete(sessionKey);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to check connection state for tenant ${tenantId}, creating new session`,
        );
        this.clients.delete(sessionKey);
      }
    }

    // Create new client
    this.logger.log(`Creating new WPPConnect session for tenant ${tenantId}`);

    const client = await wppconnect.create({
      session: sessionKey,

      // QR Code callback
      catchQR: async (base64Qrimg, asciiQR, attempts, urlCode) => {
        this.logger.log(
          `QR code generated for tenant ${tenantId}, attempt ${attempts}`,
        );

        const qrData: QRCodeData = {
          qrCode: base64Qrimg,
          asciiQR,
          urlCode: urlCode || '',
          expiresAt: new Date(Date.now() + 60000), // 60 seconds
          attempts,
        };

        // Store in memory
        this.qrCodes.set(sessionKey, qrData);

        // Store in Redis with TTL
        const qrKey = this.getQRCodeKey(tenantId);
        await this.cacheManager.set(qrKey, qrData, 60000); // 60 seconds TTL
      },

      // Session status callback
      statusFind: async (statusSession, session) => {
        this.logger.log(
          `Session status for tenant ${tenantId}: ${statusSession}`,
        );

        switch (statusSession) {
          case 'isLogged':
            this.logger.log(`Tenant ${tenantId} is already logged in`);
            break;
          case 'notLogged':
            this.logger.log(`Tenant ${tenantId} needs to scan QR code`);
            break;
          case 'qrReadSuccess':
            this.logger.log(`Tenant ${tenantId} successfully scanned QR code`);
            // Clear QR code data
            this.qrCodes.delete(sessionKey);
            await this.cacheManager.del(this.getQRCodeKey(tenantId));
            break;
          case 'qrReadFail':
            this.logger.warn(`Tenant ${tenantId} QR code scan failed`);
            break;
          case 'browserClose':
            this.logger.warn(`Browser closed for tenant ${tenantId}`);
            this.clients.delete(sessionKey);
            break;
          case 'autocloseCalled':
            this.logger.warn(`Auto-close triggered for tenant ${tenantId}`);
            this.clients.delete(sessionKey);
            break;
          case 'disconnectedMobile':
            this.logger.warn(`Mobile disconnected for tenant ${tenantId}`);
            this.clients.delete(sessionKey);
            break;
          case 'serverClose':
            this.logger.warn(`Server closed for tenant ${tenantId}`);
            this.clients.delete(sessionKey);
            break;
        }
      },

      // Browser configuration
      headless: true,
      useChrome: config?.useChrome ?? true,
      logQR: false, // We handle QR codes via catchQR callback
      disableWelcome: config?.disableWelcome ?? true,
      autoClose: config?.autoClose ?? 60000, // 60 seconds
      tokenStore: config?.tokenStore || 'file',
      folderNameToken: config?.folderNameToken || './tokens/wppconnect',
      debug: false,
      devtools: false,
    });

    // Store client
    this.clients.set(sessionKey, client);

    // Start phone connection watchdog
    client.startPhoneWatchdog(30000); // Check every 30 seconds

    // Set up event listeners
    this.setupEventListeners(tenantId, client);

    this.logger.log(`WPPConnect session created for tenant ${tenantId}`);

    return client;
  }

  /**
   * Set up event listeners for the client
   */
  private setupEventListeners(
    tenantId: number,
    client: wppconnect.Whatsapp,
  ): void {
    // Listen for connection state changes
    client.onStateChange((state) => {
      this.logger.log(
        `Connection state changed for tenant ${tenantId}: ${state}`,
      );

      if (['CONFLICT', 'UNPAIRED', 'TIMEOUT'].includes(state)) {
        this.logger.error(
          `Session failure for tenant ${tenantId}, state: ${state}`,
        );
        this.closeSession(tenantId);
      }
    });

    // Optional: Listen for incoming messages (for debugging)
    if (process.env.NODE_ENV !== 'production') {
      client.onMessage((message) => {
        this.logger.debug(
          `Message received for tenant ${tenantId}: ${message.id}`,
        );
      });
    }
  }

  /**
   * Get QR code for tenant
   */
  async getQRCode(tenantId: number): Promise<QRCodeData | null> {
    const sessionKey = this.getSessionKey(tenantId);

    // Check memory first
    if (this.qrCodes.has(sessionKey)) {
      return this.qrCodes.get(sessionKey)!;
    }

    // Check Redis
    const qrKey = this.getQRCodeKey(tenantId);
    const qrData = await this.cacheManager.get<QRCodeData>(qrKey);

    if (qrData) {
      return qrData;
    }

    return null;
  }

  /**
   * Get session status for tenant
   */
  async getSessionStatus(tenantId: number): Promise<SessionStatus> {
    const sessionKey = this.getSessionKey(tenantId);
    const client = this.clients.get(sessionKey);

    if (!client) {
      return {
        tenantId,
        sessionName: sessionKey,
        status: 'not_initialized',
        isConnected: false,
      };
    }

    try {
      const state = await client.getConnectionState();

      return {
        tenantId,
        sessionName: sessionKey,
        status: state,
        isConnected: state === 'CONNECTED',
        lastActivity: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get connection state for tenant ${tenantId}: ${(error as Error).message}`,
      );

      return {
        tenantId,
        sessionName: sessionKey,
        status: 'error',
        isConnected: false,
      };
    }
  }

  /**
   * Close session for tenant
   */
  async closeSession(tenantId: number): Promise<void> {
    const sessionKey = this.getSessionKey(tenantId);
    const client = this.clients.get(sessionKey);

    if (client) {
      try {
        // Stop watchdog (pass any number, it's not actually used for stopping)
        await client.stopPhoneWatchdog(0);

        // Close client
        await client.close();

        this.logger.log(`Session closed for tenant ${tenantId}`);
      } catch (error) {
        this.logger.error(
          `Error closing session for tenant ${tenantId}: ${(error as Error).message}`,
        );
      }

      // Remove from memory
      this.clients.delete(sessionKey);
    }

    // Clear QR code data
    this.qrCodes.delete(sessionKey);
    await this.cacheManager.del(this.getQRCodeKey(tenantId));
  }

  /**
   * Close all sessions (for cleanup)
   */
  async closeAllSessions(): Promise<void> {
    this.logger.log('Closing all WPPConnect sessions');

    const closePromises = Array.from(this.clients.keys()).map(
      async (sessionKey) => {
        const tenantId = parseInt(sessionKey.replace('tenant-', ''));
        await this.closeSession(tenantId);
      },
    );

    await Promise.all(closePromises);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.clients.keys());
  }
}
