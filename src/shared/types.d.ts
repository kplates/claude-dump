export interface ProjectInfo {
    id: string;
    path: string;
    sessionCount: number;
    lastModified: string;
}
export interface SessionInfo {
    sessionId: string;
    projectId: string;
    firstPrompt: string;
    summary: string;
    messageCount: number;
    created: string;
    modified: string;
    gitBranch: string;
    model?: string;
}
export type Turn = UserTurn | AssistantTurn;
export interface UserTurn {
    type: 'user';
    uuid: string;
    timestamp: string;
    text?: string;
    toolResults?: ToolResult[];
}
export interface ToolResult {
    toolUseId: string;
    content: string;
    isError?: boolean;
}
export interface AssistantTurn {
    type: 'assistant';
    uuid: string;
    timestamp: string;
    model?: string;
    blocks: TurnBlock[];
}
export type TurnBlock = ThinkingBlock | TextBlock | ToolCallBlock;
export interface ThinkingBlock {
    type: 'thinking';
    text: string;
}
export interface TextBlock {
    type: 'text';
    text: string;
}
export interface ToolCallBlock {
    type: 'tool_call';
    call: ToolCall;
}
export interface ToolCall {
    toolUseId: string;
    name: string;
    input: Record<string, unknown>;
    result?: string;
    isError?: boolean;
    diff?: string;
}
