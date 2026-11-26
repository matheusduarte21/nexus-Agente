import type { KnowledgeEvidence } from '../../../knowledge';

export const AGENT_MODEL = Symbol('AGENT_MODEL');

export type ToolSelection =
    | {
        readonly kind: 'call';
        readonly name: string;
        readonly args: unknown;
    }
    | {
        readonly kind: 'none' | 'invalid';
    };

export interface AgentModel {
    selectTool(
        message: string,
        signal?: AbortSignal,
    ): Promise<ToolSelection>;

    generateKnowledgeAnswer(
        message: string,
        evidence: readonly KnowledgeEvidence[],
        signal?: AbortSignal,
    ): Promise<unknown>;
}