'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { GRIP_MODES } from '@/lib/grip-modes';
import { GRIP_SKILLS, searchSkills } from '@/lib/grip-skills';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  category: string;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Build command list
  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-engine', label: 'Engine', description: 'Open chat interface', category: 'NAVIGATE', action: () => router.push('/') },
    { id: 'nav-agents', label: 'Agents', description: 'Manage agent pool', category: 'NAVIGATE', action: () => router.push('/agents') },
    { id: 'nav-tasks', label: 'Tasks', description: 'Kanban task board', category: 'NAVIGATE', action: () => router.push('/kanban') },
    { id: 'nav-vault', label: 'Vault', description: 'Document storage', category: 'NAVIGATE', action: () => router.push('/vault') },
    { id: 'nav-skills', label: 'Skills', description: 'Browse 149 skills', category: 'NAVIGATE', action: () => router.push('/skills') },
    { id: 'nav-modes', label: 'Modes', description: 'Switch operating mode', category: 'NAVIGATE', action: () => router.push('/modes') },
    { id: 'nav-learn', label: 'Learn', description: 'Understanding GRIP', category: 'NAVIGATE', action: () => router.push('/learn') },
    { id: 'nav-settings', label: 'Settings', description: 'Configuration', category: 'NAVIGATE', action: () => router.push('/settings') },

    // Modes
    ...GRIP_MODES.map(mode => ({
      id: `mode-${mode.id}`,
      label: `/mode ${mode.id}`,
      description: mode.description,
      category: 'MODES',
      action: () => { router.push('/modes'); },
    })),

    // Top skills
    ...GRIP_SKILLS.slice(0, 20).map(skill => ({
      id: `skill-${skill.id}`,
      label: skill.name,
      description: skill.description,
      category: skill.paramount ? 'PARAMOUNT' : 'SKILLS',
      action: () => { router.push('/skills'); },
    })),

    // Actions
    { id: 'action-new-chat', label: 'New Chat', description: 'Start a fresh conversation', category: 'ACTIONS', action: () => router.push('/') },
    { id: 'action-dark-mode', label: 'Toggle Dark Mode', description: 'Switch between light and dark', category: 'ACTIONS', action: () => {
      document.documentElement.classList.toggle('dark');
    }},

    // Hidden: only appears when searching "vortex"
    { id: 'easter-vortex', label: 'Vortex', description: 'Enter the knowledge double helix', category: 'HIDDEN', action: () => router.push('/vortex') },
  ];

  // Filter commands
  const filtered = query
    ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands.filter(cmd => cmd.category === 'NAVIGATE' || cmd.category === 'ACTIONS')
        .filter(cmd => cmd.category !== 'HIDDEN');

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        setIsOpen(false);
      }
    }
  }, [filtered, selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setIsOpen(false)}
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
            placeholder="Search commands, skills, modes..."
            className="flex-1 bg-transparent border-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-0 focus:border-none"
            style={{ boxShadow: 'none' }}
          />
          <span className="font-mono text-[10px] text-[var(--muted-foreground)] border border-[var(--border)] px-1.5 py-0.5">
            ESC
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
                    onClick={() => { item.action(); setIsOpen(false); }}
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
