
import { OrderQuery } from 'src/modules/orders/application/order-query';
import {
    getOrderSchema,
    searchKnowledgeSchema,
} from './tool-definitions';
import { KnowledgeQuery } from 'src/modules/knowledge/application/knowledge-query';
import { AgentResult } from 'src/modules/agent/application/agent-query';
import { CustomerIdentity } from 'src/modules/auth';
import { ToolSelection } from '../../ports/agent-model.port';
import type {
    CancellationWorkflow,
} from 'src/modules/cancellation/application/cancellation-workflow';

import type {
    AgentContext,
} from 'src/modules/agent/application/agent-query';
export class AgentTools {
    constructor(
        private readonly orderQuery: OrderQuery,
        private readonly knowledgeQuery: KnowledgeQuery,
        private readonly cancellation?: CancellationWorkflow,
    ) { }

    public async execute(
        selection: ToolSelection,
        customer: CustomerIdentity,
        context?: AgentContext,
    ): Promise<AgentResult> {
        if (selection.kind === 'none') {
            return { kind: 'no_tool' };
        }

        if (selection.kind !== 'call') {
            return { kind: 'invalid_tool' };
        }

        try {
            switch (selection.name) {
                case 'get_order': {
                    const args = getOrderSchema.safeParse(
                        selection.args,
                    );

                    if (!args.success) {
                        return { kind: 'invalid_tool' };
                    }

                    const order = await this.orderQuery.execute(
                        customer,
                        args.data.orderId,
                    );

                    if (!order) {
                        return { kind: 'not_found' };
                    }

                    return {
                        kind: 'order',
                        order,
                    };
                }

                case 'search_knowledge': {
                    const args = searchKnowledgeSchema.safeParse(
                        selection.args,
                    );

                    if (!args.success) {
                        return { kind: 'invalid_tool' };
                    }

                    const knowledge =
                        await this.knowledgeQuery.execute(
                            args.data.query,
                        );

                    if (knowledge.status === 'unavailable') {
                        return { kind: 'unavailable' };
                    }

                    return {
                        kind: 'knowledge',
                        knowledge,
                    };
                }
                case 'request_cancellation': {
                    const args = getOrderSchema.safeParse(
                        selection.args,
                    );

                    if (
                        !args.success ||
                        !context ||
                        !this.cancellation
                    ) {
                        return { kind: 'invalid_tool' };
                    }

                    const cancellation =
                        await this.cancellation.prepare(
                            {
                                customer,
                                sessionId: context.sessionId,
                                correlationId: context.correlationId,
                            },
                            args.data.orderId,
                        );

                    return {
                        kind: 'cancellation',
                        cancellation,
                    };
                }
                default:
                    return { kind: 'invalid_tool' };
            }
        } catch {
            return { kind: 'unavailable' };
        }
    }
}
