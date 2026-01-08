import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'An error occurred',
      error:
        typeof exceptionResponse === 'object' && 'error' in exceptionResponse
          ? (exceptionResponse as any).error
          : HttpStatus[status],
    };

    // Preserve validation errors if present
    if (
      typeof exceptionResponse === 'object' &&
      'errors' in exceptionResponse &&
      exceptionResponse.errors
    ) {
      errorResponse.errors = exceptionResponse.errors;
    }

    // Log error
    this.logger.error(`HTTP ${status} Error: ${errorResponse.message}`, {
      ...errorResponse,
      user: (request as any).user?.sub,
      tenantId: (request as any).tenantId,
    });

    response.status(status).json(errorResponse);
  }
}
