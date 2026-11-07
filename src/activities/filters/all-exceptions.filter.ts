import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let payload: Record<string, unknown>;
    if (isHttp) {
      const body = exception.getResponse();
      payload = typeof body === 'string' ? { message: body } : (body as Record<string, unknown>);
    } else {
      payload = { message: 'Error interno del servidor' };
    }

    if (!isHttp || status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      ...payload,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}