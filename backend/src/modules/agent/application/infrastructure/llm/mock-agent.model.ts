import { KnowledgeEvidence } from "src/modules/knowledge/application/knowledge-query";
import { AgentModel, ToolSelection } from "../../ports/agent-model.port";

export class MockAgentModel implements AgentModel {

    public selectTool(
        message: string,
        _signal?: AbortSignal,
        lastOrderId?: string,
    ): Promise<ToolSelection> {
        const normalized = message
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .trim();

        const orderMatch = normalized.match(
            /\b(?:pedido|order)\s*#?\s*(\d{1,64})\b/,
        );

        const explicitOrderId = orderMatch?.[1];

        const referencesPreviousOrder =
            /\b(dele|desse pedido|esse pedido|deste pedido|the order|it)\b/
                .test(normalized);

        const orderId =
            explicitOrderId ??
            (
                referencesPreviousOrder
                    ? lastOrderId
                    : undefined
            );

        const wantsCancellation =
            /\b(cancelar|cancele|cancel)\b/
                .test(normalized) &&
            !/\b(nao|not|never)\b/.test(normalized);

        if (wantsCancellation) {
            if (!orderId) {
                return Promise.resolve({
                    kind: 'none',
                });
            }

            return Promise.resolve({
                kind: 'call',
                name: 'request_cancellation',
                args: { orderId },
            });
        }

        if (orderId) {
            return Promise.resolve({
                kind: 'call',
                name: 'get_order',
                args: { orderId },
            });
        }

        if (
            /^(oi|ola|hello|hi|bom dia|boa tarde|boa noite)[!. ]*$/
                .test(normalized)
        ) {
            return Promise.resolve({
                kind: 'none',
            });
        }

        return Promise.resolve({
            kind: 'call',
            name: 'search_knowledge',
            args: {
                query: message,
            },
        });
    }

    public generateKnowledgeAnswer(
        _message: string,
        evidence: readonly KnowledgeEvidence[],
    ): Promise<unknown> {
        const first = evidence[0];

        if (!first) {
            return Promise.resolve({
                status: 'insufficient_evidence',
                answer: '',
                citationIds: [],
            });
        }

        return Promise.resolve({
            status: 'answered',

            answer:
                `Trecho recuperado da base de conhecimento:\n\n${first.content}`,

            citationIds: [
                first.citation.chunkId,
            ],
        });
    }
}