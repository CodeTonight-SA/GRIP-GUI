// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModelSelector from '../../src/components/Engine/ModelSelector';

// framer-motion static stub
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    motion: new Proxy({} as typeof actual.motion, {
      get: (_t, key: string) => (props: Record<string, unknown>) => {
        const { children, animate: _a, initial: _i, exit: _e, transition: _t2, ...rest } = props;
        const Tag = key as keyof JSX.IntrinsicElements;
        return <Tag {...rest}>{children as React.ReactNode}</Tag>;
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// hal-client: not a HAL backend in tests
vi.mock('../../src/lib/hal-client', () => ({
  isHalBackend: () => false,
}));

beforeEach(() => vi.clearAllMocks());

describe('ModelSelector', () => {
  describe('closed state', () => {
    it('shows the current model label', () => {
      render(<ModelSelector value="sonnet" onChange={vi.fn()} compact />);
      expect(screen.getByText('SONNET')).toBeInTheDocument();
    });

    it('does not show the dropdown options initially', () => {
      render(<ModelSelector value="sonnet" onChange={vi.fn()} compact />);
      expect(screen.queryByText('OPUS')).not.toBeInTheDocument();
    });
  });

  describe('open state', () => {
    it('opens the dropdown on click', () => {
      render(<ModelSelector value="sonnet" onChange={vi.fn()} compact />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('OPUS')).toBeInTheDocument();
      expect(screen.getByText('HAIKU')).toBeInTheDocument();
    });

    it('calls onChange with the selected model id', () => {
      const onChange = vi.fn();
      render(<ModelSelector value="sonnet" onChange={onChange} compact />);
      fireEvent.click(screen.getByRole('button')); // open
      fireEvent.click(screen.getByText('HAIKU'));
      expect(onChange).toHaveBeenCalledWith('haiku');
    });

    it('closes the dropdown after selecting a model', () => {
      render(<ModelSelector value="sonnet" onChange={vi.fn()} compact />);
      fireEvent.click(screen.getByRole('button')); // open
      fireEvent.click(screen.getByText('OPUS'));
      // After selection, only the current label is visible (dropdown closed)
      expect(screen.queryByText('HAIKU')).not.toBeInTheDocument();
    });
  });
});
