import type { CustomerIdentity } from '../../auth';
import type { OrderView } from '../../orders';

import type {
    KnowledgeCitation,
    KnowledgeSearchResponse,
} from '../../knowledge';
import type {
    CancellationOutcome,
    PendingConfirmation,
} from '../../cancellation';
export const AGENT_QUERY = Symbol('AGENT_QUERY');

export interface AgentContext {
    readonly sessionId: string;
    readonly correlationId: string;
    readonly lastOrderId: string | null;
}

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
    }
    | {
        readonly kind: 'cancellation';
        readonly cancellation: CancellationOutcome;
    }

export interface AgentReply {
    readonly status:
    | 'answered'
    | 'no_evidence'
    | 'not_found'
    | 'needs_input'
    | 'invalid_tool'
    | 'unavailable'
    | 'confirmation_required'
    | 'cancellation_requested'
    | 'cancellation_rejected'
    | 'cancellation_processing'
    | 'cancellation_expired'
    | 'cancellation_not_eligible'
    | 'cancellation_conflict'
    | 'cancellation_failed';

    readonly answer: string;

    readonly sources: readonly KnowledgeCitation[];

    readonly confirmation?: PendingConfirmation;
}

export interface AgentRun {
    readonly result: AgentResult;
    readonly reply: AgentReply;
}
export interface AgentQuery {
  execute(
    customer: CustomerIdentity,
    message: string,
    context?: AgentContext,
  ): Promise<AgentRun>;
}