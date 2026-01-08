/**
 * WPPConnect Webhook Controller
 * 
 * Handles QR code retrieval, session management, and status updates for WPPConnect.
 * 
 * Reference: https://wppconnect.io/docs/tutorial/basics/receiving-messages
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Logger,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { SessionManagerService } from '../../../common/providers/implementations/whatsapp/session-manager.service';

@ApiTags('Webhooks - WPPConnect')
@Controller('webhooks/wppconnect')
export class WPPConnectWebhookController {
  private readonly logger = new Logger(WPPConnectWebhookController.name);

  constructor(private readonly sessionManager: SessionManagerService) {}

  @Get('qr/:tenantId')
  @Public()
  @ApiOperation({ summary: 'Get QR code for WhatsApp authentication' })
  @ApiParam({ name: 'tenantId', type: 'number', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'QR code retrieved successfully',
    schema: {
      example: {
        qrCode: 'data:image/png;base64,...',
        asciiQR: '█████████...',
        urlCode: 'qr-data-ref',
        expiresAt: '2026-01-08T10:05:00Z',
        attempts: 1,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'QR code not found' })
  async getQRCode(@Param('tenantId', ParseIntPipe) tenantId: number) {
    this.logger.log(`Retrieving QR code for tenant ${tenantId}`);

    const qrData = await this.sessionManager.getQRCode(tenantId);

    if (!qrData) {
      throw new NotFoundException(
        `QR code not found for tenant ${tenantId}. Please initiate a WhatsApp message first.`,
      );
    }

    return qrData;
  }

  @Get('session/:tenantId')
  @Public()
  @ApiOperation({ summary: 'Get session status for tenant' })
  @ApiParam({ name: 'tenantId', type: 'number', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Session status retrieved successfully',
    schema: {
      example: {
        tenantId: 1,
        sessionName: 'tenant-1',
        status: 'CONNECTED',
        isConnected: true,
        lastActivity: '2026-01-08T10:00:00Z',
      },
    },
  })
  async getSessionStatus(@Param('tenantId', ParseIntPipe) tenantId: number) {
    this.logger.log(`Retrieving session status for tenant ${tenantId}`);

    const status = await this.sessionManager.getSessionStatus(tenantId);

    return status;
  }

  @Post('session/:tenantId/disconnect')
  @Public()
  @ApiOperation({ summary: 'Disconnect WhatsApp session for tenant' })
  @ApiParam({ name: 'tenantId', type: 'number', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Session disconnected successfully',
    schema: {
      example: {
        success: true,
        message: 'Session disconnected for tenant 1',
      },
    },
  })
  async disconnectSession(@Param('tenantId', ParseIntPipe) tenantId: number) {
    this.logger.log(`Disconnecting session for tenant ${tenantId}`);

    await this.sessionManager.closeSession(tenantId);

    return {
      success: true,
      message: `Session disconnected for tenant ${tenantId}`,
    };
  }

  @Get('sessions/active')
  @Public()
  @ApiOperation({ summary: 'Get all active WPPConnect sessions' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
    schema: {
      example: {
        count: 3,
        sessions: ['tenant-1', 'tenant-2', 'tenant-5'],
      },
    },
  })
  async getActiveSessions() {
    this.logger.log('Retrieving all active sessions');

    const sessions = this.sessionManager.getActiveSessions();

    return {
      count: sessions.length,
      sessions,
    };
  }
}
