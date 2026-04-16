// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Module mocks (hoisted) ─────────────────────────────────────────────────

// Prevent grip-session from trying to reach Electron IPC
vi.mock('../../src/lib/grip-session', () => ({
  sendToGrip: vi.fn(async function* () { /* never yields in unit tests */ }),
  filterResponseMetadata: (s: string) => s,
  detectGateInText: () => null,
}));

// Stub chat-storage with a fully-functional localStorage mock so
// component hooks that call storage don't throw
let _store: Record<string, string> = {};
vi.mock('../../src/lib/chat-storage', () => ({
  getChatMessages: vi.fn(() => []),
  saveChatMessages: vi.fn(),
  createChatSession: vi.fn(() => ({ id: 'new-chat', model: 'sonnet', sessionId: undefined })),
  updateChatTitle: vi.fn(),
  updateSessionId: vi.fn(),
  generateTitle: vi.fn((s: string) => s.slice(0, 50)),
  getActiveChatId: vi.fn(() => null),
  setActiveChatId: vi.fn(),
  getChatSessions: vi.fn(() => []),
}));

// framer-motion: static pass-through so animations don't throw in jsdom
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    motion: new Proxy({} as typeof actual.motion, {
      get: (_t, key: string) => (props: Record<string, unknown>) => {
        const { children, animate: _a, initial: _i, exit: _e, transition: _tr, ...rest } = props;
        const Tag = key as keyof JSX.IntrinsicElements;
        return <Tag {...rest}>{children as React.ReactNode}</Tag>;
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

// Stub heavy sub-components that bring in canvas / xterm / etc.
vi.mock('../../src/components/Engine/TypingIndicator', () => ({
  default: () => <div data-testid="typing-indicator" />,
}));
vi.mock('../../src/components/Engine/ThinkingIndicator', () => ({
  default: () => <div data-testid="thinking-indicator" />,
}));
vi.mock('../../src/components/Engine/ToolUseBlock', () => ({
  default: ({ toolUse }: { toolUse: { toolName: string } }) => (
    <div data-testid="tool-use-block">{toolUse.toolName}</div>
  ),
}));
vi.mock('../../src/components/Engine/GateIndicator', () => ({
  default: () => <div data-testid="gate-indicator" />,
}));
vi.mock('../../src/components/Engine/MarkdownContent', () => ({
  default: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));
vi.mock('../../src/components/Engine/ModelSelector', () => ({
  default: ({ value }: { value: string }) => <div data-testid="model-selector">{value}</div>,
}));
vi.mock('../../src/lib/hal-client', () => ({
  isHalBackend: () => false,
}));

// Stub localStorage
vi.stubGlobal('localStorage', {
  getItem: (key: string) => _store[key] ?? null,
  setItem: (key: string, val: string) => { _store[key] = String(val); },
  removeItem: (key: string) => { delete _store[key]; },
  clear: () => { _store = {}; },
  get length() { return Object.keys(_store).length; },
  key: (i: number) => Object.keys(_store)[i] ?? null,
});

// ── Import after mocks ─────────────────────────────────────────────────────
import ChatInterface from '../../src/components/Engine/ChatInterface';

// ── Test utilities ─────────────────────────────────────────────────────────

beforeEach(() => {
  _store = {};
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('ChatInterface — empty state', () => {
  it('renders the four suggested prompt cards when no messages are present', () => {
    render(<ChatInterface />);
    // All 4 suggested prompts are visible in the empty-chat welcome view
    expect(screen.getByText(/Explore this codebase/i)).toBeInTheDocument();
    expect(screen.getByText(/Review my last 5 commits/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft a technical proposal/i)).toBeInTheDocument();
    expect(screen.getByText(/Red-team this decision/i)).toBeInTheDocument();
  });

  it('renders the model selector in the empty state', () => {
    render(<ChatInterface />);
    expect(screen.getByTestId('model-selector')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('ChatInterface — input field', () => {
  it('renders a textarea for user input', () => {
    render(<ChatInterface />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('textarea placeholder text is present', () => {
    render(<ChatInterface />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder');
    expect((textarea as HTMLTextAreaElement).placeholder.length).toBeGreaterThan(0);
  });

  it('reflects typed text in the textarea value', () => {
    render(<ChatInterface />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Fix the null pointer' } });
    expect(textarea.value).toBe('Fix the null pointer');
  });

  it('clears the textarea when the clear (×) button is clicked', () => {
    render(<ChatInterface />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'some text' } });
    // The × clear button appears when input is non-empty
    const clearBtn = screen.getByLabelText(/clear/i);
    fireEvent.click(clearBtn);
    expect(textarea.value).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('ChatInterface — send button state', () => {
  it('the send button is disabled when input is empty', () => {
    render(<ChatInterface />);
    const sendBtn = screen.getByLabelText(/send/i);
    expect(sendBtn).toBeDisabled();
  });

  it('the send button becomes enabled when text is typed', () => {
    render(<ChatInterface />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    const sendBtn = screen.getByLabelText(/send/i);
    expect(sendBtn).not.toBeDisabled();
  });

  it('the send button is disabled when input is only whitespace', () => {
    render(<ChatInterface />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   ' } });
    const sendBtn = screen.getByLabelText(/send/i);
    expect(sendBtn).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('ChatInterface — scroll-to-bottom button', () => {
  it('the scroll-to-bottom button is not visible on initial render', () => {
    render(<ChatInterface />);
    // Button only appears when scrolled up — not shown in the static initial state
    expect(screen.queryByLabelText(/scroll to bottom/i)).not.toBeInTheDocument();
  });
});
