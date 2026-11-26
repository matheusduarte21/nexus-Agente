
import { OrderQuery } from 'src/modules/orders/application/order-query';
import {
    getOrderSchema,
    searchKnowledgeSchema,
} from './tool-definitions';
import { KnowledgeQuery } from 'src/modules/knowledge/application/knowledge-query';
import { AgentResult } from 'src/modules/agent/application/agent-query';
import { CustomerIdentity } from 'src/modules/auth';
import { ToolSelection } from '../../ports/agent-model.port';

export class AgentTools {
    constructor(
        private readonly orderQuery: OrderQuery,

        private readonly knowledgeQuery: KnowledgeQuery,
    ) { }

    public async execute(
        selection: ToolSelection,

        customer: CustomerIdentity,
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

                default:
                    return { kind: 'invalid_tool' };
            }
        } catch {
            return { kind: 'unavailable' };
        }
    }
}
