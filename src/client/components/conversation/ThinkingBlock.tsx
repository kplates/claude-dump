import { useState } from 'react';
import { Brain, ChevronRight, ChevronDown } from 'lucide-react';

interface ThinkingBlockProps {
  text: string;
}

export function ThinkingBlock({ text }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  // Count lines for summary
  const lineCount = text.split('\n').length;
  const charCount = text.length;

  return (
    <div className="rounded-lg border border-claude-border/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs text-claude-muted hover:bg-claude-border/20 transition-colors"
      >
        <Brain size={12} />
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>
          Thinking ({lineCount} lines, {Math.round(charCount / 1000)}k chars)
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 text-xs text-claude-muted/80 whitespace-pre-wrap border-t border-claude-border/30 max-h-96 overflow-y-auto bg-claude-bg/50 font-mono leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}
