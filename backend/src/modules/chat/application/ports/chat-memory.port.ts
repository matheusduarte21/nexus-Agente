import type { CustomerIdentity } from '../../../auth';

export const CHAT_MEMORY = Symbol('CHAT_MEMORY');

export interface SessionMemory {
    readonly lastOrderId: string | null;
}

export interface ChatMemory {
    open(
        customer: CustomerIdentity,
        sessionId: string,
    ): Promise<SessionMemory>;

    appendTurn(
        customer: CustomerIdentity,
        sessionId: string,
        message: string,
        answer: string,
        lastOrderId?: string,
    ): Promise<void>;
}