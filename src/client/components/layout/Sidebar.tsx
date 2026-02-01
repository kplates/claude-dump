import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Zap, ZapOff, MessageSquare, Columns2, Sun, Moon, ArrowUpCircle } from 'lucide-react';
import type { ProjectInfo, SessionInfo } from '@shared/types';

interface SidebarProps {
  projects: ProjectInfo[];
  sessions: Map<string, SessionInfo[]>;
  selectedProject: string | null;
  selectedSession: string | null;
  openSessionIds: Set<string>;
  onSelectProject: (projectId: string) => void;
  onSelectSession: (projectId: string, sessionId: string) => void;
  onOpenInNewPane: (projectId: string, sessionId: string) => void;
  connected: boolean;
}

export function Sidebar({
  projects,
  sessions,
  selectedProject,
  selectedSession,
  openSessionIds,
  onSelectProject,
  onSelectSession,
  onOpenInNewPane,
  connected,
}: SidebarProps) {
  const [light, setLight] = useState(() =>
    document.documentElement.classList.contains('light')
  );
  const [updateInfo, setUpdateInfo] = useState<{ current: string; latest: string } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
    localStorage.setItem('theme', light ? 'light' : 'dark');
  }, [light]);

  useEffect(() => {
    fetch('/api/version')
      .then((res) => res.json())
      .then((data: { current: string; latest: string | null }) => {
        if (data.latest && data.latest !== data.current) {
          setUpdateInfo({ current: data.current, latest: data.latest });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-80 min-w-[280px] bg-claude-surface border-r border-claude-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-claude-border flex items-center justify-between">
        <h1 className="text-lg font-bold text-claude-text">Claude Dump</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLight((prev) => !prev)}
            title={light ? 'Switch to dark mode' : 'Switch to light mode'}
            className="p-1 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-colors"
          >
            {light ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            {connected ? (
              <>
                <Zap size={12} className="text-green-400" />
                <span className="text-green-400">live</span>
              </>
            ) : (
              <>
                <ZapOff size={12} className="text-claude-muted" />
                <span className="text-claude-muted">offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-2">
        {projects.length === 0 && (
          <p className="text-claude-muted text-sm px-4 py-8 text-center">
            No projects found
          </p>
        )}
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            sessions={sessions.get(project.id) || []}
            isExpanded={selectedProject === project.id}
            selectedSession={selectedSession}
            openSessionIds={openSessionIds}
            onSelect={() => onSelectProject(project.id)}
            onSelectSession={(sessionId) =>
              onSelectSession(project.id, sessionId)
            }
            onOpenInNewPane={(sessionId) =>
              onOpenInNewPane(project.id, sessionId)
            }
          />
        ))}
      </div>

      {/* Update banner */}
      {updateInfo && (
        <div className="px-4 py-3 border-t border-claude-border">
          <a
            href="https://www.npmjs.com/package/claude-dump"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-claude-accent hover:underline"
          >
            <ArrowUpCircle size={14} />
            <span>v{updateInfo.latest} available (current: v{updateInfo.current})</span>
          </a>
          <p className="text-[10px] text-claude-muted mt-1">
            npm update -g claude-dump
          </p>
        </div>
      )}
    </div>
  );
}

function ProjectItem({
  project,
  sessions,
  isExpanded,
  selectedSession,
  openSessionIds,
  onSelect,
  onSelectSession,
  onOpenInNewPane,
}: {
  project: ProjectInfo;
  sessions: SessionInfo[];
  isExpanded: boolean;
  selectedSession: string | null;
  openSessionIds: Set<string>;
  onSelect: () => void;
  onSelectSession: (sessionId: string) => void;
  onOpenInNewPane: (sessionId: string) => void;
}) {
  // Show last part of path as display name
  const displayName = project.path.split('/').filter(Boolean).slice(-2).join('/');

  return (
    <div>
      <button
        onClick={onSelect}
        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-claude-border/30 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-claude-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-claude-muted flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{displayName}</div>
          <div className="text-xs text-claude-muted">
            {project.sessionCount} session{project.sessionCount !== 1 ? 's' : ''}
          </div>
        </div>
      </button>

      {isExpanded && sessions.length > 0 && (
        <div className="ml-4 border-l border-claude-border">
          {sessions.map((session) => (
            <SessionItem
              key={session.sessionId}
              session={session}
              isSelected={selectedSession === session.sessionId}
              isOpenInPane={openSessionIds.has(session.sessionId)}
              onSelect={() => onSelectSession(session.sessionId)}
              onOpenInNewPane={() => onOpenInNewPane(session.sessionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionItem({
  session,
  isSelected,
  isOpenInPane,
  onSelect,
  onOpenInNewPane,
}: {
  session: SessionInfo;
  isSelected: boolean;
  isOpenInPane: boolean;
  onSelect: () => void;
  onOpenInNewPane: () => void;
}) {
  const title = session.summary || session.firstPrompt || 'Untitled';
  const truncatedTitle =
    title.length > 60 ? title.slice(0, 60) + '...' : title;
  const timeAgo = formatRelativeTime(session.modified);

  return (
    <div
      className={`group w-full px-3 py-2 flex items-start gap-2 text-left transition-colors cursor-pointer ${
        isSelected
          ? 'bg-claude-accent/20 border-l-2 border-claude-accent'
          : isOpenInPane
            ? 'bg-claude-accent/10 border-l-2 border-claude-accent/50 hover:bg-claude-accent/15'
            : 'hover:bg-claude-border/30 border-l-2 border-transparent'
      }`}
      onClick={onSelect}
    >
      <MessageSquare size={12} className="text-claude-muted mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate">{truncatedTitle}</div>
        <div className="text-[10px] text-claude-muted mt-0.5">
          {timeAgo} &middot; {session.messageCount} msgs
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenInNewPane();
        }}
        title="Open in new pane"
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-all flex-shrink-0 mt-0.5"
      >
        <Columns2 size={12} />
      </button>
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
