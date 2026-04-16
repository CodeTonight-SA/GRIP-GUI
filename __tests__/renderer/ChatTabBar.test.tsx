// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatTabBar from '../../src/components/Engine/ChatTabBar';

// chat-storage uses localStorage — mock it at module level
vi.mock('../../src/lib/chat-storage', () => ({
  getChatSessions: () => [
    { id: 'tab-1', title: 'First Chat', model: 'sonnet', createdAt: '', updatedAt: '', messageCount: 2 },
    { id: 'tab-2', title: 'Second Chat', model: 'opus', createdAt: '', updatedAt: '', messageCount: 5 },
  ],
}));

const DEFAULT_PROPS = {
  openTabIds: ['tab-1', 'tab-2'],
  activeTabId: 'tab-1',
  onTabSelect: vi.fn(),
  onTabClose: vi.fn(),
  onNewTab: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ChatTabBar', () => {
  describe('rendering', () => {
    it('renders all open tab titles', () => {
      render(<ChatTabBar {...DEFAULT_PROPS} />);
      expect(screen.getByText(/FIRST CHAT/i)).toBeInTheDocument();
      expect(screen.getByText(/SECOND CHAT/i)).toBeInTheDocument();
    });

    it('renders the new-tab (+) button', () => {
      render(<ChatTabBar {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('New chat tab')).toBeInTheDocument();
    });

    it('does not render new-tab button when at maxTabs', () => {
      const ids = Array.from({ length: 8 }, (_, i) => `tab-${i}`);
      render(<ChatTabBar {...DEFAULT_PROPS} openTabIds={ids} maxTabs={8} />);
      expect(screen.queryByLabelText('New chat tab')).not.toBeInTheDocument();
    });

    it('marks the active tab with aria-selected=true', () => {
      render(<ChatTabBar {...DEFAULT_PROPS} activeTabId="tab-2" />);
      const tabs = screen.getAllByRole('tab');
      const activeTab = tabs.find(t => t.getAttribute('aria-selected') === 'true');
      expect(activeTab).toBeDefined();
    });
  });

  describe('interactions', () => {
    it('calls onTabSelect when a tab is clicked', () => {
      const onTabSelect = vi.fn();
      render(<ChatTabBar {...DEFAULT_PROPS} onTabSelect={onTabSelect} />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.click(tabs[1]); // click second tab
      expect(onTabSelect).toHaveBeenCalledWith('tab-2');
    });

    it('calls onNewTab when the + button is clicked', () => {
      const onNewTab = vi.fn();
      render(<ChatTabBar {...DEFAULT_PROPS} onNewTab={onNewTab} />);
      fireEvent.click(screen.getByLabelText('New chat tab'));
      expect(onNewTab).toHaveBeenCalledOnce();
    });

    it('calls onTabClose when the close button is clicked without selecting the tab', () => {
      const onTabClose = vi.fn();
      const onTabSelect = vi.fn();
      render(<ChatTabBar {...DEFAULT_PROPS} onTabClose={onTabClose} onTabSelect={onTabSelect} />);
      // Click close on tab-2
      fireEvent.click(screen.getByLabelText('Close tab: Second Chat'));
      expect(onTabClose).toHaveBeenCalledWith('tab-2');
      expect(onTabSelect).not.toHaveBeenCalled();
    });

    it('responds to Enter key for keyboard navigation', () => {
      const onTabSelect = vi.fn();
      render(<ChatTabBar {...DEFAULT_PROPS} onTabSelect={onTabSelect} />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[1], { key: 'Enter' });
      expect(onTabSelect).toHaveBeenCalledWith('tab-2');
    });
  });
});
