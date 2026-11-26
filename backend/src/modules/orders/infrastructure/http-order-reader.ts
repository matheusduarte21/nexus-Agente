

import type { OrderReader } from '../application/ports/order-reader.port';

import { OrderProviderUnavailableError } from '../application/errors/order-provider-unavailable.error';

import { orderResponseSchema } from './order-response.schema';
import { IOrder } from '../domain/order';

export class HttpOrderReader implements OrderReader {
    private readonly timeoutMs = 3000;

    private readonly maxResponseBytes = 16 * 1024;

    constructor(
        private readonly baseUrl: string,
        private readonly serviceToken: string,
    ) { }

    public async findByIdForCustomer(
        orderId: string,
        customerId: string,
    ): Promise<IOrder | null> {
        try {
            const url = new URL(
                `/orders/${encodeURIComponent(orderId)}`,
                this.baseUrl,
            );

            const response = await fetch(url, {
                method: 'GET',

                headers: {
                    Accept: 'application/json',

                    Authorization: `Bearer ${this.serviceToken}`,

                    'X-Customer-Id': customerId,
                },

                signal: AbortSignal.timeout(this.timeoutMs),

                redirect: 'error',
            });

            if (response.status === 404) {
                await response.body?.cancel();

                return null;
            }

            if (!response.ok) {
                await response.body?.cancel();

                throw new OrderProviderUnavailableError();
            }

            const payload = await this.readJson(response);

            const result = orderResponseSchema.safeParse(payload);

            if (!result.success) {
                throw new OrderProviderUnavailableError();
            }

            return result.data;
        } catch {
            throw new OrderProviderUnavailableError();
        }
    }

    private async readJson(
        response: Response,
    ): Promise<unknown> {
        const contentType =
            response.headers.get('content-type') ?? '';

        if (
            !contentType.toLowerCase().startsWith('application/json') ||
            !response.body
        ) {
            await response.body?.cancel();

            throw new OrderProviderUnavailableError();
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8', {
            fatal: true,
        });

        let receivedBytes = 0;
        let content = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                receivedBytes += value.byteLength;

                if (receivedBytes > this.maxResponseBytes) {
                    await reader.cancel();

                    throw new OrderProviderUnavailableError();
                }

                content += decoder.decode(value, {
                    stream: true,
                });
            }

            content += decoder.decode();

            const payload: unknown = JSON.parse(content);

            return payload;
        } finally {
            reader.releaseLock();
        }
    }
}
