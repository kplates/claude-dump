import {
  Terminal,
  FileEdit,
  FilePlus,
  FileSearch,
  FolderSearch,
  Search,
  Wrench,
} from 'lucide-react';
import { BashTool } from '../tools/BashTool';
import { EditTool } from '../tools/EditTool';
import { WriteTool } from '../tools/WriteTool';
import { ReadTool } from '../tools/ReadTool';
import { GlobTool } from '../tools/GlobTool';
import { GrepTool } from '../tools/GrepTool';
import { GenericTool } from '../tools/GenericTool';
import type { ToolCall } from '@shared/types';

interface ToolUseBlockProps {
  call: ToolCall;
}

const TOOL_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }
> = {
  Bash: { icon: Terminal, label: 'Bash' },
  Edit: { icon: FileEdit, label: 'Edit' },
  Write: { icon: FilePlus, label: 'Write' },
  Read: { icon: FileSearch, label: 'Read' },
  Glob: { icon: FolderSearch, label: 'Glob' },
  Grep: { icon: Search, label: 'Grep' },
};

export function ToolUseBlock({ call }: ToolUseBlockProps) {
  const config = TOOL_CONFIG[call.name] || { icon: Wrench, label: call.name };
  const Icon = config.icon;

  // Get file path for file-related tools
  const filePath = call.input.file_path as string | undefined;
  const shortPath = filePath ? filePath.split('/').slice(-2).join('/') : null;

  return (
    <div className="rounded-lg border border-claude-border overflow-hidden bg-claude-surface/50">
      {/* Tool header */}
      <div className="px-3 py-2 flex items-center gap-2 bg-claude-border/20 border-b border-claude-border/50">
        <Icon size={13} className="text-claude-accent flex-shrink-0" />
        <span className="text-xs font-medium text-claude-text">{config.label}</span>
        {shortPath && (
          <span className="text-xs text-claude-muted truncate" title={filePath}>
            {shortPath}
          </span>
        )}
        {call.isError && (
          <span className="text-xs text-red-400 ml-auto">error</span>
        )}
      </div>

      {/* Tool content - dispatched by name */}
      <div className="p-3">
        <ToolContent call={call} />
      </div>
    </div>
  );
}

function ToolContent({ call }: { call: ToolCall }) {
  switch (call.name) {
    case 'Bash':
      return <BashTool call={call} />;
    case 'Edit':
      return <EditTool call={call} />;
    case 'Write':
      return <WriteTool call={call} />;
    case 'Read':
      return <ReadTool call={call} />;
    case 'Glob':
      return <GlobTool call={call} />;
    case 'Grep':
      return <GrepTool call={call} />;
    default:
      return <GenericTool call={call} />;
  }
}
