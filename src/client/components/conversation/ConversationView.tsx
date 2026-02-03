import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import type { Turn } from '@shared/types';

interface ConversationViewProps {
  turns: Turn[];
}

export function ConversationView({ turns }: ConversationViewProps) {
  if (turns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-claude-muted text-sm">
        No messages in this session
      </div>
    );
  }

  // Reverse: newest messages at top
  const reversed = [...turns].reverse();

  return (
    <div className="flex-1 overflow-y-auto pb-6">
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-4">
        {reversed.map((turn) => {
          if (turn.type === 'user') {
            return <UserMessage key={turn.uuid} turn={turn} />;
          }
          return <AssistantMessage key={turn.uuid} turn={turn} />;
        })}
      </div>
    </div>
  );
}
