import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCall } from '@shared/types';

interface GenericToolProps {
  call: ToolCall;
}

export function GenericTool({ call }: GenericToolProps) {
  const result = call.result || '';
  const hasInput = Object.keys(call.input).length > 0;
  const isLong = result.split('\n').length > 10;
  const [expanded, setExpanded] = useState(!isLong);

  // Filter out large/noisy input fields
  const displayInput = Object.entries(call.input).reduce(
    (acc, [key, value]) => {
      const strVal = typeof value === 'string' ? value : JSON.stringify(value);
      if (strVal.length > 500) {
        acc[key] = strVal.slice(0, 100) + '...';
      } else {
        acc[key] = strVal;
      }
      return acc;
    },
    {} as Record<string, string>
  );

  return (
    <div className="space-y-2">
      {hasInput && (
        <div className="bg-claude-bg rounded px-3 py-2 font-mono text-xs space-y-1">
          {Object.entries(displayInput).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-claude-muted flex-shrink-0">{key}:</span>
              <span className="text-claude-text truncate">{value}</span>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text mb-1"
            >
              {expanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              Output ({result.split('\n').length} lines)
            </button>
          )}
          {expanded && (
            <pre className="bg-claude-bg rounded px-3 py-2 font-mono text-xs text-claude-muted overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap break-all">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
