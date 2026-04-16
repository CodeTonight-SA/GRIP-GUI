// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolUseBlock from '../../src/components/Engine/ToolUseBlock';
import type { ToolUseEvent, ToolResultEvent } from '../../src/lib/grip-session';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeToolUse(overrides: Partial<ToolUseEvent> = {}): ToolUseEvent {
  return {
    id: 'tu-1',
    toolName: 'Read',
    input: { file_path: '/Users/alice/project/src/index.ts' },
    ...overrides,
  };
}

function makeResult(overrides: Partial<ToolResultEvent> = {}): ToolResultEvent {
  return {
    toolUseId: 'tu-1',
    output: 'file contents here',
    isError: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════

describe('ToolUseBlock — tool name and category rendering', () => {
  it('renders the tool name', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Read' })} />);
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('renders Bash tool name', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Bash', input: { command: 'ls -la' } })} />);
    expect(screen.getByText('Bash')).toBeInTheDocument();
  });

  it('renders Agent tool name', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Agent', input: { description: 'Explore codebase' } })} />);
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('renders WebSearch tool name', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'WebSearch', input: { query: 'vitest jsdom' } })} />);
    expect(screen.getByText('WebSearch')).toBeInTheDocument();
  });

  it('renders an unknown MCP tool name', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'mcp__grip__some_action', input: {} })} />);
    expect(screen.getByText('mcp__grip__some_action')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('ToolUseBlock — input summary display', () => {
  it('shows a shortened file path for Read', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Read', input: { file_path: '/Users/alice/project/src/index.ts' } })} />);
    // The component strips /Users/<name>/ with ~/
    expect(screen.getByText('~/project/src/index.ts')).toBeInTheDocument();
  });

  it('shows command for Bash (short command shown in full)', () => {
    const shortCmd = 'npm test -- --run';
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Bash', input: { command: shortCmd } })} />);
    expect(screen.getByText(shortCmd)).toBeInTheDocument();
  });

  it('truncates Bash command longer than 80 chars', () => {
    const longCmd = 'a'.repeat(90);
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Bash', input: { command: longCmd } })} />);
    expect(screen.getByText('a'.repeat(77) + '...')).toBeInTheDocument();
  });

  it('shows /pattern/ for Grep', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Grep', input: { pattern: 'broadcastToAllWorkspaces' } })} />);
    expect(screen.getByText('/broadcastToAllWorkspaces/')).toBeInTheDocument();
  });

  it('shows query for WebSearch', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'WebSearch', input: { query: 'vitest jsdom setup' } })} />);
    expect(screen.getByText('vitest jsdom setup')).toBeInTheDocument();
  });

  it('shows description for Agent', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'Agent', input: { description: 'Explore the src/ directory' } })} />);
    expect(screen.getByText('Explore the src/ directory')).toBeInTheDocument();
  });

  it('shows top-3 key names when no known field is present', () => {
    render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'CustomTool', input: { alpha: 1, beta: 2, gamma: 3, delta: 4 } })} />);
    expect(screen.getByText('alpha, beta, gamma')).toBeInTheDocument();
  });

  it('shows no summary text when input is empty', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse({ toolName: 'CustomTool', input: {} })} />);
    const summarySpans = container.querySelectorAll('span.text-zinc-500.truncate');
    expect(summarySpans.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('ToolUseBlock — status indicators', () => {
  it('shows green indicator when completed without error', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} />);
    expect(container.querySelector('.bg-emerald-400')).toBeInTheDocument();
  });

  it('shows red indicator when result is an error', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult({ isError: true, output: 'Permission denied' })} />);
    expect(container.querySelector('.bg-red-400')).toBeInTheDocument();
  });

  it('shows amber pulsing indicator when pending (no result, streaming=true)', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} streaming={true} />);
    expect(container.querySelector('.bg-amber-400.animate-pulse')).toBeInTheDocument();
  });

  it('shows green (not amber) when result arrives even if streaming=true', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} streaming={true} />);
    expect(container.querySelector('.bg-amber-400.animate-pulse')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-emerald-400')).toBeInTheDocument();
  });

  it('renders the scan-line element when pending', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} streaming={true} />);
    expect(container.querySelector('.tool-scan-line')).toBeInTheDocument();
  });

  it('does not render the scan-line when not pending', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} />);
    expect(container.querySelector('.tool-scan-line')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('ToolUseBlock — expand / collapse', () => {
  it('starts collapsed — input JSON is not visible', () => {
    render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} />);
    expect(screen.queryByText(/"file_path"/)).not.toBeInTheDocument();
  });

  it('shows the collapse chevron ▾ when collapsed', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} />);
    expect(container.querySelector('button')?.textContent).toContain('▾');
  });

  it('expands to show input JSON on click', () => {
    render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/"file_path"/)).toBeInTheDocument();
  });

  it('shows the expand chevron ▴ after clicking to open', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(container.querySelector('button')?.textContent).toContain('▴');
  });

  it('collapses again on second click', () => {
    render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult()} />);
    fireEvent.click(screen.getByRole('button')); // expand
    fireEvent.click(screen.getByRole('button')); // collapse
    expect(screen.queryByText(/"file_path"/)).not.toBeInTheDocument();
  });

  it('shows result output when expanded', () => {
    render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult({ output: 'Hello from the file' })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Hello from the file')).toBeInTheDocument();
  });

  it('shows error result with red background when expanded', () => {
    const { container } = render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult({ isError: true, output: 'ENOENT: file not found' })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('ENOENT: file not found')).toBeInTheDocument();
    expect(container.querySelector('.bg-red-950\\/30')).toBeInTheDocument();
  });

  it('truncates result output over 2000 chars and shows a byte-count note', () => {
    const longOutput = 'x'.repeat(2500);
    render(<ToolUseBlock toolUse={makeToolUse()} result={makeResult({ output: longOutput })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/2500 chars/)).toBeInTheDocument();
  });
});
