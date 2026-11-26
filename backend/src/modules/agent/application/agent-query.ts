import { CustomerIdentity } from "../../auth/domain/customer-identity";
import { KnowledgeSearchResponse } from "../../knowledge";
import { OrderView } from "../../orders";

export const AGENT_QUERY = Symbol('AGENT_QUERY');

export type AgentResult =
    | {
        readonly kind: 'order';
        readonly order: OrderView;
    }
    | {
        readonly kind: 'knowledge';
        readonly knowledge: KnowledgeSearchResponse;
    }
    | {
        readonly kind:
        | 'no_tool'
        | 'not_found'
        | 'invalid_tool'
        | 'unavailable';
    };

export interface AgentQuery {
    execute(
        customer: CustomerIdentity,
        message: string,
    ): Promise<AgentResult>;
}
