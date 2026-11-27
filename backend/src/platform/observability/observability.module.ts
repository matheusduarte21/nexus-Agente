
import {
    Injectable,
    Logger,
    Module,
    OnApplicationShutdown,
    OnModuleInit,
} from '@nestjs/common';

import {
    ConfigModule,
    ConfigService,
} from '@nestjs/config';

import {
    LangfuseSpanProcessor,
} from '@langfuse/otel';

import {
    setLangfuseTracerProvider,
} from '@langfuse/tracing';

import {
    NodeTracerProvider,
} from '@opentelemetry/sdk-trace-node';

import type {
    Environment,
} from '../../config/env.schema';

import {
    setTracingEnabled,
} from './telemetry';

@Injectable()
class ObservabilityLifecycle
    implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(
        ObservabilityLifecycle.name,
    );

    private provider?: NodeTracerProvider;

    constructor(
        private readonly config:
            ConfigService<Environment, true>,
    ) { }

    public onModuleInit(): void {
        if (
            this.config.get('NODE_ENV', {
                infer: true,
            }) === 'test'
        ) {
            return;
        }

        const enabled = this.config.get(
            'LANGFUSE_ENABLED',
            { infer: true },
        );

        if (!enabled) {
            return;
        }

        const publicKey = this.config.get(
            'LANGFUSE_PUBLIC_KEY',
            { infer: true },
        );

        const secretKey = this.config.get(
            'LANGFUSE_SECRET_KEY',
            { infer: true },
        );

        if (!publicKey || !secretKey) {
            this.logger.warn(
                'Langfuse credentials are missing; external tracing disabled',
            );

            return;
        }

        try {
            const processor =
                new LangfuseSpanProcessor({
                    publicKey,

                    secretKey,

                    baseUrl: this.config.getOrThrow(
                        'LANGFUSE_BASE_URL',
                        { infer: true },
                    ),

                    environment:
                        this.config.getOrThrow(
                            'NODE_ENV',
                            { infer: true },
                        ),

                    shouldExportSpan: ({ otelSpan }) =>
                        otelSpan.name.startsWith('nexus.'),
                });

            this.provider =
                new NodeTracerProvider({
                    spanProcessors: [processor],
                });

            setLangfuseTracerProvider(
                this.provider,
            );

            setTracingEnabled(true);

            this.logger.log(
                'Langfuse tracing enabled',
            );
        } catch {
            setTracingEnabled(false);

            this.logger.warn(
                'External tracing initialization failed',
            );
        }
    }

    public async onApplicationShutdown():
        Promise<void> {
        setTracingEnabled(false);

        try {
            await this.provider?.shutdown();
        } catch {
            this.logger.warn(
                'External tracing shutdown failed',
            );
        }
    }
}

@Module({
    imports: [ConfigModule],

    providers: [
        ObservabilityLifecycle,
    ],
})
export class ObservabilityModule { }
