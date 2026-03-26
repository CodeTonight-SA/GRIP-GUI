'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Terminal,
  FolderKanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bot,
  BarChart2,
  CalendarClock,
  Zap,
  Columns,
  Moon,
  Sun,
  Archive,
  Brain,
  Sparkles,
  BookOpen,
  Layers,
} from 'lucide-react';
import { useStore } from '@/store';
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
];

const bottomItems = [
  { href: '/learn', icon: BookOpen, label: 'LEARN', shortcut: '?' },
];

interface SidebarProps {
  isMobile?: boolean;
}

const navContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
};

export default function Sidebar({ isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen, darkMode, toggleDarkMode, vaultUnreadCount } = useStore();
  const reduceMotion = useReducedMotion();

  const sidebarWidth = isMobile ? 240 : (sidebarCollapsed ? 64 : 240);
  const showLabels = isMobile || !sidebarCollapsed;

  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
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
          group/nav relative flex items-center gap-3 px-3 py-2.5 transition-all duration-150
          font-mono text-xs tracking-wider
          ${isActive
            ? 'text-[var(--primary)] border-l-2 border-[var(--primary)] bg-[var(--primary)]/5'
            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-l-2 border-transparent'
          }
        `}
      >
        <div className="relative shrink-0">
          <item.icon className="w-4 h-4" strokeWidth={1.5} />
          {item.href === '/vault' && vaultUnreadCount > 0 && !showLabels && (
            <span className="absolute -top-1 -right-1 min-w-[12px] h-[12px] flex items-center justify-center text-[9px] font-bold bg-[var(--primary)] text-[var(--primary-foreground)] px-0.5">
              {vaultUnreadCount}
            </span>
          )}
        </div>
        {showLabels && (
          <span className="flex-1 text-xs tracking-widest">
            {item.label}
          </span>
        )}
        {showLabels && item.shortcut && (
          <span className="text-[10px] text-[var(--muted-foreground)] opacity-50 font-mono">
            {item.shortcut}
          </span>
        )}
        {/* Collapsed tooltip — shows label on hover when sidebar is collapsed */}
        {!showLabels && (
          <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--card)] border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--foreground)] whitespace-nowrap opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity z-50">
            {item.label}
            {item.shortcut && <span className="text-[var(--muted-foreground)] ml-2">{item.shortcut}</span>}
          </span>
        )}
        {item.href === '/vault' && vaultUnreadCount > 0 && showLabels && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-mono font-bold bg-[var(--primary)] text-[var(--primary-foreground)] px-0.5">
            {vaultUnreadCount}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo — triple-click navigates to /vortex */}
      <div
        className={`flex items-center px-4 border-b border-[var(--border)] cursor-pointer ${isMobile ? 'h-14' : 'h-16 mt-7'}`}
        onClick={(e) => {
          if (e.detail === 3) {
            router.push('/vortex');
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[var(--primary)] shrink-0 grip-logo-heartbeat" />
          {showLabels && (
            <div>
              <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)] transition-all duration-300 hover:text-[var(--primary)] hover:drop-shadow-[0_0_6px_var(--primary)]">
                GRIP
              </span>
              <span className="block font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] leading-none mt-0.5">
                KNOWLEDGE WORK ENGINE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <motion.nav
        className="flex-1 py-3 px-1 space-y-0.5 overflow-y-auto"
        variants={reduceMotion ? undefined : navContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {navItems.map((item) => (
          <motion.div
            key={item.href}
            variants={reduceMotion ? undefined : navItemVariants}
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            <NavLink item={item} onClick={isMobile ? handleNavClick : undefined} />
          </motion.div>
        ))}
      </motion.nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--border)]">
        {bottomItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={isMobile ? handleNavClick : undefined} />
        ))}
        <Link
          href="/settings"
          onClick={isMobile ? handleNavClick : undefined}
          className={`
            flex items-center gap-3 px-4 py-2.5 font-mono text-xs tracking-wider transition-colors
            ${pathname === '/settings' || pathname.startsWith('/settings/')
              ? 'text-[var(--primary)] border-l-2 border-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-l-2 border-transparent'
            }
          `}
        >
          <Settings className="w-4 h-4" strokeWidth={1.5} />
          {showLabels && <span className="text-xs tracking-widest">SETTINGS</span>}
        </Link>
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors font-mono text-xs tracking-wider border-l-2 border-transparent"
        >
          {darkMode ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
          {showLabels && <span className="text-xs tracking-widest">{darkMode ? 'LIGHT' : 'DARK'}</span>}
        </button>
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors border-l-2 border-transparent"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-widest">COLLAPSE</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Status indicator */}
      {showLabels && (
        <div className="px-4 py-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[var(--primary)] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 bg-[var(--primary)]" />
            </span>
            <span>CONNECTED</span>
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
        className="fixed left-0 top-0 h-screen bg-[var(--card)] border-r border-[var(--border)] flex-col z-50 hidden lg:flex"
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
          className="fixed left-0 top-0 h-screen bg-[var(--card)] border-r border-[var(--border)] flex flex-col z-50 lg:hidden"
          style={{ width: sidebarWidth }}
        >
          {sidebarContent}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
