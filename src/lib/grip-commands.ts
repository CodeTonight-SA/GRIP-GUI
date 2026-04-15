export interface GripCommand {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
}

export type CommandCategory =
  | 'workflow'
  | 'code'
  | 'session'
  | 'research'
  | 'system'
  | 'meta';

export const COMMAND_CATEGORIES: Record<CommandCategory, { label: string }> = {
  workflow: { label: 'WORKFLOW' },
  code: { label: 'CODE' },
  session: { label: 'SESSION' },
  research: { label: 'RESEARCH' },
  system: { label: 'SYSTEM' },
  meta: { label: 'META / RSI' },
};

export const GRIP_COMMANDS: GripCommand[] = [
  // Workflow — the core RSI + converge loop
  { id: 'save', name: '/save', description: 'Persist session state across memory subsystems', category: 'workflow' },
  { id: 'recall', name: '/recall', description: 'One-shot recall of all GRIP memory subsystems', category: 'workflow' },
  { id: 'converge', name: '/converge', description: 'Single-wave recursive convergence on a goal', category: 'workflow' },
  { id: 'rsi', name: '/rsi', description: 'Recursive self-improvement sprint', category: 'workflow' },
  { id: 'auto-rsi', name: '/auto-rsi', description: 'Fire-and-forget autonomous RSI sprint', category: 'workflow' },
  { id: 'broly', name: '/broly', description: 'Multi-framework reasoning meta-agent', category: 'workflow' },
  { id: 'broly-auto', name: '/broly-auto', description: 'Autonomous broly council execution', category: 'workflow' },
  { id: 'focus', name: '/focus', description: 'Kanban session tracking with checklists', category: 'workflow' },
  { id: 'steer', name: '/steer', description: 'Queue steering items during active loops', category: 'workflow' },

  // Code — shipping and review
  { id: 'create-pr', name: '/create-pr', description: 'Branch + commit + push + PR in one command', category: 'code' },
  { id: 'shipit', name: '/shipit', description: 'Batch commit-push-PR workflow', category: 'code' },
  { id: 'gitops', name: '/gitops', description: 'Trunk-based git workflow automation', category: 'code' },
  { id: 'feature-complete', name: '/feature-complete', description: '7-phase feature development with design principles', category: 'code' },
  { id: 'ui-complete', name: '/ui-complete', description: 'Mobile-first responsive UI with anti-slop aesthetics', category: 'code' },
  { id: 'figma', name: '/figma', description: 'Translate Figma designs into production code', category: 'code' },
  { id: 'generate-e2e-tests', name: '/generate-e2e-tests', description: 'Playwright + Vitest + MSW test scaffolding', category: 'code' },
  { id: 'prune-branches', name: '/prune-branches', description: 'Clean up merged local + remote branches', category: 'code' },

  // Session — lifecycle and mode
  { id: 'activate-grip', name: '/activate-grip', description: 'Identity and onboarding wizard', category: 'session' },
  { id: 'onboard', name: '/onboard', description: 'Deploy GRIP to a new project', category: 'session' },
  { id: 'mode', name: '/mode', description: 'Switch or stack operating modes', category: 'session' },
  { id: 'pair', name: '/pair', description: 'Real-time cross-instance pair programming', category: 'session' },
  { id: 'delegate', name: '/delegate', description: 'Spawn worker agents for delegated tasks', category: 'session' },
  { id: 'chat', name: '/chat', description: 'Start a fresh conversation context', category: 'session' },
  { id: 'closeout', name: '/closeout', description: 'End-of-session checklist with git + memory save', category: 'session' },

  // Research — knowledge retrieval
  { id: 'remind-yourself', name: '/remind-yourself', description: 'Search past conversations and plans', category: 'research' },
  { id: 'catch-me-up', name: '/catch-me-up', description: 'Reason about reasoning and audit achievements', category: 'research' },
  { id: 'check-last-plan', name: '/check-last-plan', description: 'Resume and verify the last plan', category: 'research' },
  { id: 'detect-insights', name: '/detect-insights', description: 'Pattern detection pipeline', category: 'research' },
  { id: 'preplan', name: '/preplan', description: 'Prepare executable plans for future sessions', category: 'research' },

  // System — diagnostics and ops
  { id: 'grip-doctor', name: '/grip-doctor', description: 'GRIP infrastructure health diagnostic', category: 'system' },
  { id: 'grip-inspect', name: '/grip-inspect', description: 'Deep introspection of GRIP installation state', category: 'system' },
  { id: 'grip-config', name: '/grip-config', description: 'Configure GRIP settings and thresholds', category: 'system' },
  { id: 'backup-grip', name: '/backup-grip', description: 'Tiered backup of GRIP infrastructure', category: 'system' },
  { id: 'restore-grip', name: '/restore-grip', description: 'Restore GRIP from a backup snapshot', category: 'system' },
  { id: 'install-mcp', name: '/install-mcp', description: 'Install an MCP server', category: 'system' },
  { id: 'caffeinate', name: '/caffeinate', description: 'Prevent macOS sleep during long sessions', category: 'system' },
  { id: 'node-clean', name: '/node-clean', description: 'Terminate lingering Node.js processes', category: 'system' },

  // Meta — learning and self-improvement
  { id: 'learn', name: '/learn', description: 'Extract patterns from errors and successes', category: 'meta' },
  { id: 'refresh-context', name: '/refresh-context', description: 'Rebuild mental model of the repository', category: 'meta' },
  { id: 'update-docs', name: '/update-docs', description: 'Auto-update project docs from session history', category: 'meta' },
  { id: 'audit-efficiency', name: '/audit-efficiency', description: 'Detect workflow inefficiencies with patterns', category: 'meta' },
  { id: 'rave', name: '/rave', description: 'Italian Brainrot milestone narration', category: 'meta' },
];

/**
 * Fuzzy search commands by name or description.
 */
export function searchCommands(query: string): GripCommand[] {
  if (!query) return GRIP_COMMANDS;
  const q = query.toLowerCase().replace(/^\//, '');
  return GRIP_COMMANDS.filter(
    cmd =>
      cmd.name.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q),
  );
}
