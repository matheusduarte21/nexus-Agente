
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
  ServiceUnavailableException,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  chatRequestSchema,
} from './schemas/chat-request.schema';

import type {
  ChatRequest,
} from './schemas/chat-request.schema';
import { AgentReply } from 'src/modules/agent';
import { CurrentUser, CustomerIdentity } from 'src/modules/auth';
import { ChatRateLimited } from 'src/modules/auth/auth.module';
import { ZodValidationPipe } from 'src/platform/http/validation/zod-validation.pipe';
import { ChatService, ChatBusyError } from '../application/ports/chat.service';

type ChatResponse = AgentReply & {
  readonly sessionId: string;
};

@Controller('chat')
export class ChatController {
  constructor(
    private readonly service: ChatService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ChatRateLimited()
  public async chat(
    @CurrentUser()
    customer: CustomerIdentity,

    @Body(
      new ZodValidationPipe(chatRequestSchema),
    )
    body: ChatRequest,

    @Req()
    request: Request,
  ): Promise<ChatResponse> {
    if (
      body.userId !== undefined &&
      body.userId !== customer.customerId
    ) {
      throw new ForbiddenException();
    }

    const correlationId =
      typeof request.id === 'string'
        ? request.id
        : randomUUID();

    try {
      const reply = await this.service.execute(
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
          ? { confirmation: reply.confirmation }
          : {}),
      };
    } catch (error: unknown) {
      if (error instanceof ChatBusyError) {
        throw new ConflictException();
      }

      throw error;
    }
  }
}
