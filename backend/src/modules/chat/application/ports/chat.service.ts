import { AgentQuery, AgentReply, cancellationReply } from "src/modules/agent";
import { CustomerIdentity } from "src/modules/auth";
import { CancellationWorkflow } from "src/modules/cancellation";
import { ChatMemory } from "./chat-memory.port";
import { observeStage } from "src/platform/observability/telemetry";

export interface ChatConfirmation {
    readonly requestId: string;
    readonly decision: 'confirm' | 'reject';
}

export class ChatBusyError extends Error {
    constructor() {
        super('Session already processing a message');
        this.name = 'ChatBusyError';
    }
}

export class ChatService {
    private readonly activeSessions = new Set<string>();

    constructor(
        private readonly memory: ChatMemory,
        private readonly agent: AgentQuery,
        private readonly cancellation: CancellationWorkflow,
    ) { }

    public async execute(
        customer: CustomerIdentity,
        sessionId: string,
        message: string,
        correlationId: string,
        confirmation?: ChatConfirmation,
    ): Promise<AgentReply> {
        const key = JSON.stringify([
            customer.customerId,
            sessionId,
        ]);

        if (this.activeSessions.has(key)) {
            throw new ChatBusyError();
        }

        this.activeSessions.add(key);

        try {
            const session = await observeStage(
                'memory',
                () =>
                    this.memory.open(
                        customer,
                        sessionId,
                    ),
            );

            let reply: AgentReply;

            let lastOrderId: string | undefined;

            if (confirmation) {
                const outcome = await observeStage(
                    'confirmation',
                    () =>
                        this.cancellation.decide(
                            {
                                customer,
                                sessionId,
                                correlationId,
                            },
                            confirmation.requestId,
                            confirmation.decision,
                        ),
                );

                reply = cancellationReply(outcome);
            } else if (
                /^(sim|não|nao|confirmo|yes|no)[!. ]*$/i
                    .test(message.trim())
            ) {
                reply = {
                    status: 'needs_input',

                    answer:
                        'Para confirmar ou recusar um cancelamento, utilize a ação de confirmação vinculada à solicitação.',

                    sources: [],
                };
            } else {
                const execution = await this.agent.execute(
                    customer,
                    message,
                    {
                        sessionId,
                        correlationId,
                        lastOrderId: session.lastOrderId,
                    },
                );

                reply = execution.reply;

                if (execution.result.kind === 'order') {
                    lastOrderId = execution.result.order.id;
                }

                if (
                    execution.result.kind === 'cancellation' &&
                    execution.result.cancellation.kind ===
                    'confirmation_required'
                ) {
                    lastOrderId =
                        execution.result.cancellation.confirmation.orderId;
                }
            }

            const storedMessage = confirmation
                ? `Cancellation decision: ${confirmation.decision}`
                : message;

            await observeStage(
                'persistence',
                () =>
                    this.memory.appendTurn(
                        customer,
                        sessionId,
                        storedMessage,
                        reply.answer,
                        lastOrderId,
                    ),
            );

            return reply;
        } catch {
            return {
                status: 'unavailable',

                answer:
                    'Não foi possível processar sua solicitação neste momento.',

                sources: [],
            };
        } finally {
            this.activeSessions.delete(key);
        }
    }
}
