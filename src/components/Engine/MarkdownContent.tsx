'use client';

import React, { useMemo, memo, useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

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

/** Code block with copy button and line numbers — the WOW detail. */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const lines = code.split('\n');

  return (
    <div className="relative group my-2 border border-[var(--border)] bg-black overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-zinc-950">
        {language && (
          <span className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)]">
            {language.toUpperCase()}
          </span>
        )}
        {!language && <span />}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 font-mono text-[8px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors opacity-0 group-hover:opacity-100"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[var(--success)]" strokeWidth={1.5} />
              <span className="text-[var(--success)]">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" strokeWidth={1.5} />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>
      {/* Code with line numbers */}
      <pre className="p-0 font-mono text-xs overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-zinc-900/50">
                <td className="text-right pr-3 pl-3 py-0 select-none font-mono text-[10px] text-zinc-700 border-r border-zinc-800 w-8 align-top">
                  {i + 1}
                </td>
                <td className="pl-3 pr-4 py-0 text-[var(--primary)] whitespace-pre">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </pre>
    </div>
  );
}

interface MarkdownContentProps {
  content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
  const elements = useMemo(() => {
    const blocks = content.split('\n');
    const result: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = '';

    for (let i = 0; i < blocks.length; i++) {
      const line = blocks[i];

      // Code block toggle
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          result.push(
            <CodeBlock key={`code-${i}`} code={codeBuffer.join('\n')} language={codeLanguage} />
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
        result.push(<div key={`br-${i}`} className="h-2" />);
        continue;
      }

      // Headings
      if (line.startsWith('### ')) {
        result.push(
          <h3 key={`h3-${i}`} className="text-sm font-bold tracking-tighter text-[var(--foreground)] mt-3 mb-1">
            {renderInline(line.slice(4))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        result.push(
          <h2 key={`h2-${i}`} className="text-base font-bold tracking-tighter text-[var(--foreground)] mt-3 mb-1">
            {renderInline(line.slice(3))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        result.push(
          <h1 key={`h1-${i}`} className="text-lg font-bold tracking-tighter text-[var(--foreground)] mt-3 mb-1">
            {renderInline(line.slice(2))}
          </h1>
        );
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        result.push(
          <blockquote key={`bq-${i}`} className="border-l-2 border-[var(--primary)] pl-3 text-[var(--muted-foreground)] italic text-sm my-1">
            {renderInline(line.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Bullet list
      if (line.match(/^[-*] /)) {
        result.push(
          <div key={`li-${i}`} className="flex items-start gap-2 text-sm">
            <span className="text-[var(--primary)] font-mono mt-0.5 shrink-0">-</span>
            <span>{renderInline(line.slice(2))}</span>
          </div>
        );
        continue;
      }

      // Regular paragraph
      result.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }

    // Handle unclosed code block (streaming — code still arriving)
    if (inCodeBlock && codeBuffer.length > 0) {
      result.push(
        <CodeBlock key="code-unclosed" code={codeBuffer.join('\n')} language={codeLanguage} />
      );
    }

    return result;
  }, [content]);

  return <div className="space-y-0.5">{elements}</div>;
}

export default memo(MarkdownContent);

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
