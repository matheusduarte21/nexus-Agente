import {
    StateGraph,
    START,
    END,
} from '@langchain/langgraph';

import {
    AgentState,
} from './agent.state';

import type {
    AgentGraphState,
} from './agent.state';

import {
    AgentTools,
} from '../tools/agent-tools';

import {
    composeAgentReply,
    UNAVAILABLE_REPLY,
} from '../response/compose-agent-reply';
import { AgentQuery } from 'src/modules/agent';
import { CustomerIdentity } from 'src/modules/auth';
import { AgentRun, AgentContext, } from '../../agent-query';
import { AgentModel } from '../../ports/agent-model.port';

export class LangGraphAgent implements AgentQuery {
    constructor(
        private readonly model: AgentModel,
        private readonly tools: AgentTools,
    ) { }

    public async execute(
        customer: CustomerIdentity,
        message: string,
        context?: AgentContext,
    ): Promise<AgentRun> {
        if (
            typeof message !== 'string' ||
            !message.trim() ||
            message.length > 4000 ||
            !customer.customerId
        ) {
            const result = {
                kind: 'invalid_tool',
            } as const;

            return {
                result,

                reply: await composeAgentReply(
                    this.model,
                    '',
                    result,
                ),
            };
        }

        const trustedCustomer = Object.freeze({
            customerId: customer.customerId,
        });

        const signal = AbortSignal.timeout(30_000);

        try {
            const graph = new StateGraph(AgentState)

                .addNode(
                    'model',
                    async (state: AgentGraphState) => {
                        signal.throwIfAborted();

                        const selection =
                            await this.model.selectTool(
                                state.message,
                                signal,
                                context?.lastOrderId ?? undefined,
                            );

                        return { selection };
                    },
                )

                .addNode(
                    'tools',
                    async (state: AgentGraphState) => {
                        signal.throwIfAborted();

                        const result =
                            await this.tools.execute(
                                state.selection,
                                trustedCustomer,
                                context,
                            );

                        signal.throwIfAborted();

                        return { result };
                    },
                )

                .addNode(
                    'answer',
                    async (state: AgentGraphState) => {
                        signal.throwIfAborted();

                        const reply =
                            await composeAgentReply(
                                this.model,
                                state.message,
                                state.result,
                                signal,
                            );

                        signal.throwIfAborted();

                        return { reply };
                    },
                )

                .addEdge(START, 'model')

                .addEdge('model', 'tools')

                .addEdge('tools', 'answer')

                .addEdge('answer', END)

                .compile();

            const state = await graph.invoke(
                {
                    message: message.trim(),

                    selection: {
                        kind: 'none',
                    },

                    result: {
                        kind: 'no_tool',
                    },

                    reply: UNAVAILABLE_REPLY,
                },
                {
                    recursionLimit: 8,
                    signal,
                },
            );

            return {
                result: state.result,
                reply: state.reply,
            };
        } catch {
            return {
                result: {
                    kind: 'unavailable',
                },

                reply: UNAVAILABLE_REPLY,
            };
        }
    }
}