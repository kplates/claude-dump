import fs from 'fs/promises';
import { createPatch } from 'diff';
import type { Turn, UserTurn, AssistantTurn, TurnBlock, ToolCall, ToolResult } from '../shared/types.js';

interface RawMessage {
  type: string;
  uuid: string;
  parentUuid?: string;
  timestamp: string;
  sessionId?: string;
  isSidechain?: boolean;
  message?: {
    role: string;
    model?: string;
    content: unknown;
  };
  toolUseResult?: {
    type: string;
    file?: { filePath: string; content: string };
    [key: string]: unknown;
  };
  sourceToolAssistantUUID?: string;
  requestId?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export async function parseSessionFile(filePath: string): Promise<Turn[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseSessionContent(content);
}

export function parseSessionContent(content: string): Turn[] {
  const lines = content.trim().split('\n');
  const messages: RawMessage[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  return buildTurns(messages);
}

export function parseNewLines(content: string): Turn[] {
  return parseSessionContent(content);
}

function buildTurns(messages: RawMessage[]): Turn[] {
  // Filter to only user and assistant messages
  const relevant = messages.filter(
    (m) => m.type === 'user' || m.type === 'assistant'
  );

  // Build a map of tool_use_id -> tool result content
  const toolResultMap = new Map<string, { content: string; isError?: boolean }>();
  for (const msg of relevant) {
    if (msg.type === 'user' && msg.message?.content && Array.isArray(msg.message.content)) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_result') {
          const resultContent = typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content);
          toolResultMap.set(block.tool_use_id, {
            content: truncateResult(resultContent),
            isError: block.is_error,
          });
        }
      }
    }
    // Also check toolUseResult for richer data
    if (msg.toolUseResult && msg.message?.content && Array.isArray(msg.message.content)) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_result' && msg.toolUseResult) {
          const existing = toolResultMap.get(block.tool_use_id);
          if (existing && msg.toolUseResult.type === 'text' && msg.toolUseResult.file) {
            // Use the file content preview from toolUseResult if available
          }
        }
      }
    }
  }

  const turns: Turn[] = [];

  // Group consecutive assistant messages by requestId into single turns
  let i = 0;
  while (i < relevant.length) {
    const msg = relevant[i];

    if (msg.type === 'user') {
      const userTurn = buildUserTurn(msg);
      if (userTurn) {
        turns.push(userTurn);
      }
      i++;
    } else if (msg.type === 'assistant') {
      // Collect all assistant messages with the same requestId
      const assistantMsgs = [msg];
      const reqId = (msg as any).requestId;
      let j = i + 1;
      while (j < relevant.length && relevant[j].type === 'assistant') {
        if (reqId && (relevant[j] as any).requestId === reqId) {
          assistantMsgs.push(relevant[j]);
          j++;
        } else {
          break;
        }
      }
      const assistantTurn = buildAssistantTurn(assistantMsgs, toolResultMap);
      if (assistantTurn) {
        turns.push(assistantTurn);
      }
      i = j;
    } else {
      i++;
    }
  }

  return turns;
}

function buildUserTurn(msg: RawMessage): UserTurn | null {
  if (!msg.message) return null;
  const content = msg.message.content;

  // Plain text user message
  if (typeof content === 'string') {
    return {
      type: 'user',
      uuid: msg.uuid,
      timestamp: msg.timestamp,
      text: content,
    };
  }

  // Tool result user message - skip these (they're paired with tool_use)
  if (Array.isArray(content) && content.some((b: any) => b.type === 'tool_result')) {
    return null;
  }

  return null;
}

function buildAssistantTurn(
  msgs: RawMessage[],
  toolResultMap: Map<string, { content: string; isError?: boolean }>
): AssistantTurn | null {
  const blocks: TurnBlock[] = [];
  let model: string | undefined;

  for (const msg of msgs) {
    if (!msg.message?.content) continue;
    model = model || msg.message.model;

    const contentBlocks = Array.isArray(msg.message.content)
      ? msg.message.content as ContentBlock[]
      : [];

    for (const block of contentBlocks) {
      if (block.type === 'thinking' && block.thinking) {
        blocks.push({ type: 'thinking', text: block.thinking });
      } else if (block.type === 'text' && block.text) {
        blocks.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use' && block.name && block.id) {
        const toolCall = buildToolCall(block, toolResultMap);
        blocks.push({ type: 'tool_call', call: toolCall });
      }
    }
  }

  if (blocks.length === 0) return null;

  return {
    type: 'assistant',
    uuid: msgs[0].uuid,
    timestamp: msgs[0].timestamp,
    model,
    blocks,
  };
}

function buildToolCall(
  block: ContentBlock,
  toolResultMap: Map<string, { content: string; isError?: boolean }>
): ToolCall {
  const input = block.input || {};
  const result = toolResultMap.get(block.id!);

  const toolCall: ToolCall = {
    toolUseId: block.id!,
    name: block.name!,
    input,
    result: result?.content,
    isError: result?.isError,
  };

  // Pre-compute diff for Edit tool
  if (block.name === 'Edit' && input.old_string && input.new_string) {
    try {
      const filePath = (input.file_path as string) || 'file';
      const fileName = filePath.split('/').pop() || filePath;
      toolCall.diff = createPatch(
        fileName,
        input.old_string as string,
        input.new_string as string,
        'before',
        'after'
      );
    } catch {
      // Diff computation failed, skip
    }
  }

  // Pre-compute diff for Write tool (new file)
  if (block.name === 'Write' && input.content) {
    try {
      const filePath = (input.file_path as string) || 'file';
      const fileName = filePath.split('/').pop() || filePath;
      toolCall.diff = createPatch(
        fileName,
        '',
        input.content as string,
        '',
        'new file'
      );
    } catch {
      // Diff computation failed, skip
    }
  }

  return toolCall;
}

function truncateResult(content: string, maxLength = 5000): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '\n... (truncated)';
}
