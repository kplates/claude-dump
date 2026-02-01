import { Bot } from 'lucide-react';
import { ThinkingBlock } from './ThinkingBlock';
import { TextBlock } from './TextBlock';
import { ToolUseBlock } from './ToolUseBlock';
import type { AssistantTurn } from '@shared/types';

interface AssistantMessageProps {
  turn: AssistantTurn;
}

export function AssistantMessage({ turn }: AssistantMessageProps) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-claude-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-claude-accent" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="text-xs text-claude-muted">
          Claude{turn.model ? ` (${formatModel(turn.model)})` : ''} &middot;{' '}
          {formatTime(turn.timestamp)}
        </div>

        {turn.blocks.map((block, idx) => {
          switch (block.type) {
            case 'thinking':
              return <ThinkingBlock key={idx} text={block.text} />;
            case 'text':
              return <TextBlock key={idx} text={block.text} />;
            case 'tool_call':
              return <ToolUseBlock key={idx} call={block.call} />;
          }
        })}
      </div>
    </div>
  );
}

function formatModel(model: string): string {
  // "claude-sonnet-4-5-20250929" -> "Sonnet 4.5"
  if (model.includes('opus')) return 'Opus';
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  return model;
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
