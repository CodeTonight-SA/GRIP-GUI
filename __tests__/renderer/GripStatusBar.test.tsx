// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GripStatusBar from '../../src/components/Engine/GripStatusBar';
import { APP_VERSION } from '../../src/lib/app-version';

// GripPulse and SessionSparkline are canvas-heavy — stub them
vi.mock('../../src/components/Engine/GripPulse', () => ({
  default: () => <div data-testid="grip-pulse" />,
}));
vi.mock('../../src/components/Engine/SessionSparkline', () => ({
  default: () => <div data-testid="session-sparkline" />,
}));

describe('GripStatusBar', () => {
  describe('default props', () => {
    it('renders mode label', () => {
      render(<GripStatusBar />);
      expect(screen.getByText('CODE')).toBeInTheDocument();
    });

    it('renders skill count', () => {
      render(<GripStatusBar skillCount={12} />);
      expect(screen.getByText('12 SKILLS')).toBeInTheDocument();
    });

    it('renders context percentage', () => {
      render(<GripStatusBar contextPercent={47} />);
      expect(screen.getByText(/CTX 47%/)).toBeInTheDocument();
    });

    it('shows GATES ACTIVE when safetyActive is true', () => {
      render(<GripStatusBar safetyActive={true} />);
      expect(screen.getByText('GATES ACTIVE')).toBeInTheDocument();
    });

    it('shows GATES OFF when safetyActive is false', () => {
      render(<GripStatusBar safetyActive={false} />);
      expect(screen.getByText('GATES OFF')).toBeInTheDocument();
    });
  });

  describe('streaming state', () => {
    it('shows STREAMING indicator when isStreaming=true', () => {
      render(<GripStatusBar isStreaming={true} />);
      expect(screen.getByText('STREAMING')).toBeInTheDocument();
    });

    it('does not show STREAMING when isStreaming=false', () => {
      render(<GripStatusBar isStreaming={false} />);
      expect(screen.queryByText('STREAMING')).not.toBeInTheDocument();
    });
  });

  describe('metrics', () => {
    it('shows model name when metrics.model is provided', () => {
      render(<GripStatusBar metrics={{ model: 'claude-sonnet', numTurns: 3, totalDurationMs: 2000, inputTokens: 100, outputTokens: 50, sessionId: 'x' }} />);
      expect(screen.getByText('CLAUDE-SONNET')).toBeInTheDocument();
    });

    it('shows turn count', () => {
      render(<GripStatusBar metrics={{ model: 'sonnet', numTurns: 7, totalDurationMs: 5000, inputTokens: 100, outputTokens: 50, sessionId: 'x' }} />);
      expect(screen.getByText('7 TURNS')).toBeInTheDocument();
    });
  });

  describe('context percent (S2-PR1)', () => {
    it('renders "CTX --" when contextPercent is not passed', () => {
      render(<GripStatusBar />);
      expect(screen.getByText(/CTX --/)).toBeInTheDocument();
    });

    it('renders an empty gauge (0% width, transparent fill) when contextPercent is undefined', () => {
      render(<GripStatusBar />);
      const ctx = screen.getByTestId('status-bar-context');
      const gauge = ctx.querySelector('[style]') as HTMLDivElement;
      expect(gauge).not.toBeNull();
      expect(gauge.style.width).toBe('0%');
      expect(gauge.className).toMatch(/bg-transparent/);
    });

    it('renders an active gauge when contextPercent is a real value', () => {
      render(<GripStatusBar contextPercent={47} />);
      const ctx = screen.getByTestId('status-bar-context');
      const gauge = ctx.querySelector('[style*="width"]') as HTMLDivElement;
      expect(gauge.style.width).toBe('47%');
      expect(gauge.className).toMatch(/bg-\[var\(--primary\)\]/);
    });

    it('uses the warning colour band between 60 and 80', () => {
      render(<GripStatusBar contextPercent={72} />);
      const gauge = screen
        .getByTestId('status-bar-context')
        .querySelector('[style*="width"]') as HTMLDivElement;
      expect(gauge.className).toMatch(/bg-\[var\(--warning\)\]/);
    });

    it('uses the danger colour band above 80', () => {
      render(<GripStatusBar contextPercent={91} />);
      const gauge = screen
        .getByTestId('status-bar-context')
        .querySelector('[style*="width"]') as HTMLDivElement;
      expect(gauge.className).toMatch(/bg-\[var\(--danger\)\]/);
    });
  });

  describe('version (S2-PR1)', () => {
    it('falls back to APP_VERSION from package.json when no prop is passed', () => {
      render(<GripStatusBar />);
      const versionEl = screen.getByTestId('status-bar-version');
      expect(versionEl.textContent).toBe(`GRIP ${APP_VERSION}`);
      // Sanity: the app is post-v0.1.0. Anyone shipping a status bar that
      // claims "GRIP 0.1.0" while `package.json` says otherwise is regressing.
      expect(versionEl.textContent).not.toBe('GRIP 0.1.0');
    });

    it('renders the passed version string verbatim', () => {
      render(<GripStatusBar version="9.9.9" />);
      expect(screen.getByTestId('status-bar-version').textContent).toBe('GRIP 9.9.9');
    });

    it('accepts non-semver version identifiers (pre-release, git sha)', () => {
      render(<GripStatusBar version="0.5.0-rc.1" />);
      expect(screen.getByTestId('status-bar-version').textContent).toBe('GRIP 0.5.0-rc.1');
    });
  });
});
