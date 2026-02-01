import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCall } from '@shared/types';

interface GlobToolProps {
  call: ToolCall;
}

export function GlobTool({ call }: GlobToolProps) {
  const pattern = call.input.pattern as string | undefined;
  const result = call.result || '';
  const files = result.split('\n').filter(Boolean);
  const isLong = files.length > 15;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div className="space-y-2">
      {pattern && (
        <div className="bg-claude-bg rounded px-3 py-1.5 font-mono text-xs text-claude-text">
          {pattern}
        </div>
      )}
      {files.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {files.length} file{files.length !== 1 ? 's' : ''} matched
          </button>
          {expanded && (
            <div className="mt-1 space-y-0.5">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="font-mono text-xs text-claude-muted px-3 py-0.5 truncate"
                >
                  {file}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
