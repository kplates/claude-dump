import type { ProjectInfo, SessionInfo, Turn } from './types.js';
export type ServerMessage = {
    type: 'projects';
    projects: ProjectInfo[];
} | {
    type: 'sessions';
    projectId: string;
    sessions: SessionInfo[];
} | {
    type: 'session_data';
    sessionId: string;
    turns: Turn[];
} | {
    type: 'session_append';
    sessionId: string;
    turns: Turn[];
} | {
    type: 'project_update';
    project: ProjectInfo;
} | {
    type: 'session_meta_update';
    sessionId: string;
    meta: Partial<SessionInfo>;
};
export type ClientMessage = {
    type: 'get_projects';
} | {
    type: 'get_sessions';
    projectId: string;
} | {
    type: 'subscribe_session';
    sessionId: string;
    projectId: string;
} | {
    type: 'unsubscribe_session';
    sessionId: string;
};
