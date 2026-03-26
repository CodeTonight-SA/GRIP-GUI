'use client';

import { useState } from 'react';
import type { ToolUseEvent, ToolResultEvent } from '@/lib/grip-session';

interface ToolUseBlockProps {
  toolUse: ToolUseEvent;
  result?: ToolResultEvent;
}

const TOOL_ICONS: Record<string, string> = {
  Read: 'file',
  Write: 'pencil',
  Edit: 'edit',
  Bash: 'terminal',
  Grep: 'search',
  Glob: 'folder',
  Agent: 'users',
  WebSearch: 'globe',
  WebFetch: 'download',
};

function getToolCategory(name: string): 'file' | 'search' | 'execute' | 'agent' | 'mcp' {
  if (['Read', 'Write', 'Edit', 'NotebookEdit'].includes(name)) return 'file';
  if (['Grep', 'Glob', 'WebSearch', 'WebFetch'].includes(name)) return 'search';
  if (['Bash'].includes(name)) return 'execute';
  if (['Agent', 'TaskCreate', 'TaskUpdate'].includes(name)) return 'agent';
  return 'mcp';
}

function formatToolInput(input: Record<string, unknown>): string {
  // Show the most relevant field concisely
  if (input.file_path) return String(input.file_path).replace(/^\/Users\/[^/]+\//, '~/');
  if (input.command) {
    const cmd = String(input.command);
    return cmd.length > 80 ? cmd.slice(0, 77) + '...' : cmd;
  }
  if (input.pattern) return `/${input.pattern}/`;
  if (input.query) return String(input.query).slice(0, 60);
  if (input.prompt) return String(input.prompt).slice(0, 60) + '...';
  if (input.description) return String(input.description);
  const keys = Object.keys(input);
  if (keys.length === 0) return '';
  return keys.slice(0, 3).join(', ');
}

export default function ToolUseBlock({ toolUse, result }: ToolUseBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const category = getToolCategory(toolUse.toolName);
  const summary = formatToolInput(toolUse.input);
  const isPending = !result;
  const isError = result?.isError;

  const categoryColors: Record<string, string> = {
    file: 'text-cyan-400 border-cyan-800',
    search: 'text-blue-400 border-blue-800',
    execute: 'text-amber-400 border-amber-800',
    agent: 'text-purple-400 border-purple-800',
    mcp: 'text-emerald-400 border-emerald-800',
  };

  return (
    <div className={`my-1.5 border-l-2 ${categoryColors[category] || 'border-zinc-700'} bg-zinc-900/50 tool-enter relative overflow-hidden`}>
      {/* Scanning line while tool is pending */}
      {isPending && <div className="tool-scan-line" />}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800/50 transition-colors relative z-10"
      >
        {/* Status indicator */}
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isPending ? 'bg-amber-400 animate-pulse' :
          isError ? 'bg-red-400' :
          'bg-emerald-400'
        }`} />

        {/* Tool name */}
        <span className={`font-mono text-xs font-bold ${categoryColors[category]?.split(' ')[0] || 'text-zinc-400'}`}>
          {toolUse.toolName}
        </span>

        {/* Summary */}
        {summary && (
          <span className="font-mono text-xs text-zinc-500 truncate flex-1">
            {summary}
          </span>
        )}

        {/* Expand chevron */}
        <span className="text-zinc-600 text-xs flex-shrink-0">
          {expanded ? '\u25B4' : '\u25BE'}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {/* Input */}
          <pre className="text-xs text-zinc-500 overflow-x-auto max-h-40 font-mono">
            {JSON.stringify(toolUse.input, null, 2)}
          </pre>

          {/* Result */}
          {result && (
            <div className={`text-xs font-mono mt-1 p-2 ${
              isError ? 'bg-red-950/30 text-red-300' : 'bg-zinc-800/50 text-zinc-400'
            } max-h-60 overflow-y-auto`}>
              {result.output.slice(0, 2000)}
              {result.output.length > 2000 && (
                <span className="text-zinc-600"> ... ({result.output.length} chars)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
