import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Sidebar } from './components/layout/Sidebar';
import { PaneContainer } from './components/layout/PaneContainer';
import type { ServerMessage } from '@shared/protocol';
import type { ProjectInfo, SessionInfo, Turn } from '@shared/types';

const MAX_PANES = 4;

export interface Pane {
  id: string;
  session: { projectId: string; sessionId: string };
  turns: Turn[];
  loading: boolean;
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
        case 'sessions':
          setSessions((prev) => new Map(prev).set(msg.projectId, msg.sessions));
          break;
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
        case 'session_meta_update':
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
    },
    []
  );

  const { send, connected } = useWebSocket(handleMessage);

  // Load a session into a specific pane via REST, then subscribe for real-time updates
  const loadSession = useCallback(
    (paneId: string, projectId: string, sessionId: string) => {
      // Set pane to loading state
      setPanes((prev) => {
        const next = new Map(prev);
        const existing = next.get(paneId);
        if (existing) {
          next.set(paneId, { ...existing, session: { projectId, sessionId }, turns: [], loading: true });
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

  return (
    <div className="flex h-full">
      <Sidebar
        projects={projects}
        sessions={sessions}
        selectedProject={selectedProject}
        selectedSession={selectedSession}
        openSessionIds={openSessionIds}
        onSelectProject={handleSelectProject}
        onSelectSession={handleSelectSession}
        onOpenInNewPane={handleOpenInNewPane}
        connected={connected}
      />
      <PaneContainer
        panes={panes}
        activePaneId={activePaneId}
        projects={projects}
        sessions={sessions}
        onActivatePane={setActivePaneId}
        onClosePane={handleClosePane}
      />
    </div>
  );
}
