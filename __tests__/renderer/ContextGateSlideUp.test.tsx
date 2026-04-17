// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import ContextGateSlideUp from '../../src/components/Engine/ContextGateSlideUp';

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

function warn(percent: number) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('grip:context-gate-warning', { detail: { percent } }),
    );
  });
}

beforeEach(() => {
  lsStore = {};
});

afterEach(() => {
  cleanup();
});

describe('ContextGateSlideUp', () => {
  describe('visibility', () => {
    it('does not render before any warning event', () => {
      const { container } = render(<ContextGateSlideUp />);
      expect(container.firstChild).toBeNull();
    });

    it('does not render for percent < 85', () => {
      render(<ContextGateSlideUp />);
      warn(50);
      expect(screen.queryByTestId('context-gate-slide-up')).toBeNull();
    });

    it('does not render for percent exactly below threshold (84)', () => {
      render(<ContextGateSlideUp />);
      warn(84);
      expect(screen.queryByTestId('context-gate-slide-up')).toBeNull();
    });

    it('renders at exactly 85% (the threshold)', () => {
      render(<ContextGateSlideUp />);
      warn(85);
      expect(screen.getByTestId('context-gate-slide-up')).toBeInTheDocument();
    });

    it('renders for percent > 85', () => {
      render(<ContextGateSlideUp />);
      warn(92);
      const strip = screen.getByTestId('context-gate-slide-up');
      expect(strip).toHaveTextContent('Context gate 92%');
    });

    it('does not render after an explicit below-threshold signal re-arms state', () => {
      render(<ContextGateSlideUp />);
      warn(90);
      expect(screen.getByTestId('context-gate-slide-up')).toBeInTheDocument();
      warn(40);
      expect(screen.queryByTestId('context-gate-slide-up')).toBeNull();
    });
  });

  describe('actions', () => {
    it('dispatches compact action and hides itself', () => {
      render(<ContextGateSlideUp />);
      warn(87);
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      fireEvent.click(screen.getByTestId('context-gate-action-compact'));
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'grip:context-gate-action' }),
      );
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ action: 'compact' });
      expect(screen.queryByTestId('context-gate-slide-up')).toBeNull();
      dispatchSpy.mockRestore();
    });

    it('dispatches fresh action', () => {
      render(<ContextGateSlideUp />);
      warn(90);
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      fireEvent.click(screen.getByTestId('context-gate-action-fresh'));
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ action: 'fresh' });
      dispatchSpy.mockRestore();
    });

    it('dispatches checkpoint action', () => {
      render(<ContextGateSlideUp />);
      warn(88);
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      fireEvent.click(screen.getByTestId('context-gate-action-checkpoint'));
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ action: 'checkpoint' });
      dispatchSpy.mockRestore();
    });

    it('can re-arm after dismiss when a new warning arrives below then above threshold', () => {
      render(<ContextGateSlideUp />);
      warn(90);
      fireEvent.click(screen.getByTestId('context-gate-action-compact'));
      expect(screen.queryByTestId('context-gate-slide-up')).toBeNull();
      // Simulate a follow-on warning after the operator acts — the dismissal
      // only sticks until the next below-threshold signal re-arms state.
      warn(50);
      warn(88);
      expect(screen.getByTestId('context-gate-slide-up')).toBeInTheDocument();
    });
  });

  describe('malformed events', () => {
    it('ignores events with no detail', () => {
      render(<ContextGateSlideUp />);
      act(() => {
        window.dispatchEvent(new CustomEvent('grip:context-gate-warning'));
      });
      expect(screen.queryByTestId('context-gate-slide-up')).toBeNull();
    });

    it('ignores events with non-numeric percent', () => {
      render(<ContextGateSlideUp />);
      act(() => {
        window.dispatchEvent(
          new CustomEvent('grip:context-gate-warning', {
            detail: { percent: 'a-lot' as unknown as number },
          }),
        );
      });
      expect(screen.queryByTestId('context-gate-slide-up')).toBeNull();
    });
  });

  describe('feature flag', () => {
    it('returns null when contextGateSlideUp === "false"', () => {
      localStorage.setItem('contextGateSlideUp', 'false');
      const { container } = render(<ContextGateSlideUp />);
      warn(99);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has role=alertdialog with descriptive labels', () => {
      render(<ContextGateSlideUp />);
      warn(89);
      const strip = screen.getByTestId('context-gate-slide-up');
      expect(strip).toHaveAttribute('role', 'alertdialog');
      expect(strip).toHaveAttribute('aria-labelledby', 'context-gate-title');
      expect(strip).toHaveAttribute('aria-describedby', 'context-gate-description');
    });
  });
});
