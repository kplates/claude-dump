import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Plus, ChevronDown, Terminal } from 'lucide-react';
import { MainArea } from './MainArea';
import { EditorDropdown } from '../shared/EditorDropdown';
import { TerminalView } from '../terminal/TerminalView';
import type { Pane } from '../../App';
import type { ProjectInfo, SessionInfo } from '@shared/types';
import { extractTitle } from '../../utils/extractTitle';

interface PaneContainerProps {
  panes: Map<string, Pane>;
  activePaneId: string | null;
  projects: ProjectInfo[];
  sessions: Map<string, SessionInfo[]>;
  onActivatePane: (paneId: string) => void;
  onClosePane: (paneId: string) => void;
  onToggleTerminal: (paneId: string, open: boolean) => void;
  onStartNewChat?: (projectId: string) => void;
}

export function PaneContainer({
  panes,
  activePaneId,
  projects,
  sessions,
  onActivatePane,
  onClosePane,
  onToggleTerminal,
  onStartNewChat,
}: PaneContainerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const paneList = Array.from(panes.values());

  if (paneList.length === 0) {
    const selectedProject = selectedProjectId
      ? projects.find(p => p.id === selectedProjectId)
      : null;
    const projectName = selectedProject
      ? selectedProject.path.split('/').filter(Boolean).slice(-2).join('/')
      : 'Select a project';

    return (
      <div className="flex-1 flex items-center justify-center bg-claude-bg">
        <div className="text-center">
          <p className="text-lg mb-4 text-claude-text">Start a New Chat</p>
          <div className="relative inline-block mb-4">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-claude-surface border border-claude-border rounded-lg hover:bg-claude-border/50 transition-colors text-sm"
            >
              <span className={selectedProject ? 'text-claude-text' : 'text-claude-muted'}>
                {projectName}
              </span>
              <ChevronDown size={14} className="text-claude-muted" />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-claude-surface border border-claude-border rounded-lg shadow-lg z-10">
                {projects.map((project) => {
                  const name = project.path.split('/').filter(Boolean).slice(-2).join('/');
                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-claude-border/50 transition-colors text-claude-text truncate"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => selectedProjectId && onStartNewChat?.(selectedProjectId)}
              disabled={!selectedProjectId}
              className="flex items-center gap-2 px-4 py-2 bg-claude-accent text-white rounded-lg hover:bg-claude-accent/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
            >
              <Plus size={16} />
              Start Chat
            </button>
          </div>
          <p className="text-xs text-claude-muted mt-4">
            Or select a session from the sidebar
          </p>
        </div>
      </div>
    );
  }

  const multiPane = paneList.length > 1;

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
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
        const title = pane.isNewChat
          ? 'New Chat'
          : (sessionMeta?.summary || extractTitle(sessionMeta?.firstPrompt, 40));

        return (
          <div
            key={pane.id}
            className={`flex-1 flex flex-col min-w-0 ${
              isActive && multiPane ? 'ring-1 ring-claude-accent/40 ring-inset' : ''
            } ${multiPane ? 'border-r border-claude-border last:border-r-0' : ''}`}
            onClick={() => onActivatePane(pane.id)}
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-claude-surface border-b border-claude-border">
              <div className="truncate flex-1 min-w-0">
                <span className="text-[10px] text-claude-muted">{projectName}</span>
                <span className="text-[10px] text-claude-muted mx-1">/</span>
                <span className="text-xs text-claude-text">{title}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {!pane.isNewChat && (
                  <ChatDropdown
                    projectPath={projectInfo?.path}
                    sessionId={pane.session.sessionId}
                    terminalOpen={pane.terminalOpen}
                    onToggleTerminal={() => onToggleTerminal(pane.id, !pane.terminalOpen)}
                  />
                )}
                <EditorDropdown path={projectInfo?.path} />
                {(multiPane || pane.isNewChat) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClosePane(pane.id);
                    }}
                    className="p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            {pane.terminalOpen && projectInfo?.path && (
              <TerminalView
                sessionId={pane.session.sessionId}
                projectPath={projectInfo.path}
                onClose={() => pane.isNewChat ? onClosePane(pane.id) : onToggleTerminal(pane.id, false)}
                resume={!pane.isNewChat}
              />
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

function ChatDropdown({
  projectPath,
  sessionId,
  terminalOpen,
  onToggleTerminal,
}: {
  projectPath?: string;
  sessionId?: string;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
}) {
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
        title="Chat options"
        className={`p-0.5 rounded hover:bg-claude-border/50 transition-colors ${
          terminalOpen ? 'text-claude-accent' : 'text-claude-muted hover:text-claude-text'
        }`}
      >
        <MessageSquare size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-claude-surface border border-claude-border rounded-md shadow-lg py-1 min-w-[180px]">
          {sessionId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onToggleTerminal();
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-claude-text hover:bg-claude-border/30 transition-colors flex items-center gap-2"
            >
              <MessageSquare size={12} />
              {terminalOpen ? 'Close Chat' : 'Resume Chat'}
            </button>
          )}
          {sessionId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                fetch('/api/open-in-terminal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId, projectPath }),
                }).catch(() => {});
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-claude-text hover:bg-claude-border/30 transition-colors flex items-center gap-2"
            >
              <Terminal size={12} />
              Resume in Terminal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
