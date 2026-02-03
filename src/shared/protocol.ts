import type { ProjectInfo, SessionInfo, Turn } from './types.js';

// Server -> Client messages
export type ServerMessage =
  | { type: 'projects'; projects: ProjectInfo[] }
  | { type: 'sessions'; projectId: string; sessions: SessionInfo[] }
  | { type: 'session_data'; sessionId: string; turns: Turn[] }
  | { type: 'session_append'; sessionId: string; turns: Turn[] }
  | { type: 'project_update'; project: ProjectInfo }
  | { type: 'session_meta_update'; sessionId: string; meta: Partial<SessionInfo> }
  | { type: 'terminal_output'; sessionId: string; data: string }
  | { type: 'terminal_exit'; sessionId: string; code: number }
  | { type: 'session_deleted'; projectId: string; sessionId: string }
  | { type: 'project_deleted'; projectId: string }
  | { type: 'new_session_created'; paneId: string; projectId: string; sessionId: string };

// Client -> Server messages
export type ClientMessage =
  | { type: 'get_projects' }
  | { type: 'get_sessions'; projectId: string }
  | { type: 'subscribe_session'; sessionId: string; projectId: string }
  | { type: 'unsubscribe_session'; sessionId: string }
  | { type: 'terminal_start'; sessionId: string; projectPath: string; resume?: boolean }
  | { type: 'terminal_input'; sessionId: string; data: string }
  | { type: 'terminal_resize'; sessionId: string; cols: number; rows: number }
  | { type: 'terminal_close'; sessionId: string }
  | { type: 'delete_session'; projectId: string; sessionId: string }
  | { type: 'delete_project'; projectId: string }
  | { type: 'watch_new_session'; projectId: string; paneId: string }
  | { type: 'unwatch_new_session'; paneId: string };
