import { Module } from '@nestjs/common';

import {
  AgentModule,
} from '../agent';

import {
  ChatController,
} from './presentation/chat.controller';

@Module({
  imports: [AgentModule],

  controllers: [ChatController],
})
export class ChatModule {}