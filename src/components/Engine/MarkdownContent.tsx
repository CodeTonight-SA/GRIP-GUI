'use client';

/**
 * Lightweight markdown renderer for GRIP chat messages.
 * No external dependencies — uses regex-based parsing.
 *
 * Supports:
 * - **bold** and *italic*
 * - `inline code` and ```code blocks```
 * - # headings (h1-h3)
 * - - bullet lists
 * - [links](url)
 * - > blockquotes
 *
 * Swiss Nihilism: code blocks have black bg, monospace, no rounded corners.
 */

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  const blocks = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';

  for (let i = 0; i < blocks.length; i++) {
    const line = blocks[i];

    // Code block toggle
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-black text-[var(--primary)] p-4 font-mono text-xs overflow-x-auto my-2 border border-[var(--border)]">
            {codeLanguage && (
              <span className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)] block mb-2">
                {codeLanguage.toUpperCase()}
              </span>
            )}
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold tracking-tighter text-[var(--foreground)] mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-bold tracking-tighter text-[var(--foreground)] mt-3 mb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-lg font-bold tracking-tighter text-[var(--foreground)] mt-3 mb-1">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={`bq-${i}`} className="border-l-2 border-[var(--primary)] pl-3 text-[var(--muted-foreground)] italic text-sm my-1">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 text-sm">
          <span className="text-[var(--primary)] font-mono mt-0.5 shrink-0">-</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-unclosed" className="bg-black text-[var(--primary)] p-4 font-mono text-xs overflow-x-auto my-2 border border-[var(--border)]">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

/**
 * Render inline markdown: bold, italic, code, links.
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="font-mono text-xs bg-[var(--secondary)] text-[var(--primary)] px-1 py-0.5">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-bold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Link — but don't generate URLs we're not confident about
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <span key={key++} className="text-[var(--primary)] underline underline-offset-2">
          {linkMatch[1]}
        </span>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Plain text — consume until next special character
    const nextSpecial = remaining.search(/[`*\[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Special char that didn't match a pattern — consume it as text
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{parts}</>;
}
