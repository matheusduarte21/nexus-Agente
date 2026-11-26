import { Annotation } from '@langchain/langgraph';
import { ToolSelection } from '../../ports/agent-model.port';
import { AgentResult, AgentReply } from '../../agent-query';



export const AgentState = Annotation.Root({
    message: Annotation<string>(),

    selection: Annotation<ToolSelection>(),

    result: Annotation<AgentResult>(),

    reply: Annotation<AgentReply>(),
});

export type AgentGraphState =
    typeof AgentState.State;