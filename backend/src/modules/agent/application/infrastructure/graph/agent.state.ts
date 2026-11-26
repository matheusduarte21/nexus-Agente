
import { Annotation } from '@langchain/langgraph';
import { AgentResult } from 'src/modules/agent/application/agent-query';
import { ToolSelection } from '../../ports/agent-model.port';


export const AgentState = Annotation.Root({
    message: Annotation<string>(),

    selection: Annotation<ToolSelection>(),

    result: Annotation<AgentResult>(),
});

export type AgentGraphState =
    typeof AgentState.State;
