import { DiffViewer } from '../diff/DiffViewer';
import type { ToolCall } from '@shared/types';

interface EditToolProps {
  call: ToolCall;
}

export function EditTool({ call }: EditToolProps) {
  const filePath = call.input.file_path as string | undefined;

  if (call.diff) {
    return <DiffViewer diff={call.diff} />;
  }

  // Fallback: show old/new strings
  const oldStr = call.input.old_string as string | undefined;
  const newStr = call.input.new_string as string | undefined;

  return (
    <div className="space-y-2">
      {filePath && (
        <div className="text-xs text-claude-muted font-mono">{filePath}</div>
      )}
      {oldStr && (
        <div>
          <div className="text-xs text-red-400 mb-1">Removed:</div>
          <pre className="bg-red-900/10 rounded px-3 py-2 font-mono text-xs text-red-300 overflow-x-auto whitespace-pre-wrap">
            {oldStr}
          </pre>
        </div>
      )}
      {newStr && (
        <div>
          <div className="text-xs text-green-400 mb-1">Added:</div>
          <pre className="bg-green-900/10 rounded px-3 py-2 font-mono text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
            {newStr}
          </pre>
        </div>
      )}
    </div>
  );
}
