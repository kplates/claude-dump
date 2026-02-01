import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function ResumeDropdown({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard
          .writeText(`claude --resume ${sessionId}`)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      title="Copy resume command"
      className="p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}
