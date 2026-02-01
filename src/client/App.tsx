import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Sidebar } from './components/layout/Sidebar';
import { MainArea } from './components/layout/MainArea';
import type { ServerMessage } from '@shared/protocol';
import type { ProjectInfo, SessionInfo, Turn } from '@shared/types';

export function App() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [sessions, setSessions] = useState<Map<string, SessionInfo[]>>(new Map());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<{
    projectId: string;
    sessionId: string;
  } | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

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
          setTurns(msg.turns);
          setLoading(false);
          break;
        case 'session_append':
          if (selectedSession?.sessionId === msg.sessionId) {
            setTurns((prev) => [...prev, ...msg.turns]);
          }
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
    [selectedSession]
  );

  const { send, connected } = useWebSocket(handleMessage);

  // Load projects via REST on mount (reliable, no WS dependency)
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: ProjectInfo[]) => setProjects(data))
      .catch((err) => console.error('Failed to load projects:', err));
  }, []);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      setSelectedProject(projectId);
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
      // Unsubscribe from previous session
      if (selectedSession) {
        send({
          type: 'unsubscribe_session',
          sessionId: selectedSession.sessionId,
        });
      }

      setSelectedSession({ projectId, sessionId });
      setTurns([]);
      setLoading(true);

      // Load session data via REST API (faster initial load)
      fetch(`/api/projects/${encodeURIComponent(projectId)}/sessions/${sessionId}`)
        .then((res) => res.json())
        .then((data: Turn[]) => {
          setTurns(data);
          setLoading(false);
          // Subscribe for real-time updates
          send({ type: 'subscribe_session', sessionId, projectId });
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [selectedSession, send]
  );

  return (
    <div className="flex h-full">
      <Sidebar
        projects={projects}
        sessions={sessions}
        selectedProject={selectedProject}
        selectedSession={selectedSession?.sessionId ?? null}
        onSelectProject={handleSelectProject}
        onSelectSession={handleSelectSession}
        connected={connected}
      />
      <MainArea
        turns={turns}
        loading={loading}
        selectedSession={selectedSession}
        sessions={sessions}
      />
    </div>
  );
}
