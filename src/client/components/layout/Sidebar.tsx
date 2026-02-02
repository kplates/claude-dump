import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Zap, ZapOff, MessageSquare, Columns2, Sun, Moon, ArrowUpCircle, Clock, Terminal } from 'lucide-react';
import type { ProjectInfo, SessionInfo } from '@shared/types';

interface SidebarProps {
  projects: ProjectInfo[];
  sessions: Map<string, SessionInfo[]>;
  selectedProject: string | null;
  selectedSession: string | null;
  openSessionIds: Set<string>;
  sessionActivity: Map<string, string>;
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
  sessionActivity,
  onSelectProject,
  onSelectSession,
  onOpenInNewPane,
  connected,
}: SidebarProps) {
  const [light, setLight] = useState(() =>
    document.documentElement.classList.contains('light')
  );
  const [updateInfo, setUpdateInfo] = useState<{ current: string; latest: string } | null>(null);

  // Tick every 10s to keep activity pills up to date
  const [, setTick] = useState(0);
  useEffect(() => {
    if (sessionActivity.size === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, [sessionActivity.size]);

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

      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Recent Chats */}
        {sessionActivity.size > 0 && (
          <RecentChats
            sessionActivity={sessionActivity}
            sessions={sessions}
            projects={projects}
            selectedSession={selectedSession}
            openSessionIds={openSessionIds}
            onSelectSession={onSelectSession}
            onOpenInNewPane={onOpenInNewPane}
          />
        )}

        {/* Project list */}
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
            sessionActivity={sessionActivity}
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

function RecentChats({
  sessionActivity,
  sessions,
  projects,
  selectedSession,
  openSessionIds,
  onSelectSession,
  onOpenInNewPane,
}: {
  sessionActivity: Map<string, string>;
  sessions: Map<string, SessionInfo[]>;
  projects: ProjectInfo[];
  selectedSession: string | null;
  openSessionIds: Set<string>;
  onSelectSession: (projectId: string, sessionId: string) => void;
  onOpenInNewPane: (projectId: string, sessionId: string) => void;
}) {
  // Build list of recent chats by looking up each active sessionId
  const recentChats: Array<{
    sessionId: string;
    projectId: string;
    session: SessionInfo;
    project: ProjectInfo;
    activityTs: string;
  }> = [];

  for (const [sessionId, activityTs] of sessionActivity) {
    // Find the session and its project
    for (const [projectId, sessionList] of sessions) {
      const session = sessionList.find((s) => s.sessionId === sessionId);
      if (session) {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          recentChats.push({ sessionId, projectId, session, project, activityTs });
        }
        break;
      }
    }
  }

  // Sort by activity timestamp descending (most recent first)
  recentChats.sort((a, b) => (b.activityTs > a.activityTs ? 1 : b.activityTs < a.activityTs ? -1 : 0));

  if (recentChats.length === 0) return null;

  return (
    <div className="pb-2 mb-1 border-b border-claude-border">
      <div className="px-4 pt-1 pb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-claude-muted uppercase tracking-wide">
        <Clock size={11} />
        Recent
      </div>
      {recentChats.map(({ sessionId, projectId, session, project, activityTs }) => {
        const title = session.summary || session.firstPrompt || 'Untitled';
        const truncatedTitle = title.length > 50 ? title.slice(0, 50) + '...' : title;
        const projectLabel = project.path.split('/').filter(Boolean).slice(-2).join('/');
        const isSelected = selectedSession === sessionId;
        const isOpenInPane = openSessionIds.has(sessionId);

        return (
          <div
            key={sessionId}
            className={`group w-full px-4 py-1.5 flex items-start gap-2 text-left transition-colors cursor-pointer ${
              isSelected
                ? 'bg-claude-accent/20'
                : isOpenInPane
                  ? 'bg-claude-accent/10 hover:bg-claude-accent/15'
                  : 'hover:bg-claude-border/30'
            }`}
            onClick={() => onSelectSession(projectId, sessionId)}
          >
            <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-green-400" />
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate">{truncatedTitle}</div>
              <div className="text-[10px] text-claude-muted mt-0.5 flex items-center gap-1.5">
                <span className="truncate">{projectLabel}</span>
                <ActivityPill timestamp={activityTs} />
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenInNewPane(projectId, sessionId);
              }}
              title="Open in new pane"
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-all flex-shrink-0 mt-0.5"
            >
              <Columns2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ActivityPill({ timestamp }: { timestamp: string }) {
  const label = formatActivityTime(timestamp);
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-medium leading-none whitespace-nowrap flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
      {label}
    </span>
  );
}

function ProjectItem({
  project,
  sessions,
  isExpanded,
  selectedSession,
  openSessionIds,
  sessionActivity,
  onSelect,
  onSelectSession,
  onOpenInNewPane,
}: {
  project: ProjectInfo;
  sessions: SessionInfo[];
  isExpanded: boolean;
  selectedSession: string | null;
  openSessionIds: Set<string>;
  sessionActivity: Map<string, string>;
  onSelect: () => void;
  onSelectSession: (sessionId: string) => void;
  onOpenInNewPane: (sessionId: string) => void;
}) {
  // Show last part of path as display name
  const displayName = project.path.split('/').filter(Boolean).slice(-2).join('/');

  // Find the most recent activity timestamp among this project's sessions
  let latestActivity: string | null = null;
  for (const s of sessions) {
    const ts = sessionActivity.get(s.sessionId);
    if (ts && (!latestActivity || ts > latestActivity)) {
      latestActivity = ts;
    }
  }

  return (
    <div>
      <div
        onClick={onSelect}
        className="group w-full px-4 py-2 flex items-center gap-2 hover:bg-claude-border/30 transition-colors text-left cursor-pointer"
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
        {latestActivity && <ActivityPill timestamp={latestActivity} />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetch('/api/open-in-terminal-new', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectPath: project.path }),
            });
          }}
          title="New Claude instance"
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-all flex-shrink-0"
        >
          <Terminal size={14} />
        </button>
      </div>

      {isExpanded && sessions.length > 0 && (
        <div className="ml-4 border-l border-claude-border">
          {sessions.map((session) => (
            <SessionItem
              key={session.sessionId}
              session={session}
              isSelected={selectedSession === session.sessionId}
              isOpenInPane={openSessionIds.has(session.sessionId)}
              activityTimestamp={sessionActivity.get(session.sessionId) || null}
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
  activityTimestamp,
  onSelect,
  onOpenInNewPane,
}: {
  session: SessionInfo;
  isSelected: boolean;
  isOpenInPane: boolean;
  activityTimestamp: string | null;
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
      <MessageSquare size={12} className={`mt-0.5 flex-shrink-0 ${activityTimestamp ? 'text-green-400' : 'text-claude-muted'}`} />
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate">{truncatedTitle}</div>
        <div className="text-[10px] text-claude-muted mt-0.5 flex items-center gap-1.5">
          <span>{timeAgo} &middot; {session.messageCount} msgs</span>
          {activityTimestamp && <ActivityPill timestamp={activityTimestamp} />}
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

function formatActivityTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
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
