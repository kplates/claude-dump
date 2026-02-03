import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Sidebar } from './components/layout/Sidebar';
import { PaneContainer } from './components/layout/PaneContainer';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { extractTitle } from './utils/extractTitle';
import type { ServerMessage, ClientMessage } from '@shared/protocol';
import type { ProjectInfo, SessionInfo, Turn } from '@shared/types';

const MAX_PANES = 4;

export interface Pane {
  id: string;
  session: { projectId: string; sessionId: string };
  turns: Turn[];
  loading: boolean;
  terminalOpen: boolean;
  isNewChat?: boolean;
  createdAt?: number; // Timestamp for matching new chats to sessions
}

interface DeleteConfirmState {
  type: 'session' | 'project';
  projectId: string;
  sessionId?: string;
  title: string;
}

let nextPaneId = 1;
function generatePaneId(): string {
  return `pane-${nextPaneId++}`;
}

export function App() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [sessions, setSessions] = useState<Map<string, SessionInfo[]>>(new Map());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [panes, setPanes] = useState<Map<string, Pane>>(new Map());
  const [activePaneId, setActivePaneId] = useState<string | null>(null);
  const [sessionActivity, setSessionActivity] = useState<Map<string, string>>(new Map());
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);

  // Derive the active pane's session ID for sidebar highlighting
  const activePane = activePaneId ? panes.get(activePaneId) ?? null : null;
  const selectedSession = activePane?.session.sessionId ?? null;

  // Derive the set of all session IDs open in any pane
  const openSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pane of panes.values()) {
      ids.add(pane.session.sessionId);
    }
    return ids;
  }, [panes]);

  // Refs for access inside handleMessage (which has [] deps)
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const openSessionIdsRef = useRef(openSessionIds);
  openSessionIdsRef.current = openSessionIds;
  const panesRef = useRef(panes);
  panesRef.current = panes;
  const sendRef = useRef<((msg: ClientMessage) => void) | null>(null);

  // Count how many panes reference each sessionId
  function countPanesForSession(sessionId: string): number {
    let count = 0;
    for (const pane of panes.values()) {
      if (pane.session.sessionId === sessionId) count++;
    }
    return count;
  }

  // Find a pane that already shows a given sessionId
  function findPaneBySessionId(sessionId: string): Pane | undefined {
    for (const pane of panes.values()) {
      if (pane.session.sessionId === sessionId) return pane;
    }
    return undefined;
  }

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'projects':
          setProjects(msg.projects);
          break;
        case 'sessions': {
          const prevSessions = sessionsRef.current.get(msg.projectId) || [];
          const now = new Date().toISOString();
          const newActivity: string[] = [];

          for (const session of msg.sessions) {
            const prev = prevSessions.find((s) => s.sessionId === session.sessionId);
            if (prev && session.messageCount > prev.messageCount) {
              newActivity.push(session.sessionId);
            }
          }
          if (newActivity.length > 0) {
            setSessionActivity((prev) => {
              const next = new Map(prev);
              for (const id of newActivity) next.set(id, now);
              return next;
            });
          }

          setSessions((prev) => new Map(prev).set(msg.projectId, msg.sessions));
          break;
        }
        case 'new_session_created': {
          // Server notified us that a new session was created for one of our watching panes
          const pane = panesRef.current.get(msg.paneId);
          if (pane?.isNewChat && pane.session.projectId === msg.projectId) {
            // Update the pane with the real session ID
            setPanes((prev) => {
              const next = new Map(prev);
              const existingPane = next.get(msg.paneId);
              if (existingPane?.isNewChat) {
                next.set(msg.paneId, {
                  ...existingPane,
                  session: { projectId: msg.projectId, sessionId: msg.sessionId },
                  isNewChat: false,
                  createdAt: undefined,
                });
              }
              return next;
            });
            // Subscribe to the real session for live updates
            if (sendRef.current) {
              sendRef.current({
                type: 'subscribe_session',
                sessionId: msg.sessionId,
                projectId: msg.projectId,
              });
            }
          }
          break;
        }
        case 'session_data':
          // Route to all panes showing this session
          setPanes((prev) => {
            const next = new Map(prev);
            let changed = false;
            for (const [id, pane] of next) {
              if (pane.session.sessionId === msg.sessionId) {
                next.set(id, { ...pane, turns: msg.turns, loading: false });
                changed = true;
              }
            }
            return changed ? next : prev;
          });
          break;
        case 'session_append':
          // Append to all panes showing this session
          setPanes((prev) => {
            const next = new Map(prev);
            let changed = false;
            for (const [id, pane] of next) {
              if (pane.session.sessionId === msg.sessionId) {
                next.set(id, { ...pane, turns: [...pane.turns, ...msg.turns] });
                changed = true;
              }
            }
            return changed ? next : prev;
          });
          break;
        case 'project_update':
          setProjects((prev) => {
            const idx = prev.findIndex((p) => p.id === msg.project.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = msg.project;
              return next;
            }
            return [msg.project, ...prev];
          });
          break;
        case 'session_meta_update': {
          // Detect activity: if messageCount increased
          if (msg.meta.messageCount != null) {
            let prevCount: number | undefined;
            for (const [, sessionList] of sessionsRef.current) {
              const s = sessionList.find((s) => s.sessionId === msg.sessionId);
              if (s) { prevCount = s.messageCount; break; }
            }
            if (prevCount !== undefined && msg.meta.messageCount > prevCount) {
              setSessionActivity((prev) => {
                const next = new Map(prev);
                next.set(msg.sessionId, new Date().toISOString());
                return next;
              });
            }
          }
          setSessions((prev) => {
            const next = new Map(prev);
            for (const [projectId, sessionList] of next) {
              const idx = sessionList.findIndex(
                (s) => s.sessionId === msg.sessionId
              );
              if (idx >= 0) {
                const updated = [...sessionList];
                updated[idx] = { ...updated[idx], ...msg.meta };
                next.set(projectId, updated);
              }
            }
            return next;
          });
          break;
        }
        case 'session_deleted': {
          // Remove session from sessions map
          setSessions((prev) => {
            const next = new Map(prev);
            const sessionList = next.get(msg.projectId);
            if (sessionList) {
              next.set(
                msg.projectId,
                sessionList.filter((s) => s.sessionId !== msg.sessionId)
              );
            }
            return next;
          });
          // Update project session count
          setProjects((prev) =>
            prev.map((p) =>
              p.id === msg.projectId
                ? { ...p, sessionCount: Math.max(0, p.sessionCount - 1) }
                : p
            )
          );
          // Remove from activity
          setSessionActivity((prev) => {
            const next = new Map(prev);
            next.delete(msg.sessionId);
            return next;
          });
          // Close any panes showing this session
          setPanes((prev) => {
            const next = new Map(prev);
            for (const [id, pane] of next) {
              if (pane.session.sessionId === msg.sessionId) {
                next.delete(id);
              }
            }
            return next;
          });
          break;
        }
        case 'project_deleted': {
          // Remove project from projects list
          setProjects((prev) => prev.filter((p) => p.id !== msg.projectId));
          // Remove all sessions for this project
          setSessions((prev) => {
            const next = new Map(prev);
            next.delete(msg.projectId);
            return next;
          });
          // Remove activity for sessions in this project
          setSessionActivity((prev) => {
            const next = new Map(prev);
            // We don't have easy access to which sessions belong to this project,
            // but the sessions state update will handle the UI
            return next;
          });
          // Close any panes showing sessions from this project
          setPanes((prev) => {
            const next = new Map(prev);
            for (const [id, pane] of next) {
              if (pane.session.projectId === msg.projectId) {
                next.delete(id);
              }
            }
            return next;
          });
          // Clear selected project if it was deleted
          setSelectedProject((prev) => (prev === msg.projectId ? null : prev));
          break;
        }
      }
    },
    []
  );

  const { send, connected } = useWebSocket(handleMessage);
  sendRef.current = send;

  // Load a session into a specific pane via REST, then subscribe for real-time updates
  const loadSession = useCallback(
    (paneId: string, projectId: string, sessionId: string) => {
      // Set pane to loading state
      setPanes((prev) => {
        const next = new Map(prev);
        const existing = next.get(paneId);
        if (existing) {
          next.set(paneId, { ...existing, session: { projectId, sessionId }, turns: [], loading: true, isNewChat: false });
        }
        return next;
      });

      fetch(`/api/projects/${encodeURIComponent(projectId)}/sessions/${sessionId}`)
        .then((res) => res.json())
        .then((data: Turn[]) => {
          setPanes((prev) => {
            const next = new Map(prev);
            const pane = next.get(paneId);
            if (pane && pane.session.sessionId === sessionId) {
              next.set(paneId, { ...pane, turns: data, loading: false });
            }
            return next;
          });
          send({ type: 'subscribe_session', sessionId, projectId });
        })
        .catch(() => {
          setPanes((prev) => {
            const next = new Map(prev);
            const pane = next.get(paneId);
            if (pane && pane.session.sessionId === sessionId) {
              next.set(paneId, { ...pane, loading: false });
            }
            return next;
          });
        });
    },
    [send]
  );

  // Prune stale sessionActivity entries every 60s (30-minute expiry)
  useEffect(() => {
    const EXPIRY_MS = 30 * 60 * 1000;
    const id = setInterval(() => {
      setSessionActivity((prev) => {
        const cutoff = Date.now() - EXPIRY_MS;
        let hasStale = false;
        for (const ts of prev.values()) {
          if (new Date(ts).getTime() < cutoff) {
            hasStale = true;
            break;
          }
        }
        if (!hasStale) return prev;
        const next = new Map<string, string>();
        for (const [key, ts] of prev) {
          if (new Date(ts).getTime() >= cutoff) {
            next.set(key, ts);
          }
        }
        return next;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Load projects via REST on mount
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: ProjectInfo[]) => setProjects(data))
      .catch((err) => console.error('Failed to load projects:', err));
  }, []);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      setSelectedProject((prev) => (prev === projectId ? null : projectId));
      if (!sessions.has(projectId)) {
        fetch(`/api/projects/${encodeURIComponent(projectId)}/sessions`)
          .then((res) => res.json())
          .then((data: SessionInfo[]) => {
            setSessions((prev) => new Map(prev).set(projectId, data));
          })
          .catch((err) => console.error('Failed to load sessions:', err));
      }
    },
    [sessions]
  );

  const handleSelectSession = useCallback(
    (projectId: string, sessionId: string) => {
      // If session is already open in a pane, just focus that pane
      const existingPane = findPaneBySessionId(sessionId);
      if (existingPane) {
        setActivePaneId(existingPane.id);
        return;
      }

      if (activePaneId && panes.has(activePaneId)) {
        // Unsubscribe from old session in this pane, only if no other pane shares it
        const oldPane = panes.get(activePaneId)!;
        const oldSessionId = oldPane.session.sessionId;
        if (oldSessionId && countPanesForSession(oldSessionId) <= 1) {
          send({ type: 'unsubscribe_session', sessionId: oldSessionId });
        }

        loadSession(activePaneId, projectId, sessionId);
      } else {
        // Create the first pane
        const paneId = generatePaneId();
        const newPane: Pane = {
          id: paneId,
          session: { projectId, sessionId },
          turns: [],
          loading: true,
          terminalOpen: false,
        };
        setPanes((prev) => new Map(prev).set(paneId, newPane));
        setActivePaneId(paneId);
        loadSession(paneId, projectId, sessionId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePaneId, panes, send, loadSession]
  );

  const handleOpenInNewPane = useCallback(
    (projectId: string, sessionId: string) => {
      // If already at max panes, just focus existing or replace active
      if (panes.size >= MAX_PANES) {
        // If session already open, focus it
        const existingPane = findPaneBySessionId(sessionId);
        if (existingPane) {
          setActivePaneId(existingPane.id);
          return;
        }
        // Otherwise load into active pane
        handleSelectSession(projectId, sessionId);
        return;
      }

      // If session already open, just focus that pane
      const existingPane = findPaneBySessionId(sessionId);
      if (existingPane) {
        setActivePaneId(existingPane.id);
        return;
      }

      const paneId = generatePaneId();
      const newPane: Pane = {
        id: paneId,
        session: { projectId, sessionId },
        turns: [],
        loading: true,
        terminalOpen: false,
      };
      setPanes((prev) => new Map(prev).set(paneId, newPane));
      setActivePaneId(paneId);
      loadSession(paneId, projectId, sessionId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panes, loadSession, handleSelectSession]
  );

  const handleClosePane = useCallback(
    (paneId: string) => {
      setPanes((prev) => {
        const next = new Map(prev);
        const pane = next.get(paneId);
        if (!pane) return prev;

        const sessionId = pane.session.sessionId;
        next.delete(paneId);

        // If it's a new chat pane, stop watching for new sessions
        if (pane.isNewChat) {
          send({ type: 'unwatch_new_session', paneId });
        } else {
          // Unsubscribe only if no other pane shares this session
          let otherHasSession = false;
          for (const p of next.values()) {
            if (p.session.sessionId === sessionId) {
              otherHasSession = true;
              break;
            }
          }
          if (!otherHasSession) {
            send({ type: 'unsubscribe_session', sessionId });
          }
        }

        // Update active pane if the closed one was active
        if (activePaneId === paneId) {
          const remaining = Array.from(next.keys());
          setActivePaneId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
        }

        return next;
      });
    },
    [activePaneId, send]
  );

  const handleToggleTerminal = useCallback(
    (paneId: string, open: boolean) => {
      setPanes((prev) => {
        const next = new Map(prev);
        const pane = next.get(paneId);
        if (!pane) return prev;
        next.set(paneId, { ...pane, terminalOpen: open });
        return next;
      });
    },
    []
  );

  const handleStartNewChat = useCallback(
    (projectId: string) => {
      // Generate a temporary session ID for the new chat
      const tempSessionId = `new-${Date.now()}`;
      const paneId = generatePaneId();
      const newPane: Pane = {
        id: paneId,
        session: { projectId, sessionId: tempSessionId },
        turns: [],
        loading: false,
        terminalOpen: true,
        isNewChat: true,
        createdAt: Date.now(),
      };
      setPanes((prev) => new Map(prev).set(paneId, newPane));
      setActivePaneId(paneId);

      // Tell server to watch for new sessions in this project for this pane
      send({ type: 'watch_new_session', projectId, paneId });
    },
    [send]
  );

  const handleDeleteSession = useCallback(
    (projectId: string, sessionId: string) => {
      // Find session title for confirmation dialog
      const sessionList = sessions.get(projectId);
      const session = sessionList?.find((s) => s.sessionId === sessionId);
      const title = session?.summary || extractTitle(session?.firstPrompt, 50);
      setDeleteConfirm({
        type: 'session',
        projectId,
        sessionId,
        title,
      });
    },
    [sessions]
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      const title = project?.path.split('/').filter(Boolean).slice(-2).join('/') || projectId;
      setDeleteConfirm({
        type: 'project',
        projectId,
        title,
      });
    },
    [projects]
  );

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'session' && deleteConfirm.sessionId) {
      send({
        type: 'delete_session',
        projectId: deleteConfirm.projectId,
        sessionId: deleteConfirm.sessionId,
      });
    } else if (deleteConfirm.type === 'project') {
      send({
        type: 'delete_project',
        projectId: deleteConfirm.projectId,
      });
    }
    setDeleteConfirm(null);
  }, [deleteConfirm, send]);

  return (
    <div className="flex h-full min-w-0">
      <Sidebar
        projects={projects}
        sessions={sessions}
        selectedProject={selectedProject}
        selectedSession={selectedSession}
        openSessionIds={openSessionIds}
        sessionActivity={sessionActivity}
        onSelectProject={handleSelectProject}
        onSelectSession={handleSelectSession}
        onOpenInNewPane={handleOpenInNewPane}
        onDeleteSession={handleDeleteSession}
        onDeleteProject={handleDeleteProject}
        onStartNewChat={handleStartNewChat}
        connected={connected}
      />
      <PaneContainer
        panes={panes}
        activePaneId={activePaneId}
        projects={projects}
        sessions={sessions}
        onActivatePane={setActivePaneId}
        onClosePane={handleClosePane}
        onToggleTerminal={handleToggleTerminal}
        onStartNewChat={handleStartNewChat}
      />
      {deleteConfirm && (
        <ConfirmDialog
          title={deleteConfirm.type === 'session' ? 'Delete Session' : 'Delete Project'}
          message={
            deleteConfirm.type === 'session'
              ? `Are you sure you want to delete "${deleteConfirm.title}"? This cannot be undone.`
              : `Are you sure you want to delete the project "${deleteConfirm.title}" and all its sessions? This cannot be undone.`
          }
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
