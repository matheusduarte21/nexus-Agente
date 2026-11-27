import { ChatOpenAI } from '@langchain/openai';

import {
    HumanMessage,
    SystemMessage,
} from '@langchain/core/messages';
import {
    observeGeneration,
} from 'src/platform/observability/telemetry';
import { SYSTEM_PROMPT } from '../prompts/system.prompt';
import { ANSWER_PROMPT } from '../prompts/answer.prompt';
import { TOOL_DEFINITIONS } from '../tools/tool-definitions';
import { AIMessage } from '@langchain/core/messages';

import {
    knowledgeAnswerSchema,
} from './knowledge-answer.schema';
import { AgentModel, ToolSelection } from '../../ports/agent-model.port';
import { KnowledgeEvidence } from 'src/modules/knowledge';

export class OpenAIAgentModel implements AgentModel {
    private readonly model: ChatOpenAI;
    private readonly modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.modelName = modelName;

        this.model = new ChatOpenAI({
            apiKey,
            model: modelName,
            timeout: 15_000,
            maxRetries: 0,
            maxTokens: 1024,
            verbose: false,
            useResponsesApi: false,

            configuration: {
                baseURL: 'https://api.openai.com/v1',
            },
        });

    }

    public async selectTool(
        message: string,
        signal?: AbortSignal,
        lastOrderId?: string,
    ): Promise<ToolSelection> {
        const modelWithTools = this.model.bindTools(
            TOOL_DEFINITIONS,
            {
                parallel_tool_calls: false,
                tool_choice: 'auto',
            },
        );

        const response = await observeGeneration(
            'llm.select',
            this.modelName,

            async (recordUsage) => {
                const result =
                    await modelWithTools.invoke(
                        [
                            new SystemMessage(SYSTEM_PROMPT),

                            new HumanMessage(
                                JSON.stringify({
                                    message,
                                    lastOrderId:
                                        lastOrderId ?? null,
                                }),
                            ),
                        ],
                        {
                            signal:
                                this.createSignal(signal),
                        },
                    );

                recordUsage(
                    result.usage_metadata?.input_tokens,
                    result.usage_metadata?.output_tokens,
                );

                return result;
            },
        );

        if (response.invalid_tool_calls?.length) {
            return { kind: 'invalid' };
        }

        const calls = response.tool_calls ?? [];

        if (calls.length === 0) {
            return { kind: 'none' };
        }

        const [call] = calls;

        if (calls.length !== 1 || !call) {
            return { kind: 'invalid' };
        }

        return {
            kind: 'call',
            name: call.name,
            args: call.args,
        };
    }
    public async generateKnowledgeAnswer(
        message: string,
        evidence: readonly KnowledgeEvidence[],
        signal?: AbortSignal,
    ): Promise<unknown> {
        const structuredModel =
            this.model.withStructuredOutput(
                knowledgeAnswerSchema,
                {
                    name: 'knowledge_answer',
                    method: 'jsonSchema',
                    strict: true,

                    includeRaw: true,
                },
            );

        const payload = {
            question: message,

            evidence: evidence.map((item) => ({
                chunkId: item.citation.chunkId,
                content: item.content,
            })),
        };

        return observeGeneration(
            'llm.answer',
            this.modelName,

            async (recordUsage) => {
                const result =
                    await structuredModel.invoke(
                        [
                            new SystemMessage(
                                ANSWER_PROMPT,
                            ),

                            new HumanMessage(
                                JSON.stringify(payload),
                            ),
                        ],
                        {
                            signal:
                                this.createSignal(signal),
                        },
                    );

                recordUsage(
                    result.raw.usage_metadata?.input_tokens,
                    result.raw.usage_metadata?.output_tokens,
                );
                return result.parsed;
            },
        );
    }

    private createSignal(
        signal?: AbortSignal,
    ): AbortSignal {
        const timeout = AbortSignal.timeout(15_000);

        return signal
            ? AbortSignal.any([signal, timeout])
            : timeout;
    }
}