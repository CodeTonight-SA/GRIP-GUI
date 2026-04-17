// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ModeStackChip from '../../src/components/ModeStackChip';

// next/navigation — stub usePathname so we can drive route-change re-fetches
let currentPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

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

function mockFetchResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;
  return vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    } as Response),
  );
}

beforeEach(() => {
  currentPathname = '/';
  lsStore = {};
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('ModeStackChip', () => {
  describe('rendering', () => {
    it('renders the active mode list uppercase joined by " · "', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code', 'architect'] });

      render(<ModeStackChip showLabels />);

      await waitFor(() =>
        expect(screen.getByTestId('mode-stack-chip')).toHaveTextContent('CODE · ARCHITECT'),
      );
    });

    it('renders "NO MODES" when the stack is empty', async () => {
      globalThis.fetch = mockFetchResponse({ modes: [] });

      render(<ModeStackChip showLabels />);

      await waitFor(() =>
        expect(screen.getByTestId('mode-stack-chip')).toHaveTextContent('NO MODES'),
      );
    });

    it('renders an honest "MODES —" placeholder when the fetch fails', async () => {
      globalThis.fetch = vi.fn(() => Promise.reject(new Error('network down')));

      render(<ModeStackChip showLabels />);

      await waitFor(() =>
        expect(screen.getByTestId('mode-stack-chip')).toHaveTextContent('MODES —'),
      );
    });

    it('renders the honest placeholder on non-OK HTTP status (500)', async () => {
      globalThis.fetch = mockFetchResponse({ error: 'boom' }, { ok: false, status: 500 });

      render(<ModeStackChip showLabels />);

      await waitFor(() =>
        expect(screen.getByTestId('mode-stack-chip')).toHaveTextContent('MODES —'),
      );
    });

    it('ignores malformed payloads (modes not an array) and shows empty state', async () => {
      globalThis.fetch = mockFetchResponse({ modes: 'not-an-array' });

      render(<ModeStackChip showLabels />);

      await waitFor(() =>
        expect(screen.getByTestId('mode-stack-chip')).toHaveTextContent('NO MODES'),
      );
    });

    it('filters non-string entries out of the modes array', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code', 42, null, 'architect', { a: 1 }] });

      render(<ModeStackChip showLabels />);

      await waitFor(() =>
        expect(screen.getByTestId('mode-stack-chip')).toHaveTextContent('CODE · ARCHITECT'),
      );
    });
  });

  describe('collapsed sidebar', () => {
    it('hides the label and shortcut hint when showLabels=false', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code'] });

      render(<ModeStackChip showLabels={false} />);
      const chip = screen.getByTestId('mode-stack-chip');

      // Label is in the tooltip (hidden until hover), not in the main row.
      // The shortcut hint "⌘⇧M" must NOT render at all in collapsed mode.
      expect(chip).not.toHaveTextContent('⌘⇧M');
    });

    it('does not show the shortcut hint on mobile even when expanded', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code'] });

      render(<ModeStackChip showLabels isMobile />);
      const chip = screen.getByTestId('mode-stack-chip');

      expect(chip).not.toHaveTextContent('⌘⇧M');
    });
  });

  describe('interaction', () => {
    it('dispatches grip:open-palette with presetFilter=MODES on click', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code'] });
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(<ModeStackChip showLabels />);
      await waitFor(() => screen.getByTestId('mode-stack-chip'));

      fireEvent.click(screen.getByTestId('mode-stack-chip'));

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'grip:open-palette',
        }),
      );
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ presetFilter: 'MODES' });
    });

    it('dispatches the palette event even when the fetch errored', async () => {
      globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(<ModeStackChip showLabels />);
      await waitFor(() =>
        expect(screen.getByTestId('mode-stack-chip')).toHaveTextContent('MODES —'),
      );

      fireEvent.click(screen.getByTestId('mode-stack-chip'));
      // The button must stay functional — the whole point is that the chip
      // can recover the user to the palette even when the backend is down.
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe('route changes', () => {
    it('re-fetches modes when the pathname changes (council rider: no cached state)', async () => {
      const fetchSpy = mockFetchResponse({ modes: ['code'] });
      globalThis.fetch = fetchSpy;

      const { rerender } = render(<ModeStackChip showLabels />);
      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

      currentPathname = '/agents';
      rerender(<ModeStackChip showLabels />);

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    });
  });

  describe('feature flag', () => {
    it('returns null when sidebarShowModeChip === "false"', () => {
      localStorage.setItem('sidebarShowModeChip', 'false');
      globalThis.fetch = mockFetchResponse({ modes: ['code'] });

      const { container } = render(<ModeStackChip showLabels />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when the flag is unset', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code'] });

      render(<ModeStackChip showLabels />);

      await waitFor(() => expect(screen.getByTestId('mode-stack-chip')).toBeInTheDocument());
    });

    it('renders when the flag is any other value', async () => {
      localStorage.setItem('sidebarShowModeChip', 'true');
      globalThis.fetch = mockFetchResponse({ modes: ['code'] });

      render(<ModeStackChip showLabels />);

      await waitFor(() => expect(screen.getByTestId('mode-stack-chip')).toBeInTheDocument());
    });
  });

  describe('accessibility', () => {
    it('exposes an aria-label describing the active-stack state', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code', 'architect'] });

      render(<ModeStackChip showLabels />);
      const chip = await waitFor(() => screen.getByTestId('mode-stack-chip'));

      expect(chip).toHaveAttribute(
        'aria-label',
        '2 modes active: code, architect. Click to manage.',
      );
    });

    it('exposes a singular aria-label when only one mode is active', async () => {
      globalThis.fetch = mockFetchResponse({ modes: ['code'] });

      render(<ModeStackChip showLabels />);
      const chip = await waitFor(() => screen.getByTestId('mode-stack-chip'));

      expect(chip).toHaveAttribute(
        'aria-label',
        '1 mode active: code. Click to manage.',
      );
    });

    it('uses the no-modes aria-label when the stack is empty', async () => {
      globalThis.fetch = mockFetchResponse({ modes: [] });

      render(<ModeStackChip showLabels />);
      const chip = await waitFor(() => screen.getByTestId('mode-stack-chip'));

      expect(chip).toHaveAttribute(
        'aria-label',
        'No modes active. Click to stack modes.',
      );
    });
  });
});
