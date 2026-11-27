
import { randomUUID } from 'node:crypto';

import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';

import type {
  Request,
  Response,
} from 'express';


import {
  CurrentUser,
  type CustomerIdentity,
} from '../../auth';

import type { AgentReply } from '../../agent';

import {
  ZodValidationPipe,
} from '../../../platform/http/validation/zod-validation.pipe';

import {
  withChatTelemetry,
} from '../../../platform/observability/telemetry';

import type {
  ProgressListener,
} from '../../../platform/observability/telemetry';


import {
  chatRequestSchema,
} from './schemas/chat-request.schema';

import type {
  ChatRequest,
} from './schemas/chat-request.schema';

import {
  SseWriter,
} from './streaming/sse-writer';
import { ChatBusyError, ChatService } from '../application/ports/chat.service';
import { ChatRateLimited } from 'src/modules/auth/auth.module';

type ChatResponse = AgentReply & {
  readonly sessionId: string;
};

@Controller('chat')
export class ChatController {
  constructor(
    private readonly service: ChatService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ChatRateLimited()
  public chat(
    @CurrentUser()
    customer: CustomerIdentity,

    @Body(
      new ZodValidationPipe(chatRequestSchema),
    )
    body: ChatRequest,

    @Req()
    request: Request,
  ): Promise<ChatResponse> {
    this.validateIdentity(customer, body);

    return this.runChat(
      customer,
      body,
      this.getCorrelationId(request),
    );
  }

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  @ChatRateLimited()
  public async stream(
    @CurrentUser()
    customer: CustomerIdentity,

    @Body(
      new ZodValidationPipe(chatRequestSchema),
    )
    body: ChatRequest,

    @Req()
    request: Request,

    @Res()
    response: Response,
  ): Promise<void> {
    // Validate before opening the SSE connection.
    this.validateIdentity(customer, body);

    const correlationId =
      this.getCorrelationId(request);

    const writer = new SseWriter(response);

    writer.start();

    writer.send('message.received', {
      sessionId: body.sessionId,
      correlationId,
    });

    const heartbeat = setInterval(
      () => writer.heartbeat(),
      10_000,
    );

    const deadline = setTimeout(() => {
      writer.send('error', {
        code: 'STREAM_TIMEOUT',

        message:
          'O tempo de espera foi excedido. O resultado da operação pode ainda estar pendente.',
      });

      writer.end();
    }, 45_000);

    const cleanup = (): void => {
      clearInterval(heartbeat);
      clearTimeout(deadline);
    };

    response.once('close', cleanup);

    try {
      const result = await this.runChat(
        customer,
        body,
        correlationId,
        (event, data) =>
          writer.send(event, data),
      );

      if (writer.isClosed()) {
        return;
      }

      // Only stream the final validated answer.
      const characters = Array.from(
        result.answer,
      );

      const chunkSize = 120;

      for (
        let offset = 0;
        offset < characters.length;
        offset += chunkSize
      ) {
        writer.send('response.delta', {
          text: characters
            .slice(offset, offset + chunkSize)
            .join(''),
        });
      }

      writer.send('sources', {
        sources: result.sources,
      });

      writer.send(
        'response.completed',
        result,
      );
    } catch (error: unknown) {
      writer.send('error', {
        code:
          error instanceof ConflictException
            ? 'SESSION_BUSY'
            : 'CHAT_UNAVAILABLE',

        message:
          error instanceof ConflictException
            ? 'Esta sessão já está processando uma mensagem.'
            : 'Não foi possível concluir o processamento neste momento.',

        correlationId,
      });
    } finally {
      cleanup();

      response.removeListener(
        'close',
        cleanup,
      );

      writer.end();
    }
  }

  private runChat(
    customer: CustomerIdentity,
    body: ChatRequest,
    correlationId: string,
    listener?: ProgressListener,
  ): Promise<ChatResponse> {
    return withChatTelemetry(
      correlationId,
      async () => {
        try {
          const reply =
            await this.service.execute(
              customer,
              body.sessionId,
              body.message,
              correlationId,
              body.confirmation,
            );

          if (reply.status === 'unavailable') {
            throw new ServiceUnavailableException();
          }

          return {
            sessionId: body.sessionId,
            status: reply.status,
            answer: reply.answer,
            sources: reply.sources,

            ...(reply.confirmation
              ? {
                confirmation:
                  reply.confirmation,
              }
              : {}),
          };
        } catch (error: unknown) {
          if (error instanceof ChatBusyError) {
            throw new ConflictException();
          }

          throw error;
        }
      },
      listener,
    );
  }

  private validateIdentity(
    customer: CustomerIdentity,
    body: ChatRequest,
  ): void {
    if (
      body.userId !== undefined &&
      body.userId !== customer.customerId
    ) {
      throw new ForbiddenException();
    }
  }

  private getCorrelationId(
    request: Request,
  ): string {
    return typeof request.id === 'string'
      ? request.id
      : randomUUID();
  }
}
