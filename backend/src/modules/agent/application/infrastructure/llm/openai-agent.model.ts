
import { ChatOpenAI } from '@langchain/openai';

import {
    HumanMessage,
    SystemMessage,
} from '@langchain/core/messages';


import { SYSTEM_PROMPT } from '../prompts/system.prompt';

import { TOOL_DEFINITIONS } from '../tools/tool-definitions';
import { AgentModel, ToolSelection } from '../../ports/agent-model.port';

export class OpenAIAgentModel implements AgentModel {
    private readonly model: ChatOpenAI;

    constructor(
        apiKey: string,
        modelName: string,
    ) {
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
    ): Promise<ToolSelection> {
        const modelWithTools = this.model.bindTools(
            TOOL_DEFINITIONS,
            {
                parallel_tool_calls: false,

                tool_choice: 'auto',
            },
        );

        const response = await modelWithTools.invoke(
            [
                new SystemMessage(SYSTEM_PROMPT),
                new HumanMessage(message),
            ],
            {
                signal: AbortSignal.timeout(15_000),
            },
        );

        if (response.invalid_tool_calls?.length) {
            return { kind: 'invalid' };
        }

        const calls = response.tool_calls ?? [];

        if (calls.length === 0) {
            return { kind: 'none' };
        }

        if (calls.length !== 1) {
            return { kind: 'invalid' };
        }

        const [call] = calls;

        if (!call) {
            return { kind: 'invalid' };
        }

        return {
            kind: 'call',
            name: call.name,
            args: call.args,
        };
    }
}
