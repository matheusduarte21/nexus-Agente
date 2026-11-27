
import type {
    CancellationOutcome,
} from '../../cancellation';

import type { AgentReply } from './agent-query';

export function cancellationReply(
    outcome: CancellationOutcome,
): AgentReply {
    switch (outcome.kind) {
        case 'confirmation_required':
            return {
                status: 'confirmation_required',

                answer:
                    `Você confirma que deseja solicitar o cancelamento do pedido ${outcome.confirmation.orderId}? A solicitação ainda não foi enviada.`,

                confirmation: outcome.confirmation,

                sources: [],
            };

        case 'requested':
            return {
                status: 'cancellation_requested',
                answer:
                    'Sua solicitação de cancelamento foi registrada. Isso não significa que o pedido já foi cancelado.',
                sources: [],
            };

        case 'rejected':
            return {
                status: 'cancellation_rejected',
                answer:
                    'A operação foi recusada. Nenhuma solicitação de cancelamento foi enviada.',
                sources: [],
            };

        case 'expired':
            return {
                status: 'cancellation_expired',
                answer:
                    'O prazo para confirmação expirou. Solicite o cancelamento novamente.',
                sources: [],
            };

        case 'processing':
            return {
                status: 'cancellation_processing',
                answer:
                    'A confirmação foi registrada, mas ainda não há confirmação do resultado da solicitação. Não é necessário repetir a operação.',
                sources: [],
            };

        case 'not_eligible':
            return {
                status: 'cancellation_not_eligible',
                answer:
                    'O pedido não está elegível para solicitar cancelamento.',
                sources: [],
            };

        case 'not_found':
            return {
                status: 'not_found',
                answer:
                    'Não encontrei esse pedido ou solicitação entre os recursos disponíveis para esta sessão.',
                sources: [],
            };

        case 'conflict':
            return {
                status: 'cancellation_conflict',
                answer:
                    'Já existe uma solicitação ativa ou registrada que impede iniciar outra operação.',
                sources: [],
            };

        case 'failed':
            return {
                status: 'cancellation_failed',
                answer:
                    'Não foi possível registrar a solicitação de cancelamento.',
                sources: [],
            };

        case 'unavailable':
            return {
                status: 'unavailable',
                answer:
                    'O serviço de cancelamento está temporariamente indisponível.',
                sources: [],
            };
    }
}
