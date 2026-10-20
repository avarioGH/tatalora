import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (typeof errorResponse === 'object' && errorResponse !== null) {
      message = (errorResponse as any).message || message;
      code = (errorResponse as any).error || code;
    } else if (typeof errorResponse === 'string') {
      message = errorResponse;
    }

    // Correlation ID mapping (simulate extraction from headers if available)
    const requestId = request.headers['x-request-id'] || `REQ-${Date.now()}`;

    // Log internally but do not leak Prisma stack traces to the client
    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} - ${status} - ${message}`,
    );
    if (
      status === HttpStatus.INTERNAL_SERVER_ERROR &&
      exception instanceof Error
    ) {
      this.logger.error(exception.stack);
    }

    response.status(status).json({
      success: false,
      error: {
        code:
          status === HttpStatus.UNAUTHORIZED
            ? 'AUTH_UNAUTHORIZED'
            : status === HttpStatus.FORBIDDEN
              ? 'AUTH_FORBIDDEN'
              : code,
        message,
      },
      request_id: requestId,
    });
  }
}
