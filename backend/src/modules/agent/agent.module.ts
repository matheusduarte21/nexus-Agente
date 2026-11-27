
import { Module } from '@nestjs/common';

import {
    ConfigModule,
    ConfigService,
} from '@nestjs/config';

import type {
    Environment,
} from '../../config/env.schema';

import {
    OrdersModule,
    GET_ORDER,
} from '../orders';

import type {
    OrderQuery,
} from '../orders';

import {
    KnowledgeModule,
    SEARCH_KNOWLEDGE,
} from '../knowledge';
import {
    CancellationModule,
    CANCELLATION_WORKFLOW,
} from '../cancellation';

import type {
    CancellationWorkflow,
} from '../cancellation';
import type {
    KnowledgeQuery,
} from '../knowledge';
import { AGENT_MODEL, AgentModel } from './application/ports/agent-model.port';
import { AGENT_QUERY } from './application/agent-query';
import { LangGraphAgent } from './application/infrastructure/graph/langgraph-agent';
import { MockAgentModel } from './application/infrastructure/llm/mock-agent.model';
import { OpenAIAgentModel } from './application/infrastructure/llm/openai-agent.model';
import { AgentTools } from './application/infrastructure/tools/agent-tools';

@Module({
    imports: [
        ConfigModule,
        OrdersModule,
        KnowledgeModule,
        CancellationModule,
    ],

    providers: [
        {
            provide: AGENT_MODEL,

            inject: [ConfigService],

            useFactory: (
                config: ConfigService<Environment, true>,
            ): AgentModel => {
                const environment = config.getOrThrow(
                    'NODE_ENV',
                    { infer: true },
                );

                if (environment === 'test') {
                    return new MockAgentModel();
                }

                const provider = config.getOrThrow(
                    'LLM_PROVIDER',
                    { infer: true },
                );

                if (provider === 'mock') {
                    return new MockAgentModel();
                }

                const apiKey = config.get(
                    'OPENAI_API_KEY',
                    { infer: true },
                );

                const modelName = config.getOrThrow(
                    'LLM_MODEL',
                    { infer: true },
                );

                if (!apiKey) {
                    throw new Error(
                        'OpenAI configuration is required',
                    );
                }

                return new OpenAIAgentModel(
                    apiKey,
                    modelName,
                );
            },
        },

        {
            provide: AgentTools,

            inject: [
                GET_ORDER,
                SEARCH_KNOWLEDGE,
                CANCELLATION_WORKFLOW,
            ],

            useFactory: (
                orders: OrderQuery,
                knowledge: KnowledgeQuery,
                cancellation: CancellationWorkflow,
            ): AgentTools =>
                new AgentTools(
                    orders,
                    knowledge,
                    cancellation,
                ),
        },

        {
            provide: AGENT_QUERY,

            inject: [
                AGENT_MODEL,
                AgentTools,
            ],

            useFactory: (
                model: AgentModel,
                tools: AgentTools,
            ): LangGraphAgent =>
                new LangGraphAgent(model, tools),
        },
    ],

    exports: [AGENT_QUERY],
})
export class AgentModule { }
