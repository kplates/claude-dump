import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCall } from '@shared/types';

interface BashToolProps {
  call: ToolCall;
}

export function BashTool({ call }: BashToolProps) {
  const command = (call.input.command as string) || '';
  const description = call.input.description as string | undefined;
  const result = call.result || '';
  const lines = result.split('\n');
  const isLong = lines.length > 15;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div className="space-y-2">
      {description && (
        <div className="text-xs text-claude-muted">{description}</div>
      )}
      <div className="bg-claude-bg rounded px-3 py-2 font-mono text-xs">
        <span className="text-green-400">$</span>{' '}
        <span className="text-claude-text">{command}</span>
      </div>

      {result && (
        <div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text mb-1"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Output ({lines.length} lines)
            </button>
          )}
          {expanded && (
            <pre className="bg-claude-bg rounded px-3 py-2 font-mono text-xs text-claude-muted overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
