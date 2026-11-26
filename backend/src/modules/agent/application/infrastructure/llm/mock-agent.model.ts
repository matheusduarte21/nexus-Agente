import { AgentModel, ToolSelection } from "../../ports/agent-model.port";


export class MockAgentModel implements AgentModel {
    public selectTool(
        message: string,
    ): Promise<ToolSelection> {
        const normalized = message
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .trim();

        const orderMatch = normalized.match(
            /\b(?:pedido|order)\s*#?\s*(\d{1,64})\b/,
        );

        const orderId = orderMatch?.[1];

        if (orderId && /cancelar|cancel\b/.test(normalized)) {
            return Promise.resolve({
                kind: 'none',
            });
        }

        if (orderId) {
            return Promise.resolve({
                kind: 'call',

                name: 'get_order',

                args: {
                    orderId,
                },
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
}
