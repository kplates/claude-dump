import { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

const EDITORS = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
] as const;

export function EditorDropdown({ path }: { path?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        title="Open in editor"
        className="p-0.5 rounded hover:bg-claude-border/50 text-claude-muted hover:text-claude-text transition-colors"
      >
        <ExternalLink size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-claude-surface border border-claude-border rounded-md shadow-lg py-1 min-w-[100px]">
          {EDITORS.map((editor) => (
            <button
              key={editor.id}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (!path) return;
                fetch('/api/open-in-editor', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ path, editor: editor.id }),
                }).catch(() => {});
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-claude-text hover:bg-claude-border/30 transition-colors"
            >
              {editor.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
