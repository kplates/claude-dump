import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DiffViewer } from '../diff/DiffViewer';
import { CodeBlock } from '../common/CodeBlock';
import type { ToolCall } from '@shared/types';

interface WriteToolProps {
  call: ToolCall;
}

export function WriteTool({ call }: WriteToolProps) {
  const filePath = (call.input.file_path as string) || '';
  const content = (call.input.content as string) || '';
  const lines = content.split('\n');
  const isLong = lines.length > 30;
  const [showDiff, setShowDiff] = useState(true);
  const [expanded, setExpanded] = useState(!isLong);

  // Detect language from file extension
  const ext = filePath.split('.').pop() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    bash: 'bash',
  };
  const language = langMap[ext] || ext;

  if (call.diff && showDiff) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-green-400">New file</span>
          <button
            onClick={() => setShowDiff(false)}
            className="text-[10px] text-claude-muted hover:text-claude-text"
          >
            show source
          </button>
        </div>
        <DiffViewer diff={call.diff} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-green-400">New file</span>
        <span className="text-xs text-claude-muted">({lines.length} lines)</span>
        {call.diff && (
          <button
            onClick={() => setShowDiff(true)}
            className="text-[10px] text-claude-muted hover:text-claude-text"
          >
            show diff
          </button>
        )}
      </div>
      {isLong && !expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text"
        >
          <ChevronRight size={12} />
          Show content ({lines.length} lines)
        </button>
      ) : (
        <div>
          {isLong && (
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text mb-1"
            >
              <ChevronDown size={12} />
              Hide content
            </button>
          )}
          <CodeBlock language={language} code={content} />
        </div>
      )}
    </div>
  );
}
