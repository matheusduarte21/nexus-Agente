
import { randomUUID } from 'node:crypto';

import {
    and,
    eq,
    inArray,
    or,
    sql,
} from 'drizzle-orm';

import type {
    DatabaseService,
} from '../../../platform/database/database.service';

import type {
    DatabaseTransaction,
} from '../../../platform/database/customer-transaction';

import {
    cancellationRequests,
    auditEvents,
} from '../../../platform/database/schema';

import type {
    CancellationContext,
    CancellationOutcome,
} from '../application/cancellation-workflow';
import { CancellationStore, ClaimedCancellation } from '../application/ports/cancellation-store.port';


export class PostgresCancellationStore
    implements CancellationStore {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    public prepare(
        context: CancellationContext,
        orderId: string,
    ): Promise<CancellationOutcome> {
        const customerId = context.customer.customerId;

        return this.database.withCustomer(
            context.customer,
            async (tx) => {

                await tx.execute(sql`
          SELECT pg_advisory_xact_lock(
            701,
            hashtext(${customerId})
          )
        `);

                const expired = await tx
                    .update(cancellationRequests)
                    .set({
                        status: 'expired',
                        updatedAt: sql`now()`,
                    })
                    .where(
                        and(
                            eq(cancellationRequests.customerId, customerId),
                            eq(
                                cancellationRequests.status,
                                'awaiting_confirmation',
                            ),
                            sql`${cancellationRequests.expiresAt} <= now()`,
                        ),
                    )
                    .returning({
                        id: cancellationRequests.id,
                    });

                for (const request of expired) {
                    await this.audit(
                        tx,
                        context,
                        request.id,
                        'CANCELLATION_EXPIRED',
                    );
                }

                const existing = await tx
                    .select()
                    .from(cancellationRequests)
                    .where(
                        and(
                            eq(cancellationRequests.customerId, customerId),
                            or(
                                and(
                                    eq(cancellationRequests.sessionId, context.sessionId),
                                    inArray(cancellationRequests.status, [
                                        'awaiting_confirmation',
                                        'confirmed',
                                        'processing',
                                    ]),
                                ),
                                and(
                                    eq(cancellationRequests.orderId, orderId),
                                    inArray(cancellationRequests.status, [
                                        'awaiting_confirmation',
                                        'confirmed',
                                        'processing',
                                        'requested',
                                    ]),
                                ),
                            ),
                        ),
                    );

                const pending = existing.find(
                    (request) =>
                        request.sessionId === context.sessionId &&
                        request.orderId === orderId &&
                        request.status === 'awaiting_confirmation',
                );

                if (pending) {
                    return {
                        kind: 'confirmation_required',

                        confirmation: {
                            requestId: pending.id,
                            orderId: pending.orderId,
                            expiresAt: pending.expiresAt.toISOString(),
                        },
                    };
                }

                if (existing.length > 0) {
                    return { kind: 'conflict' };
                }

                const [created] = await tx
                    .insert(cancellationRequests)
                    .values({
                        customerId,
                        sessionId: context.sessionId,
                        orderId,
                        idempotencyKey: randomUUID(),
                        status: 'awaiting_confirmation',
                        expiresAt: sql`now() + interval '5 minutes'`,
                    })
                    .returning({
                        id: cancellationRequests.id,
                        expiresAt: cancellationRequests.expiresAt,
                    });

                if (!created) {
                    throw new Error('Cancellation creation failed');
                }

                await this.audit(
                    tx,
                    context,
                    created.id,
                    'CANCELLATION_PREPARED',
                );

                return {
                    kind: 'confirmation_required',

                    confirmation: {
                        requestId: created.id,
                        orderId,
                        expiresAt: created.expiresAt.toISOString(),
                    },
                };
            },
        );
    }

    public decide(
        context: CancellationContext,
        requestId: string,
        decision: 'confirm' | 'reject',
    ): Promise<ClaimedCancellation | CancellationOutcome> {
        return this.database.withCustomer(
            context.customer,
            async (tx) => {
                const [request] = await tx
                    .select({
                        id: cancellationRequests.id,
                        orderId: cancellationRequests.orderId,
                        status: cancellationRequests.status,
                        idempotencyKey: cancellationRequests.idempotencyKey,

                        hasExpired: sql<boolean>`
              ${cancellationRequests.expiresAt} <= now()
            `,
                    })
                    .from(cancellationRequests)
                    .where(
                        this.scope(context, requestId),
                    )
                    .for('update');

                if (!request) {
                    return { kind: 'not_found' };
                }

                switch (request.status) {
                    case 'requested':
                        return { kind: 'requested' };

                    case 'processing':
                    case 'confirmed':
                        return { kind: 'processing' };

                    case 'rejected':
                        return { kind: 'rejected' };

                    case 'expired':
                        return { kind: 'expired' };

                    case 'failed':
                        return { kind: 'failed' };
                }

                if (request.hasExpired) {
                    await tx
                        .update(cancellationRequests)
                        .set({
                            status: 'expired',
                            updatedAt: sql`now()`,
                        })
                        .where(this.scope(context, requestId));

                    await this.audit(
                        tx,
                        context,
                        requestId,
                        'CANCELLATION_EXPIRED',
                    );

                    return { kind: 'expired' };
                }

                if (decision === 'reject') {
                    await tx
                        .update(cancellationRequests)
                        .set({
                            status: 'rejected',
                            updatedAt: sql`now()`,
                        })
                        .where(this.scope(context, requestId));

                    await this.audit(
                        tx,
                        context,
                        requestId,
                        'CANCELLATION_REJECTED',
                    );

                    return { kind: 'rejected' };
                }

                await tx
                    .update(cancellationRequests)
                    .set({
                        status: 'processing',
                        confirmedAt: sql`now()`,
                        updatedAt: sql`now()`,
                    })
                    .where(this.scope(context, requestId));

                await this.audit(
                    tx,
                    context,
                    requestId,
                    'CANCELLATION_CONFIRMED',
                );

                return {
                    kind: 'claimed',
                    requestId: request.id,
                    orderId: request.orderId,
                    idempotencyKey: request.idempotencyKey,
                };
            },
        );
    }

    public finish(
        context: CancellationContext,
        requestId: string,
        status: 'requested' | 'failed',
    ): Promise<void> {
        return this.database.withCustomer(
            context.customer,
            async (tx) => {
                const [updated] = await tx
                    .update(cancellationRequests)
                    .set({
                        status,
                        updatedAt: sql`now()`,
                    })
                    .where(
                        and(
                            this.scope(context, requestId),
                            eq(
                                cancellationRequests.status,
                                'processing',
                            ),
                        ),
                    )
                    .returning({
                        id: cancellationRequests.id,
                    });

                if (!updated) {
                    throw new Error('Invalid cancellation state');
                }

                await this.audit(
                    tx,
                    context,
                    requestId,
                    status === 'requested'
                        ? 'CANCELLATION_REQUESTED'
                        : 'CANCELLATION_FAILED',
                    status === 'requested'
                        ? 'success'
                        : 'failure',
                );
            },
        );
    }

    private scope(
        context: CancellationContext,
        requestId: string,
    ) {
        return and(
            eq(cancellationRequests.id, requestId),
            eq(
                cancellationRequests.customerId,
                context.customer.customerId,
            ),
            eq(
                cancellationRequests.sessionId,
                context.sessionId,
            ),
        );
    }

    private async audit(
        tx: DatabaseTransaction,
        context: CancellationContext,
        requestId: string,
        action: string,
        outcome: 'success' | 'failure' = 'success',
    ): Promise<void> {
        await tx.insert(auditEvents).values({
            actorId: context.customer.customerId,
            action,
            resourceType: 'cancellation_request',
            resourceId: requestId,
            outcome,
            correlationId: context.correlationId,
        });
    }
}
