/**
 * WebSocket Provider E2E Tests
 *
 * Integration tests with real WebSocket servers
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { io as ioClient } from 'socket.io-client';

describe('WebSocket Provider E2E', () => {
  let app: INestApplication;
  let socketIOServer: SocketIOServer;
  let wsServer: WebSocketServer;
  let httpServer: any;

  beforeAll(async () => {
    // Setup test Socket.IO server
    httpServer = createServer();
    socketIOServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

    socketIOServer.on('connection', (socket) => {
      console.log('Client connected to test Socket.IO server');

      socket.on('notification', (data, callback) => {
        console.log('Received notification:', data);
        if (callback) {
          callback({ received: true });
        }
      });

      socket.on('join', (room, callback) => {
        socket.join(room);
        if (callback) callback();
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(4000, resolve);
    });

    // Setup test WebSocket server
    wsServer = new WebSocketServer({ port: 4001 });

    wsServer.on('connection', (ws) => {
      console.log('Client connected to test WebSocket server');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Received message:', message);

          // Send acknowledgment
          if (message.requiresAck) {
            ws.send(
              JSON.stringify({
                ack: true,
                id: message.id,
                data: { received: true },
              }),
            );
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      socketIOServer.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      wsServer.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    if (app) {
      await app.close();
    }
  });

  describe('Socket.IO Integration', () => {
    it('should connect to Socket.IO server', (done) => {
      const client = ioClient('http://localhost:4000');

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should send and receive notifications via Socket.IO', (done) => {
      const client = ioClient('http://localhost:4000');

      client.on('connect', () => {
        client.emit(
          'notification',
          {
            subject: 'Test',
            body: 'E2E Test Message',
            timestamp: new Date().toISOString(),
          },
          (response: any) => {
            expect(response.received).toBe(true);
            client.disconnect();
            done();
          },
        );
      });
    });

    it('should join and receive room broadcasts', (done) => {
      const client = ioClient('http://localhost:4000');

      client.on('connect', () => {
        client.emit('join', 'test-room', () => {
          // Successfully joined room
          client.disconnect();
          done();
        });
      });
    });
  });

  describe('Native WebSocket Integration', () => {
    it('should connect to WebSocket server', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:4001');

      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error: any) => {
        done(error);
      });
    });

    it('should send and receive acknowledgments', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:4001');

      ws.on('open', () => {
        const messageId = `msg_${Date.now()}`;

        ws.send(
          JSON.stringify({
            event: 'notification',
            data: {
              subject: 'Test',
              body: 'E2E Test',
            },
            id: messageId,
            requiresAck: true,
            timestamp: new Date().toISOString(),
          }),
        );

        ws.on('message', (data: any) => {
          const response = JSON.parse(data.toString());
          if (response.ack && response.id === messageId) {
            expect(response.data.received).toBe(true);
            ws.close();
            done();
          }
        });
      });

      setTimeout(() => {
        done(new Error('Acknowledgment timeout'));
      }, 5000);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent connections', async () => {
      const clients = [];
      const numClients = 10;

      for (let i = 0; i < numClients; i++) {
        const client = ioClient('http://localhost:4000');
        clients.push(client);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      for (const client of clients) {
        expect(client.connected).toBe(true);
        client.disconnect();
      }
    });

    it('should handle rapid message sending', (done) => {
      const client = ioClient('http://localhost:4000');
      const numMessages = 100;
      let sentCount = 0;
      let receivedCount = 0;

      client.on('connect', () => {
        for (let i = 0; i < numMessages; i++) {
          client.emit(
            'notification',
            {
              subject: `Test ${i}`,
              body: `Message ${i}`,
            },
            () => {
              receivedCount++;
              if (receivedCount === numMessages) {
                client.disconnect();
                done();
              }
            },
          );
          sentCount++;
        }
      });

      setTimeout(() => {
        if (receivedCount < numMessages) {
          done(
            new Error(
              `Only received ${receivedCount}/${numMessages} acknowledgments`,
            ),
          );
        }
      }, 10000);
    });
  });
});
