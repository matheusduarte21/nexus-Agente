import {
    Body,
    Controller,
    ForbiddenException,
    Header,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    ServiceUnavailableException,
} from '@nestjs/common';


import {
    CurrentUser,
    type CustomerIdentity,
} from '../../auth';

import {
    AGENT_QUERY,
} from '../../agent';

import type {
    AgentQuery,
    AgentReply,
} from '../../agent';

import {
    ZodValidationPipe,
} from '../../../platform/http/validation/zod-validation.pipe';

import {
    chatRequestSchema,
} from './schemas/chat-request.schema';

import type {
    ChatRequest,
} from './schemas/chat-request.schema';
import { ChatRateLimited } from 'src/modules/auth/auth.module';

type ChatResponse = AgentReply & {
    readonly sessionId: string;
};

@Controller('chat')
export class ChatController {
    constructor(
        @Inject(AGENT_QUERY)
        private readonly agent: AgentQuery,
    ) { }

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
    ): Promise<ChatResponse> {
        if (
            body.userId !== undefined &&
            body.userId !== customer.customerId
        ) {
            throw new ForbiddenException();
        }

        const { reply } = await this.agent.execute(
            customer,
            body.message,
        );

        if (reply.status === 'unavailable') {
            throw new ServiceUnavailableException();
        }

        return {
            sessionId: body.sessionId,

            status: reply.status,

            answer: reply.answer,

            sources: reply.sources,
        };
    }
}