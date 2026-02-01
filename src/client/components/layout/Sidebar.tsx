import { ChevronRight, ChevronDown, Zap, ZapOff, MessageSquare } from 'lucide-react';
import type { ProjectInfo, SessionInfo } from '@shared/types';

interface SidebarProps {
  projects: ProjectInfo[];
  sessions: Map<string, SessionInfo[]>;
  selectedProject: string | null;
  selectedSession: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectSession: (projectId: string, sessionId: string) => void;
  connected: boolean;
}

export function Sidebar({
  projects,
  sessions,
  selectedProject,
  selectedSession,
  onSelectProject,
  onSelectSession,
  connected,
}: SidebarProps) {
  return (
    <div className="w-80 min-w-[280px] bg-claude-surface border-r border-claude-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-claude-border flex items-center justify-between">
        <h1 className="text-lg font-bold text-claude-text">ohclaudy</h1>
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
            onSelect={() => onSelectProject(project.id)}
            onSelectSession={(sessionId) =>
              onSelectSession(project.id, sessionId)
            }
          />
        ))}
      </div>
    </div>
  );
}

function ProjectItem({
  project,
  sessions,
  isExpanded,
  selectedSession,
  onSelect,
  onSelectSession,
}: {
  project: ProjectInfo;
  sessions: SessionInfo[];
  isExpanded: boolean;
  selectedSession: string | null;
  onSelect: () => void;
  onSelectSession: (sessionId: string) => void;
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
              onSelect={() => onSelectSession(session.sessionId)}
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
  onSelect,
}: {
  session: SessionInfo;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const title = session.summary || session.firstPrompt || 'Untitled';
  const truncatedTitle =
    title.length > 60 ? title.slice(0, 60) + '...' : title;
  const timeAgo = formatRelativeTime(session.modified);

  return (
    <button
      onClick={onSelect}
      className={`w-full px-3 py-2 flex items-start gap-2 text-left transition-colors ${
        isSelected
          ? 'bg-claude-accent/20 border-l-2 border-claude-accent'
          : 'hover:bg-claude-border/30 border-l-2 border-transparent'
      }`}
    >
      <MessageSquare size={12} className="text-claude-muted mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate">{truncatedTitle}</div>
        <div className="text-[10px] text-claude-muted mt-0.5">
          {timeAgo} &middot; {session.messageCount} msgs
        </div>
      </div>
    </button>
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
