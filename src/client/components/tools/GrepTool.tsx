import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCall } from '@shared/types';

interface GrepToolProps {
  call: ToolCall;
}

export function GrepTool({ call }: GrepToolProps) {
  const pattern = call.input.pattern as string | undefined;
  const result = call.result || '';
  const lines = result.split('\n').filter(Boolean);
  const isLong = lines.length > 15;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div className="space-y-2">
      {pattern && (
        <div className="bg-claude-bg rounded px-3 py-1.5 font-mono text-xs">
          <span className="text-claude-muted">/</span>
          <span className="text-yellow-300">{pattern}</span>
          <span className="text-claude-muted">/</span>
        </div>
      )}
      {lines.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {lines.length} result{lines.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <pre className="mt-1 bg-claude-bg rounded px-3 py-2 font-mono text-xs text-claude-muted overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
