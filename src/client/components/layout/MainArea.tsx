import { Loader2 } from 'lucide-react';
import { ConversationView } from '../conversation/ConversationView';
import type { Turn, SessionInfo } from '@shared/types';

interface MainAreaProps {
  turns: Turn[];
  loading: boolean;
  selectedSession: { projectId: string; sessionId: string } | null;
  sessions: Map<string, SessionInfo[]>;
}

export function MainArea({ turns, loading, selectedSession, sessions }: MainAreaProps) {
  if (!selectedSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-claude-bg">
        <div className="text-center text-claude-muted">
          <p className="text-lg mb-2">Claude Dump</p>
          <p className="text-sm">Select a session to view the conversation</p>
        </div>
      </div>
    );
  }

  // Find session meta
  const sessionList = sessions.get(selectedSession.projectId) || [];
  const sessionMeta = sessionList.find(
    (s) => s.sessionId === selectedSession.sessionId
  );

  return (
    <div className="flex-1 flex flex-col bg-claude-bg h-full min-w-0">
      {/* Session header */}
      {sessionMeta && (
        <div className="px-6 py-3 border-b border-claude-border bg-claude-surface/50">
          <h2 className="text-sm font-medium truncate">
            {sessionMeta.summary || sessionMeta.firstPrompt || 'Untitled'}
          </h2>
          <div className="text-xs text-claude-muted mt-0.5">
            {new Date(sessionMeta.created).toLocaleString()} &middot;{' '}
            {sessionMeta.messageCount} messages
            {sessionMeta.gitBranch && ` &middot; ${sessionMeta.gitBranch}`}
          </div>
        </div>
      )}

      {/* Conversation */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-claude-muted" />
        </div>
      ) : (
        <ConversationView turns={turns} />
      )}
    </div>
  );
}
