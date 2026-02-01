import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCall } from '@shared/types';

interface ReadToolProps {
  call: ToolCall;
}

export function ReadTool({ call }: ReadToolProps) {
  const result = call.result || '';
  const lines = result.split('\n');
  const isLong = lines.length > 20;
  const [expanded, setExpanded] = useState(!isLong);

  if (!result) {
    return <div className="text-xs text-claude-muted">(no content)</div>;
  }

  return (
    <div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text mb-1"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {lines.length} lines
        </button>
      )}
      {expanded && (
        <pre className="bg-claude-bg rounded px-3 py-2 font-mono text-xs text-claude-muted overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
