
import { and, eq } from 'drizzle-orm';

import type { CustomerIdentity } from '../../auth';

import type {
    DatabaseService,
} from '../../../platform/database/database.service';

import {
    chatSessions,
    chatMessages,
} from '../../../platform/database/schema';

import type {
    ChatMemory,
    SessionMemory,
} from '../application/ports/chat-memory.port';

export class PostgresChatMemory implements ChatMemory {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    public open(
        customer: CustomerIdentity,
        sessionId: string,
    ): Promise<SessionMemory> {
        return this.database.withCustomer(
            customer,
            async (tx) => {
                await tx
                    .insert(chatSessions)
                    .values({
                        id: sessionId,
                        customerId: customer.customerId,
                    })
                    .onConflictDoNothing();

                const [session] = await tx
                    .select({
                        lastOrderId: chatSessions.lastOrderId,
                    })
                    .from(chatSessions)
                    .where(
                        and(
                            eq(chatSessions.id, sessionId),
                            eq(
                                chatSessions.customerId,
                                customer.customerId,
                            ),
                        ),
                    )
                    .limit(1);

                if (!session) {
                    throw new Error('Session unavailable');
                }

                return session;
            },
        );
    }

    public appendTurn(
        customer: CustomerIdentity,
        sessionId: string,
        message: string,
        answer: string,
        lastOrderId?: string,
    ): Promise<void> {
        return this.database.withCustomer(
            customer,
            async (tx) => {
                await tx.insert(chatMessages).values([
                    {
                        customerId: customer.customerId,
                        sessionId,
                        role: 'user',
                        content: message,
                    },
                    {
                        customerId: customer.customerId,
                        sessionId,
                        role: 'assistant',
                        content: answer,
                    },
                ]);

                await tx
                    .update(chatSessions)
                    .set({
                        updatedAt: new Date(),

                        ...(lastOrderId !== undefined
                            ? { lastOrderId }
                            : {}),
                    })
                    .where(
                        and(
                            eq(chatSessions.id, sessionId),
                            eq(
                                chatSessions.customerId,
                                customer.customerId,
                            ),
                        ),
                    );
            },
        );
    }
}
