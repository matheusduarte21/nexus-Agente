import { Module } from '@nestjs/common';

import {
  AgentModule,
  AGENT_QUERY,
} from '../agent';

import type { AgentQuery } from '../agent';

import {
  CancellationModule,
  CANCELLATION_WORKFLOW,
} from '../cancellation';

import type {
  CancellationWorkflow,
} from '../cancellation';

import {
  DatabaseModule,
} from '../../platform/database/database.module';

import {
  DatabaseService,
} from '../../platform/database/database.service';

import {
  CHAT_MEMORY,
} from './application/ports/chat-memory.port';

import type {
  ChatMemory,
} from './application/ports/chat-memory.port';

import {
  PostgresChatMemory,
} from './infrastructure/postgres-chat-memory';

import {
  ChatController,
} from './presentation/chat.controller';
import { ChatService } from './application/ports/chat.service';

@Module({
  imports: [
    AgentModule,
    CancellationModule,
    DatabaseModule,
  ],

  controllers: [ChatController],

  providers: [
    {
      provide: CHAT_MEMORY,

      inject: [DatabaseService],

      useFactory: (
        database: DatabaseService,
      ): ChatMemory =>
        new PostgresChatMemory(database),
    },

    {
      provide: ChatService,

      inject: [
        CHAT_MEMORY,
        AGENT_QUERY,
        CANCELLATION_WORKFLOW,
      ],

      useFactory: (
        memory: ChatMemory,
        agent: AgentQuery,
        cancellation: CancellationWorkflow,
      ): ChatService =>
        new ChatService(
          memory,
          agent,
          cancellation,
        ),
    },
  ],
})
export class ChatModule { }