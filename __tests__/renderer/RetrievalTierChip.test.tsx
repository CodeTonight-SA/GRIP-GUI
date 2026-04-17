// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import RetrievalTierChip from '../../src/components/Engine/RetrievalTierChip';

// Environment-agnostic localStorage stub (matches ChatStorage.test.tsx pattern).
let lsStore: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => lsStore[key] ?? null,
  setItem: (key: string, value: string) => {
    lsStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete lsStore[key];
  },
  clear: () => {
    lsStore = {};
  },
  get length() {
    return Object.keys(lsStore).length;
  },
  key: (i: number) => Object.keys(lsStore)[i] ?? null,
});

function dispatchTier(tier: number) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('grip:retrieval-tier', { detail: { tier } }),
    );
  });
}

beforeEach(() => {
  lsStore = {};
});

afterEach(() => {
  cleanup();
});

describe('RetrievalTierChip', () => {
  describe('honest-blank', () => {
    it('renders a dash placeholder before any retrieval event fires', () => {
      render(<RetrievalTierChip />);
      const chip = screen.getByTestId('retrieval-tier-chip');
      expect(chip).toHaveTextContent('—');
      expect(screen.queryByTestId('retrieval-tier-chip-tier-hint')).toBeNull();
    });

    it('has a role=status and plain-English aria-label in the idle state', () => {
      render(<RetrievalTierChip />);
      const chip = screen.getByTestId('retrieval-tier-chip');
      expect(chip).toHaveAttribute('role', 'status');
      expect(chip).toHaveAttribute(
        'aria-label',
        'Retrieval tier: no retrieval yet in this session.',
      );
    });
  });

  describe('binary label (Pragmatist PR1 scope)', () => {
    it('renders CACHED when tier=0 fires (session memory hit)', () => {
      render(<RetrievalTierChip />);
      dispatchTier(0);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('CACHED');
    });

    it('renders CACHED when tier=1 fires (KONO semantic search still counts as cache)', () => {
      render(<RetrievalTierChip />);
      dispatchTier(1);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('CACHED');
    });

    it('renders SEARCHED when tier=2 fires', () => {
      render(<RetrievalTierChip />);
      dispatchTier(2);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('SEARCHED');
    });

    it('renders SEARCHED when tier=3 fires', () => {
      render(<RetrievalTierChip />);
      dispatchTier(3);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('SEARCHED');
    });

    it('renders SEARCHED when tier=4 fires (Explore agent)', () => {
      render(<RetrievalTierChip />);
      dispatchTier(4);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('SEARCHED');
    });

    it('updates to the latest tier when consecutive events fire', () => {
      render(<RetrievalTierChip />);
      dispatchTier(0);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('CACHED');
      dispatchTier(4);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('SEARCHED');
      dispatchTier(1);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('CACHED');
    });
  });

  describe('tier-hint metadata (non-jargon)', () => {
    it('exposes the raw tier number as a dim T{n} hint for debugging', () => {
      render(<RetrievalTierChip />);
      dispatchTier(3);
      expect(screen.getByTestId('retrieval-tier-chip-tier-hint')).toHaveTextContent('T3');
    });

    it('does not render the "TIER N" jargon anywhere in the chip body', () => {
      render(<RetrievalTierChip />);
      dispatchTier(2);
      const chip = screen.getByTestId('retrieval-tier-chip');
      expect(chip.textContent).not.toMatch(/\bTIER\b/i);
    });
  });

  describe('malformed events', () => {
    it('ignores events with no detail', () => {
      render(<RetrievalTierChip />);
      act(() => {
        window.dispatchEvent(new CustomEvent('grip:retrieval-tier'));
      });
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('—');
    });

    it('ignores events with non-numeric tier', () => {
      render(<RetrievalTierChip />);
      act(() => {
        window.dispatchEvent(
          new CustomEvent('grip:retrieval-tier', {
            detail: { tier: 'two' as unknown as number },
          }),
        );
      });
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveTextContent('—');
    });
  });

  describe('feature flag', () => {
    it('returns null when retrievalTierChip === "false"', () => {
      localStorage.setItem('retrievalTierChip', 'false');
      const { container } = render(<RetrievalTierChip />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when the flag is unset', () => {
      render(<RetrievalTierChip />);
      expect(screen.getByTestId('retrieval-tier-chip')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('updates aria-label to reflect the cached state', () => {
      render(<RetrievalTierChip />);
      dispatchTier(0);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveAttribute(
        'aria-label',
        'Last retrieval: cached (memory hit, near-zero cost).',
      );
    });

    it('updates aria-label to reflect the searched state', () => {
      render(<RetrievalTierChip />);
      dispatchTier(4);
      expect(screen.getByTestId('retrieval-tier-chip')).toHaveAttribute(
        'aria-label',
        'Last retrieval: searched (disk or agent, higher cost).',
      );
    });
  });
});
