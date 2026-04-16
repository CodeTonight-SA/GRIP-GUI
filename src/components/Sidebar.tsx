'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Terminal,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bot,
  BarChart2,
  CalendarClock,
  Zap,
  Columns,
  Palette,
  Archive,
  Brain,
  Sparkles,
  BookOpen,
  Layers,
  Lightbulb,
  Map,
  Plus,
} from 'lucide-react';
import { useStore } from '@/store';
import { getTheme } from '@/lib/themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/', icon: Terminal, label: 'ENGINE', shortcut: '1' },
  { href: '/agents', icon: Bot, label: 'AGENTS', shortcut: '2' },
  { href: '/kanban', icon: Columns, label: 'TASKS', shortcut: '3' },
  { href: '/vault', icon: Archive, label: 'VAULT', shortcut: '4' },
  { href: '/skills', icon: Sparkles, label: 'SKILLS', shortcut: '5' },
  { href: '/modes', icon: Layers, label: 'MODES', shortcut: '6' },
  { href: '/automations', icon: Zap, label: 'AUTOMATIONS', shortcut: '7' },
  { href: '/recurring-tasks', icon: CalendarClock, label: 'SCHEDULED', shortcut: '8' },
  { href: '/usage', icon: BarChart2, label: 'USAGE', shortcut: '9' },
  { href: '/memory', icon: Brain, label: 'MEMORY', shortcut: 'M' },
  { href: '/insights', icon: Lightbulb, label: 'INSIGHTS', shortcut: 'I' },
  { href: '/roadmap', icon: Map, label: 'ROADMAP', shortcut: 'R' },
];

const bottomItems = [
  { href: '/learn', icon: BookOpen, label: 'LEARN', shortcut: '?' },
];

interface SidebarProps {
  isMobile?: boolean;
}

// Stagger the nav items in on mount only — no scale transforms (Swiss Nihilism compliance)
const navContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' as const } },
};

