import { useState, useRef, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { MainArea } from './MainArea';
import type { Pane } from '../../App';
import type { ProjectInfo, SessionInfo } from '@shared/types';

const EDITORS = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
] as const;

interface PaneContainerProps {
  panes: Map<string, Pane>;
  activePaneId: string | null;
  projects: ProjectInfo[];
  sessions: Map<string, SessionInfo[]>;
  onActivatePane: (paneId: string) => void;
  onClosePane: (paneId: string) => void;
}

export function PaneContainer({
  panes,
  activePaneId,
  projects,
  sessions,
  onActivatePane,
  onClosePane,
}: PaneContainerProps) {
  const paneList = Array.from(panes.values());

  if (paneList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-claude-bg">
        <div className="text-center text-claude-muted">
          <p className="text-lg mb-2">Claude Dump</p>
          <p className="text-sm">Select a session to view the conversation</p>
        </div>
      </div>
    );
  }

  const showTabs = paneList.length > 1;

  return (
    <div className="flex-1 flex min-w-0">
      {paneList.map((pane) => {
        const isActive = pane.id === activePaneId;
        const projectInfo = projects.find((p) => p.id === pane.session.projectId);
        const projectName = projectInfo
          ? projectInfo.path.split('/').filter(Boolean).slice(-2).join('/')
          : pane.session.projectId;
        const sessionList = sessions.get(pane.session.projectId) || [];
        const sessionMeta = sessionList.find(
          (s) => s.sessionId === pane.session.sessionId
        );
        const title = sessionMeta?.summary || sessionMeta?.firstPrompt || 'Untitled';
        const truncatedTitle = title.length > 40 ? title.slice(0, 40) + '...' : title;

        return (
          <div
            key={pane.id}
            className={`flex-1 flex flex-col min-w-0 ${
              isActive ? 'ring-1 ring-claude-accent/40 ring-inset' : ''
            } ${showTabs ? 'border-r border-claude-border last:border-r-0' : ''}`}
            onClick={() => onActivatePane(pane.id)}
          >
            {showTabs && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-claude-surface border-b border-claude-border">
                <div className="truncate flex-1 min-w-0">
                  <span className="text-[10px] text-claude-muted">{projectName}</span>
                  <span className="text-[10px] text-claude-muted mx-1">/</span>
                  <span className="text-xs text-claude-text">{truncatedTitle}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <EditorDropdown path={projectInfo?.path} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClosePane(pane.id);
                    }}
                    className="p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            <MainArea
              turns={pane.turns}
              loading={pane.loading}
              selectedSession={pane.session}
              sessions={sessions}
            />
          </div>
        );
      })}
    </div>
  );
}

function EditorDropdown({ path }: { path?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        title="Open in editor"
        className="p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-colors"
      >
        <ExternalLink size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-claude-surface border border-claude-border rounded-md shadow-lg py-1 min-w-[100px]">
          {EDITORS.map((editor) => (
            <button
              key={editor.id}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (!path) return;
                fetch('/api/open-in-editor', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ path, editor: editor.id }),
                }).catch(() => {});
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-claude-text hover:bg-claude-border/30 transition-colors"
            >
              {editor.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
