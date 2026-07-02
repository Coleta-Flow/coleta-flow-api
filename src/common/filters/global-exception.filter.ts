import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../errors/domain.errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof DomainError) {
      const status =
        exception.code === 'GEOFENCE_VIOLATION' || exception.code === 'TENANT_ACCESS_DENIED'
          ? HttpStatus.FORBIDDEN
          : exception.code === 'TRACKING_TOKEN_EXPIRED'
            ? HttpStatus.NOT_FOUND
            : HttpStatus.UNPROCESSABLE_ENTITY;

      return response.status(status).json({
        statusCode: status,
        error: exception.code,
        message: exception.message,
        data: exception.data,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return response.status(status).json({
        statusCode: status,
        ...(typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { message: exceptionResponse }),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    this.logger.error('Unhandled exception', exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
