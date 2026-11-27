import type { Response } from 'express';

export function formatSseEvent(
    event: string,
    data: unknown,
): string {
    if (
        !/^[a-z][a-z0-9_.-]*$/.test(event) ||
        /[\r\n]/.test(event)
    ) {
        throw new Error('Invalid SSE event name');
    }

    const payload = JSON.stringify(data);

    if (payload === undefined) {
        throw new Error('Invalid SSE event data');
    }

    return `event: ${event}\ndata: ${payload}\n\n`;
}

export class SseWriter {
    private closed = false;

    private bytesWritten = 0;

    private readonly maxBytes = 64 * 1024;

    constructor(
        private readonly response: Response,
    ) {
        this.response.once('close', () => {
            this.closed = true;
        });
    }

    public start(): void {
        this.response.status(200);

        this.response.setHeader(
            'Content-Type',
            'text/event-stream; charset=utf-8',
        );

        this.response.setHeader(
            'Cache-Control',
            'no-cache, no-store, no-transform',
        );

        this.response.setHeader(
            'X-Accel-Buffering',
            'no',
        );

        this.response.flushHeaders();
    }

    public send(
        event: string,
        data: unknown,
    ): void {
        this.write(
            formatSseEvent(event, data),
        );
    }

    public heartbeat(): void {
        this.write(': heartbeat\n\n');
    }

    public end(): void {
        if (this.closed) {
            return;
        }

        this.closed = true;

        this.response.end();
    }

    public isClosed(): boolean {
        return (
            this.closed ||
            this.response.destroyed ||
            this.response.writableEnded
        );
    }

    private write(content: string): void {
        if (this.isClosed()) {
            return;
        }

        this.bytesWritten += Buffer.byteLength(
            content,
            'utf8',
        );

        if (this.bytesWritten > this.maxBytes) {
            this.end();
            return;
        }

        try {
            this.response.write(content);
        } catch {
            this.closed = true;
            this.response.destroy();
        }
    }
}