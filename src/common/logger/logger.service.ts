import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    const logLevel = this.configService.get<string>('logging.level', 'info');
    const logFormat = this.configService.get<string>('logging.format', 'json');
    const enableConsole = this.configService.get<boolean>(
      'logging.enableConsole',
      true,
    );
    const enableFile = this.configService.get<boolean>(
      'logging.enableFile',
      false,
    );
    const filePath = this.configService.get<string>(
      'logging.filePath',
      './logs',
    );

    const transports: winston.transport[] = [];

    if (enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context, ...meta }) => {
                const metaStr = Object.keys(meta).length
                  ? JSON.stringify(meta)
                  : '';
                return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${metaStr}`;
              },
            ),
          ),
        }),
      );
    }

    if (enableFile) {
      transports.push(
        new winston.transports.File({
          filename: `${filePath}/error.log`,
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: `${filePath}/combined.log`,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format:
        logFormat === 'json'
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.errors({ stack: true }),
              winston.format.json(),
            )
          : winston.format.simple(),
      transports,
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context: context || this.context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }

  logWithTenant(
    message: string,
    tenantId: number,
    metadata?: Record<string, any>,
  ) {
    this.logger.info(message, { ...metadata, tenantId, context: this.context });
  }

  logWithUser(message: string, userId: string, metadata?: Record<string, any>) {
    this.logger.info(message, { ...metadata, userId, context: this.context });
  }
}
