// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import TypingIndicator from '../../src/components/Engine/TypingIndicator';

// framer-motion creates animation loops — reduce to static for unit tests
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    motion: new Proxy(actual.motion, {
      get: (_target, key: string) => {
        const tag = actual.motion[key as keyof typeof actual.motion];
        return tag ?? ((props: Record<string, unknown>) => {
          const { children, animate: _a, initial: _i, exit: _e, transition: _t, ...rest } = props;
          const Tag = key as keyof JSX.IntrinsicElements;
          return <Tag {...rest}>{children as React.ReactNode}</Tag>;
        });
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

describe('TypingIndicator', () => {
  it('renders the initial processing state message', () => {
    render(<TypingIndicator />);
    // The first message in the rotation is always rendered on mount
    expect(screen.getByText('CONVERGING...')).toBeInTheDocument();
  });

  it('renders three pulsing bars', () => {
    const { container } = render(<TypingIndicator />);
    // The bars are motion.div elements with bg-[var(--primary)]
    const bars = container.querySelectorAll('.bg-\\[var\\(--primary\\)\\]');
    expect(bars.length).toBe(3);
  });

  it('advances to the next status message after interval', () => {
    vi.useFakeTimers();
    render(<TypingIndicator />);
    expect(screen.getByText('CONVERGING...')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText('CONVERGING...')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
