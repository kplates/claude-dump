import { Terminal } from 'lucide-react';

export function ResumeDropdown({ sessionId, projectPath }: { sessionId: string; projectPath?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        fetch('/api/open-in-terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, projectPath }),
        }).catch(() => {});
      }}
      title="Open in terminal"
      className="p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-colors"
    >
      <Terminal size={12} />
    </button>
  );
}
