// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GripStatusBar from '../../src/components/Engine/GripStatusBar';

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
});
