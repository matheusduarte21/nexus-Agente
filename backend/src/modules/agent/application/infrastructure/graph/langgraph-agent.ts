
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
import { CustomerIdentity } from 'src/modules/auth/domain/customer-identity';
import { AgentQuery, AgentResult } from 'src/modules/agent/application/agent-query';
import { AgentModel } from '../../ports/agent-model.port';

export class LangGraphAgent implements AgentQuery {
    constructor(
        private readonly model: AgentModel,

        private readonly tools: AgentTools,
    ) { }

    public async execute(
        customer: CustomerIdentity,
        message: string,
    ): Promise<AgentResult> {
        if (
            typeof message !== 'string' ||
            !message.trim() ||
            message.length > 4000 ||
            !customer.customerId
        ) {
            return { kind: 'invalid_tool' };
        }

        const trustedCustomer = Object.freeze({
            customerId: customer.customerId,
        });

        const graph = new StateGraph(AgentState)

            .addNode(
                'model',
                async (state: AgentGraphState) => {
                    const selection =
                        await this.model.selectTool(state.message);

                    return { selection };
                },
            )

            .addNode(
                'tools',
                async (state: AgentGraphState) => {
                    const result = await this.tools.execute(
                        state.selection,
                        trustedCustomer,
                    );

                    return { result };
                },
            )

            .addEdge(START, 'model')

            .addConditionalEdges(
                'model',

                (state) =>
                    state.selection.kind === 'none'
                        ? END
                        : 'tools',

                ['tools', END],
            )

            .addEdge('tools', END)

            .compile();

        try {
            const result = await graph.invoke(
                {
                    message: message.trim(),

                    selection: {
                        kind: 'none',
                    },

                    result: {
                        kind: 'no_tool',
                    },
                },
                {
                    recursionLimit: 6,
                },
            );

            return result.result;
        } catch {
            return { kind: 'unavailable' };
        }
    }
}
