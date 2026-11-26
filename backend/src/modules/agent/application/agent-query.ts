import type { CustomerIdentity } from '../../auth';
import type { OrderView } from '../../orders';

import type {
    KnowledgeCitation,
    KnowledgeSearchResponse,
} from '../../knowledge';

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

export interface AgentReply {
    readonly status:
    | 'answered'
    | 'no_evidence'
    | 'not_found'
    | 'needs_input'
    | 'invalid_tool'
    | 'unavailable';

    readonly answer: string;

    readonly sources: readonly KnowledgeCitation[];
}

export interface AgentRun {
    readonly result: AgentResult;
    readonly reply: AgentReply;
}

export interface AgentQuery {
    execute(
        customer: CustomerIdentity,
        message: string,
    ): Promise<AgentRun>;
}