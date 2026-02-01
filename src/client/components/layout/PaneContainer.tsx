import { X } from 'lucide-react';
import { MainArea } from './MainArea';
import { EditorDropdown } from '../shared/EditorDropdown';
import type { Pane } from '../../App';
import type { ProjectInfo, SessionInfo } from '@shared/types';

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

  const multiPane = paneList.length > 1;

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
              isActive && multiPane ? 'ring-1 ring-claude-accent/40 ring-inset' : ''
            } ${multiPane ? 'border-r border-claude-border last:border-r-0' : ''}`}
            onClick={() => onActivatePane(pane.id)}
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-claude-surface border-b border-claude-border">
              <div className="truncate flex-1 min-w-0">
                <span className="text-[10px] text-claude-muted">{projectName}</span>
                <span className="text-[10px] text-claude-muted mx-1">/</span>
                <span className="text-xs text-claude-text">{truncatedTitle}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <EditorDropdown path={projectInfo?.path} />
                {multiPane && (
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
