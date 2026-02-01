import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../common/CodeBlock';

interface TextBlockProps {
  text: string;
}

export function TextBlock({ text }: TextBlockProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-claude-text prose-p:my-1.5 prose-headings:text-claude-text prose-a:text-blue-400 prose-code:text-pink-300 prose-code:bg-claude-border/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-transparent prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock
                language={match?.[1] || ''}
                code={String(children).replace(/\n$/, '')}
              />
            );
          },
        }}
      />
    </div>
  );
}
