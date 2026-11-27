export function disableExternalTracing(): void {
    process.env.LANGSMITH_TRACING = 'false';

    process.env.LANGSMITH_TRACING_V2 = 'false';

    process.env.LANGCHAIN_TRACING = 'false';

    process.env.LANGCHAIN_TRACING_V2 = 'false';
}