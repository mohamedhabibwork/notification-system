import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ExceptionFilter,
  BadRequestException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

/**
 * gRPC Exception Filter
 *
 * Transforms HTTP exceptions and validation errors to gRPC-compatible format
 * with proper status codes and metadata containing validation errors.
 */
@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const type = host.getType();

    // Only handle gRPC context
    if (type !== 'rpc') {
      throw exception;
    }

    const rpcContext = host.switchToRpc();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = rpcContext.getData();

    let grpcCode = GrpcStatus.UNKNOWN;
    let message = 'Internal server error';
    const details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // Map HTTP status to gRPC status
      grpcCode = this.mapHttpStatusToGrpcStatus(status);

      // Extract message
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && 'message' in response) {
        message = String((response as Record<string, unknown>).message);
      }

      // Handle validation errors
      if (
        exception instanceof BadRequestException &&
        typeof response === 'object' &&
        'errors' in response
      ) {
        details.validationErrors = (response as Record<string, unknown>).errors;

        this.logger.debug(
          `gRPC validation error: ${JSON.stringify(details.validationErrors)}`,
        );
      }
    } else if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        message = error;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        message =
          typeof errorObj.message === 'string'
            ? errorObj.message
            : 'Unknown error';
        grpcCode =
          typeof errorObj.code === 'number'
            ? errorObj.code
            : GrpcStatus.UNKNOWN;
        if (errorObj.details) {
          Object.assign(details, errorObj.details);
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      grpcCode = GrpcStatus.INTERNAL;
    }

    // Log error (data might contain any type from gRPC context)
    this.logger.error(`gRPC Error [${grpcCode}]: ${message}`, {
      code: grpcCode,
      message,
      details,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
    });

    // Construct gRPC error with metadata
    const grpcError: Record<string, unknown> = {
      code: grpcCode,
      message,
    };

    // Add validation errors to metadata if present
    if (details.validationErrors) {
      grpcError.details = JSON.stringify(details.validationErrors);
    }

    throw new RpcException(grpcError);
  }

  /**
   * Maps HTTP status codes to gRPC status codes
   */
  private mapHttpStatusToGrpcStatus(httpStatus: number): GrpcStatus {
    const statusMap: Record<number, GrpcStatus> = {
      [HttpStatus.BAD_REQUEST]: GrpcStatus.INVALID_ARGUMENT,
      [HttpStatus.UNAUTHORIZED]: GrpcStatus.UNAUTHENTICATED,
      [HttpStatus.FORBIDDEN]: GrpcStatus.PERMISSION_DENIED,
      [HttpStatus.NOT_FOUND]: GrpcStatus.NOT_FOUND,
      [HttpStatus.CONFLICT]: GrpcStatus.ALREADY_EXISTS,
      [HttpStatus.GONE]: GrpcStatus.DATA_LOSS,
      [HttpStatus.PRECONDITION_FAILED]: GrpcStatus.FAILED_PRECONDITION,
      [HttpStatus.PAYLOAD_TOO_LARGE]: GrpcStatus.OUT_OF_RANGE,
      [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: GrpcStatus.UNIMPLEMENTED,
      [HttpStatus.UNPROCESSABLE_ENTITY]: GrpcStatus.INVALID_ARGUMENT,
      [HttpStatus.TOO_MANY_REQUESTS]: GrpcStatus.RESOURCE_EXHAUSTED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: GrpcStatus.INTERNAL,
      [HttpStatus.NOT_IMPLEMENTED]: GrpcStatus.UNIMPLEMENTED,
      [HttpStatus.BAD_GATEWAY]: GrpcStatus.UNAVAILABLE,
      [HttpStatus.SERVICE_UNAVAILABLE]: GrpcStatus.UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: GrpcStatus.DEADLINE_EXCEEDED,
    };

    return statusMap[httpStatus] || GrpcStatus.UNKNOWN;
  }
}
