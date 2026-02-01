import { User } from 'lucide-react';
import type { UserTurn } from '@shared/types';

interface UserMessageProps {
  turn: UserTurn;
}

export function UserMessage({ turn }: UserMessageProps) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-claude-user flex items-center justify-center flex-shrink-0 mt-0.5">
        <User size={14} className="text-blue-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-claude-muted mb-1">
          You &middot; {formatTime(turn.timestamp)}
        </div>
        <div className="bg-claude-user/40 rounded-lg px-4 py-3 text-sm whitespace-pre-wrap break-words">
          {turn.text || '(empty message)'}
        </div>
      </div>
    </div>
  );
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
