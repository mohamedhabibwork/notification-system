import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class ObservabilityLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private readonly configService: ConfigService) {
    this.initializeLogger();
  }

  private initializeLogger(): void {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
            return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${metaStr}`;
          }),
        ),
      }),
    ];

    // Add ELK transport if enabled
    const elkEnabled = this.configService.get<boolean>('OBSERVABILITY_ELK_ENABLED', false);
    if (elkEnabled) {
      try {
        // Note: winston-elasticsearch needs to be imported dynamically in production
        // For now, we'll log to console with JSON format for Logstash
        transports.push(
          new winston.transports.Stream({
            stream: process.stdout,
            format: winston.format.json(),
          }),
        );
      } catch (error) {
        console.error('Failed to initialize ELK transport:', error);
      }
    }

    this.logger = winston.createLogger({
      level: this.configService.get<string>('LOG_LEVEL', 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.configService.get<string>('SERVICE_NAME', 'notification-system'),
        environment: this.configService.get<string>('NODE_ENV', 'development'),
      },
      transports,
    });
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context: context || this.context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  // Custom method for structured logging
  logStructured(level: string, message: string, metadata: Record<string, any>): void {
    this.logger.log(level, message, { ...metadata, context: this.context });
  }

  // Log with correlation ID for distributed tracing
  logWithCorrelation(
    level: string,
    message: string,
    correlationId: string,
    metadata?: Record<string, any>,
  ): void {
    this.logger.log(level, message, {
      ...metadata,
      correlationId,
      context: this.context,
    });
  }
}
