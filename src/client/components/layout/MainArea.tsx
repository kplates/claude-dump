import { Loader2 } from 'lucide-react';
import { ConversationView } from '../conversation/ConversationView';
import type { Turn, SessionInfo } from '@shared/types';
import { extractTitle } from '../../utils/extractTitle';

interface MainAreaProps {
  turns: Turn[];
  loading: boolean;
  selectedSession: { projectId: string; sessionId: string };
  sessions: Map<string, SessionInfo[]>;
}

export function MainArea({ turns, loading, selectedSession, sessions }: MainAreaProps) {
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
            {sessionMeta.summary || extractTitle(sessionMeta.firstPrompt)}
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
