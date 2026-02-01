import { useState, useMemo } from 'react';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

interface DiffViewerProps {
  diff: string;
}

export function DiffViewer({ diff }: DiffViewerProps) {
  const [outputFormat, setOutputFormat] = useState<'line-by-line' | 'side-by-side'>(
    'line-by-line'
  );

  const htmlContent = useMemo(
    () =>
      html(diff, {
        drawFileList: false,
        matching: 'lines',
        outputFormat,
        colorScheme: 'dark',
      }),
    [diff, outputFormat]
  );

  return (
    <div>
      <div className="flex justify-end mb-1">
        <div className="flex gap-1 text-[10px]">
          <button
            onClick={() => setOutputFormat('line-by-line')}
            className={`px-2 py-0.5 rounded ${
              outputFormat === 'line-by-line'
                ? 'bg-claude-accent/30 text-claude-accent'
                : 'text-claude-muted hover:text-claude-text'
            }`}
          >
            inline
          </button>
          <button
            onClick={() => setOutputFormat('side-by-side')}
            className={`px-2 py-0.5 rounded ${
              outputFormat === 'side-by-side'
                ? 'bg-claude-accent/30 text-claude-accent'
                : 'text-claude-muted hover:text-claude-text'
            }`}
          >
            side-by-side
          </button>
        </div>
      </div>
      <div
        className="rounded overflow-hidden border border-claude-border/50 text-xs"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
