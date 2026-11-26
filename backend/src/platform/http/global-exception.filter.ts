
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

import { STATUS_CODES } from 'node:http';
import type { Response } from 'express';

import { CORRELATION_HEADER } from '../logging/http-logging.middleware';

@Catch()
export class GlobalExceptionFilter
    implements ExceptionFilter {
    public catch(
        exception: unknown,
        host: ArgumentsHost,
    ): void {
        const response = host
            .switchToHttp()
            .getResponse<Response>();

        const statusCode = this.resolveStatus(exception);

        if (response.headersSent) {
            response.end();
            return;
        }

        const correlationId = response.getHeader(
            CORRELATION_HEADER,
        );

        response.status(statusCode).json({
            statusCode,

            message:
                STATUS_CODES[statusCode] ??
                'Unexpected Error',

            correlationId:
                typeof correlationId === 'string'
                    ? correlationId
                    : undefined,
        });
    }

    private resolveStatus(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus();
        }

        if (exception instanceof Error &&'statusCode' in exception) {
            const status = exception.statusCode;

            if (status === 400 || status === 413 || status === 415) {
                return status;
            }
        }

        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
