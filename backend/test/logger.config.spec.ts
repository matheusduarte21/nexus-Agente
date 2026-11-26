
import { Writable } from 'node:stream';
import pino from 'pino';

import { createLoggerOptions } from './logger.config';

describe('Logger configuration', () => {
    let output: string;

    beforeEach(() => {
        output = '';
    });

    function createTestLogger() {
        const stream = new Writable({
            write(chunk: Buffer, _encoding, callback) {
                output += chunk.toString();
                callback();
            },
        });

        return pino(
            createLoggerOptions('info'),
            stream,
        );
    }

    it('should redact sensitive credentials', () => {
        const logger = createTestLogger();

        logger.info({
            event: 'authentication',
            password: 'fake-password-value',
            accessToken: 'fake-token-value',
            headers: {
                authorization: 'Bearer fake-credential',
            },
        });

        expect(output).toContain('[REDACTED]');

        expect(output).not.toContain(
            'fake-password-value',
        );

        expect(output).not.toContain(
            'fake-token-value',
        );

        expect(output).not.toContain(
            'fake-credential',
        );
    });

    it('should preserve safe operational fields', () => {
        const logger = createTestLogger();

        logger.info({
            event: 'http.request.completed',
            correlationId: 'example-correlation',
            durationMs: 100,
        });

        expect(output).toContain(
            '"correlationId":"example-correlation"',
        );

        expect(output).toContain(
            '"durationMs":100',
        );
    });

    it('should not log raw error details', () => {
        const logger = createTestLogger();

        logger.error({
            err: new Error('internal-sensitive-value'),
        });

        expect(output).not.toContain(
            'internal-sensitive-value',
        );
    });
});
