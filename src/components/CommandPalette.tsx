'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { GRIP_MODES } from '@/lib/grip-modes';
import { GRIP_SKILLS, searchSkills } from '@/lib/grip-skills';
import { GRIP_COMMANDS } from '@/lib/grip-commands';
import { enqueueRunCommand } from '@/lib/palette-intent-queue';
import { getActiveModes, setActiveModes } from '@/lib/grip-modes-client';
import { useRouter } from 'next/navigation';

type Category = 'RECENT' | 'NAVIGATE' | 'COMMANDS' | 'MODES' | 'PARAMOUNT' | 'SKILLS' | 'ACTIONS' | 'HIDDEN';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  category: Category;
  action: () => void;
}

const RECENT_KEY = 'grip-command-palette-recent';
const MAX_RECENT = 5;
const OPEN_EVENT = 'grip:open-palette';

interface OpenPaletteDetail {
  presetFilter?: Category;
  query?: string;
}

function getRecentCommands(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function saveRecentCommand(id: string): void {
  try {
    const recent = getRecentCommands().filter(r => r !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* privacy mode — ignore */ }
}

/**
 * Dispatch a window-level intent event. Listeners choose what "activation" means:
 * today they are unwired (no-op after the palette closes), but the contract lets
 * future chat/terminal subsystems pick up skills and commands without touching
 * the palette itself.
 */
function dispatchIntent(type: 'grip:activate-skill' | 'grip:run-command', id: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail: { id } }));
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [presetFilter, setPresetFilter] = useState<Category | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Navigation commands — routing to top-level pages
  const navigationCommands: CommandItem[] = [
    { id: 'nav-engine', label: 'Engine', description: 'Open chat interface', category: 'NAVIGATE', action: () => router.push('/') },
    { id: 'nav-agents', label: 'Agents', description: 'Manage agent pool', category: 'NAVIGATE', action: () => router.push('/agents') },
    { id: 'nav-tasks', label: 'Tasks', description: 'Kanban task board', category: 'NAVIGATE', action: () => router.push('/kanban') },
    { id: 'nav-vault', label: 'Vault', description: 'Document storage', category: 'NAVIGATE', action: () => router.push('/vault') },
    { id: 'nav-skills', label: 'Skills', description: `Browse ${GRIP_SKILLS.length} skills`, category: 'NAVIGATE', action: () => router.push('/skills') },
    { id: 'nav-modes', label: 'Modes', description: 'Switch operating mode', category: 'NAVIGATE', action: () => router.push('/modes') },
    { id: 'nav-learn', label: 'Learn', description: 'Understanding GRIP', category: 'NAVIGATE', action: () => router.push('/learn') },
    { id: 'nav-settings', label: 'Settings', description: 'Configuration', category: 'NAVIGATE', action: () => router.push('/settings') },
  ];

  // Slash commands — enqueue the intent so ChatInterface can consume it on
  // mount (fixes the race where dispatch fires before the listener is
  // attached after router.push), then dispatch the event for already-mounted
  // listeners, then route to the engine view.
  const slashCommands: CommandItem[] = GRIP_COMMANDS.map(cmd => ({
    id: `cmd-${cmd.id}`,
    label: cmd.name,
    description: cmd.description,
    category: 'COMMANDS' as Category,
    action: () => {
      enqueueRunCommand(cmd.id, cmd.name);
      dispatchIntent('grip:run-command', cmd.id);
      router.push('/');
    },
  }));

  // Modes — click toggles active set via /api/grip/modes
  const modeCommands: CommandItem[] = GRIP_MODES.map(mode => ({
    id: `mode-${mode.id}`,
    label: `/mode ${mode.id}`,
    description: mode.description,
    category: 'MODES',
    action: () => {
      void toggleModeViaApi(mode.id);
    },
  }));

  // Skills — narrow to top-20 when there's no query so the palette isn't
  // dominated by 149 rows, but use the full registry via searchSkills() when
  // the user actually types something
  const skillSource = query ? searchSkills(query) : GRIP_SKILLS.slice(0, 20);
  const skillCommands: CommandItem[] = skillSource.map(skill => ({
    id: `skill-${skill.id}`,
    label: skill.name,
    description: skill.description,
    category: skill.paramount ? 'PARAMOUNT' : 'SKILLS',
    action: () => {
      dispatchIntent('grip:activate-skill', skill.id);
      router.push(`/skills?highlight=${encodeURIComponent(skill.id)}`);
    },
  }));

  const actionCommands: CommandItem[] = [
    { id: 'action-new-chat', label: 'New Chat', description: 'Start a fresh conversation', category: 'ACTIONS', action: () => router.push('/') },
    { id: 'action-dark-mode', label: 'Toggle Dark Mode', description: 'Switch between light and dark', category: 'ACTIONS', action: () => {
      document.documentElement.classList.toggle('dark');
    }},
  ];

  const hiddenCommands: CommandItem[] = [
    { id: 'easter-vortex', label: 'Vortex', description: 'Enter the knowledge double helix', category: 'HIDDEN', action: () => router.push('/vortex') },
  ];

  const allCommands: CommandItem[] = [
    ...navigationCommands,
    ...slashCommands,
    ...modeCommands,
    ...skillCommands,
    ...actionCommands,
    ...hiddenCommands,
  ];

  // Recently used commands (shown when no query and no preset filter)
  const recentIds = getRecentCommands();
  const recentCommands = recentIds
    .map(id => allCommands.find(c => c.id === id))
    .filter((c): c is CommandItem => c != null)
    .map(c => ({ ...c, category: 'RECENT' as Category }));

  // Filtering strategy:
  // - With a preset filter → strictly restrict to that category (Cmd+Shift+M → MODES)
  // - With a query → fuzzy match label + description across everything
  // - Idle → recents + navigation + actions (plus a few top commands as discoverability)
  let filtered: CommandItem[];
  if (presetFilter) {
    filtered = allCommands.filter(cmd => cmd.category === presetFilter);
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(cmd =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q),
      );
    }
  } else if (query) {
    const q = query.toLowerCase();
    filtered = allCommands.filter(cmd =>
      cmd.category !== 'HIDDEN' || cmd.label.toLowerCase().includes(q),
    ).filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q),
    );
  } else {
    const topCommandIds = new Set(['cmd-save', 'cmd-recall', 'cmd-converge', 'cmd-broly', 'cmd-create-pr', 'cmd-shipit']);
    filtered = [
      ...recentCommands,
      ...navigationCommands,
      ...slashCommands.filter(c => topCommandIds.has(c.id)),
      ...actionCommands,
    ];
  }

  // Group by category — preserve insertion order across categories
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const openWith = useCallback((detail: OpenPaletteDetail) => {
    setIsOpen(true);
    setPresetFilter(detail.presetFilter ?? null);
    setQuery(detail.query ?? '');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPresetFilter(null);
    setQuery('');
  }, []);

  // Keyboard + window-event bindings
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          openWith({});
        }
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    const openHandler = (e: Event) => {
      const detail = (e as CustomEvent<OpenPaletteDetail>).detail ?? {};
      openWith(detail);
    };
    window.addEventListener('keydown', keyHandler);
    window.addEventListener(OPEN_EVENT, openHandler as EventListener);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener(OPEN_EVENT, openHandler as EventListener);
    };
  }, [isOpen, openWith, close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside the palette
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected) {
        saveRecentCommand(selected.id);
        selected.action();
        // For MODES preset we keep the palette open so the operator can stack
        // multiple modes in a single session without re-invoking Cmd+Shift+M
        if (presetFilter !== 'MODES') close();
      }
    }
  }, [filtered, selectedIndex, presetFilter, close]);

  if (!isOpen) return null;

  let flatIndex = 0;
  const placeholder = presetFilter === 'MODES'
    ? 'Stack modes — press Enter to toggle, Esc when done...'
    : 'Search commands, skills, modes...';

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />

      {/* Palette */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-[var(--card)] border border-[var(--border)] animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--muted-foreground)]" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-0 focus:border-none"
            style={{ boxShadow: 'none' }}
          />
          {presetFilter && (
            <span className="font-mono text-[10px] tracking-widest text-[var(--primary)] border border-[var(--primary)] px-1.5 py-0.5">
              {presetFilter}
            </span>
          )}
          <span className="font-mono text-[10px] text-[var(--muted-foreground)] border border-[var(--border)] px-1.5 py-0.5">
            ESC
          </span>
          <span className="font-mono text-[10px] text-[var(--muted-foreground)] opacity-50">
            {presetFilter === 'MODES' ? '⌘⇧M' : '⌘K'}
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-1.5">
                <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                  {category}
                </span>
              </div>
              {items.map((item) => {
                const currentIndex = flatIndex++;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      saveRecentCommand(item.id);
                      item.action();
                      if (presetFilter !== 'MODES') close();
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                      currentIndex === selectedIndex
                        ? 'bg-[var(--primary)]/10 text-[var(--foreground)]'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block truncate">{item.label}</span>
                      <span className="font-mono text-[10px] tracking-wider text-[var(--muted-foreground)] block truncate">
                        {item.description}
                      </span>
                    </div>
                    {currentIndex === selectedIndex && (
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)] shrink-0 ml-2">
                        ENTER
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-mono text-xs tracking-wider text-[var(--muted-foreground)]">
                NO RESULTS FOR &quot;{query}&quot;
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Toggle an active mode via getActiveModes/setActiveModes. Keeps the palette
 * stateless — the next read from the modes page reflects the new selection.
 * The grip-modes-client helper picks IPC (packaged Electron) or fetch (web)
 * transparently, so this function works in both surfaces (Issue #133).
 */
async function toggleModeViaApi(modeId: string): Promise<void> {
  try {
    const current = await getActiveModes();
    const MAX_ACTIVE_MODES = 5;
    let next: string[];
    if (current.includes(modeId)) {
      next = current.filter((m) => m !== modeId);
    } else if (current.length >= MAX_ACTIVE_MODES) {
      next = [...current.slice(1), modeId];
    } else {
      next = [...current, modeId];
    }
    await setActiveModes(next);
  } catch {
    // silent — matches the existing "silent fail" posture
  }
}