export default function Sidebar({ isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen, theme, vaultUnreadCount } = useStore();
  const reduceMotion = useReducedMotion();

  const sidebarWidth = isMobile ? 240 : (sidebarCollapsed ? 56 : 224);
  const showLabels = isMobile || !sidebarCollapsed;

  const handleNavClick = () => {
    if (isMobile) setMobileMenuOpen(false);
  };

  const NavLink = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) => {
    const isActive = item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`
          group/nav relative flex items-center gap-2.5 px-3 py-2 transition-all duration-150
          font-mono text-xs tracking-wider
          ${isActive
            ? 'text-[var(--primary)] border-l-2 border-[var(--primary)] bg-[var(--secondary)]'
            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-l-2 border-transparent hover:bg-[var(--secondary)]'
          }
        `}
      >
        <div className="relative shrink-0">
          <item.icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
          {item.href === '/vault' && vaultUnreadCount > 0 && !showLabels && (
            <span className="absolute -top-1 -right-1 min-w-[12px] h-[12px] flex items-center justify-center text-[9px] font-bold bg-[var(--primary)] text-[var(--primary-foreground)] px-0.5">
              {vaultUnreadCount}
            </span>
          )}
        </div>
        {showLabels && (
          <span className="flex-1 text-[11px] tracking-widest">
            {item.label}
          </span>
        )}
        {showLabels && item.href === '/vault' && vaultUnreadCount > 0 && (
          <span className="min-w-[18px] h-[16px] flex items-center justify-center text-[9px] font-mono font-bold bg-[var(--primary)] text-[var(--primary-foreground)] px-1">
            {vaultUnreadCount}
          </span>
        )}
        {showLabels && item.shortcut && !(item.href === '/vault' && vaultUnreadCount > 0) && (
          <span className="text-[9px] text-[var(--muted-foreground)] opacity-40 font-mono tabular-nums">
            {item.shortcut}
          </span>
        )}
        {/* Collapsed tooltip */}
        {!showLabels && (
          <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--card)] border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--foreground)] whitespace-nowrap opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm">
            {item.label}
            {item.shortcut && <span className="text-[var(--muted-foreground)] ml-2 opacity-60">{item.shortcut}</span>}
          </span>
        )}
      </Link>
    );
  };

  const currentThemeDef = getTheme(theme);

  const sidebarContent = (
    <>
      {/* Logo — triple-click navigates to /vortex */}
      <div
        className={`flex items-center px-3 border-b border-[var(--border)] cursor-pointer shrink-0 ${isMobile ? 'h-14' : 'h-14 mt-7'}`}
        onClick={(e) => {
          if (e.detail === 3) router.push('/vortex');
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-[var(--primary)] shrink-0 grip-logo-heartbeat" />
          {showLabels && (
            <div className="min-w-0">
              <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)] transition-colors duration-150 hover:text-[var(--primary)]">
                GRIP
              </span>
              <span className="block font-mono text-[9px] tracking-widest text-[var(--muted-foreground)] leading-none mt-0.5 truncate">
                COMMANDER
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main navigation */}
      <motion.nav
        className="flex-1 py-2 px-1 space-y-px overflow-y-auto"
        variants={reduceMotion ? undefined : navContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {navItems.map((item) => (
          <motion.div
            key={item.href}
            variants={reduceMotion ? undefined : navItemVariants}
          >
            <NavLink item={item} onClick={isMobile ? handleNavClick : undefined} />
          </motion.div>
        ))}
      </motion.nav>

      {/* Bottom section — Learn, Settings, Theme, Collapse */}
      <div className="border-t border-[var(--border)] shrink-0">
        {bottomItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={isMobile ? handleNavClick : undefined} />
        ))}
        <Link
          href="/settings"
          onClick={isMobile ? handleNavClick : undefined}
          className={`
            relative flex items-center gap-2.5 px-3 py-2 font-mono text-xs tracking-wider transition-all duration-150
            ${pathname === '/settings' || pathname.startsWith('/settings/')
              ? 'text-[var(--primary)] border-l-2 border-[var(--primary)] bg-[var(--secondary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-l-2 border-transparent hover:bg-[var(--secondary)]'
            }
          `}
        >
          <Settings className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          {showLabels && <span className="text-[11px] tracking-widest">SETTINGS</span>}
          {!showLabels && (
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--card)] border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--foreground)] whitespace-nowrap opacity-0 hover:opacity-100 pointer-events-none z-50">
              SETTINGS
            </span>
          )}
        </Link>
        <button
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).electronAPI?.grip?.createSession?.();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-150 font-mono text-xs tracking-wider border-l-2 border-transparent hover:bg-[var(--secondary)]"
          title="New Session (Cmd+N)"
        >
          <Plus className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          {showLabels && <span className="text-[11px] tracking-widest">NEW SESSION</span>}
          {showLabels && (
            <span className="text-[9px] text-[var(--muted-foreground)] opacity-40 font-mono">N</span>
          )}
        </button>
        <button
          onClick={() => useStore.getState().cycleTheme()}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-150 font-mono text-xs tracking-wider border-l-2 border-transparent hover:bg-[var(--secondary)]"
          title={`Theme: ${currentThemeDef.name} (T to cycle)`}
        >
          {/* Colour dot reflecting active theme primary */}
          <div
            className="w-4 h-4 shrink-0 border border-[var(--border)]"
            style={{ backgroundColor: currentThemeDef.colors.primary }}
            aria-hidden="true"
          />
          {showLabels && (
            <span className="text-[10px] tracking-widest truncate flex-1 text-left">
              {currentThemeDef.name.toUpperCase()}
            </span>
          )}
          {showLabels && (
            <span className="text-[9px] text-[var(--muted-foreground)] opacity-40 font-mono">T</span>
          )}
        </button>
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-150 border-l-2 border-transparent hover:bg-[var(--secondary)]"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="font-mono text-[11px] tracking-widest">COLLAPSE</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Status bar — integrated into footer, minimal height */}
      {showLabels && (
        <div className="px-3 py-1.5 border-t border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full bg-[var(--success)] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 bg-[var(--success)]" />
              </span>
              <span>ONLINE</span>
            </div>
            <span className="opacity-40">GRIP</span>
          </div>
        </div>
      )}
    </>
  );

  // Desktop sidebar
  if (!isMobile) {
    return (
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-screen bg-[var(--card)] border-r border-[var(--border)] flex flex-col z-50 hidden lg:flex overflow-hidden"
      >
        {sidebarContent}
      </motion.aside>
    );
  }

  // Mobile sidebar (drawer)
  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.aside
          initial={{ x: -sidebarWidth }}
          animate={{ x: 0 }}
          exit={{ x: -sidebarWidth }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed left-0 top-0 h-screen bg-[var(--card)] border-r border-[var(--border)] flex flex-col z-50 lg:hidden overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          {sidebarContent}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
