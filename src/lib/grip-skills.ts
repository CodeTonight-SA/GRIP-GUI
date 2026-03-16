export interface GripSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  paramount?: boolean;
}

export type SkillCategory =
  | 'paramount'
  | 'development'
  | 'design'
  | 'security'
  | 'research'
  | 'operations'
  | 'content'
  | 'legal'
  | 'strategy'
  | 'meta'
  | 'team'
  | 'infrastructure'
  | 'communication'
  | 'onboarding';

export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; count: number }> = {
  paramount: { label: 'PARAMOUNT', count: 5 },
  development: { label: 'DEVELOPMENT', count: 28 },
  design: { label: 'DESIGN', count: 8 },
  security: { label: 'SECURITY', count: 6 },
  research: { label: 'RESEARCH', count: 5 },
  operations: { label: 'OPERATIONS', count: 15 },
  content: { label: 'CONTENT', count: 8 },
  legal: { label: 'LEGAL', count: 4 },
  strategy: { label: 'STRATEGY', count: 10 },
  meta: { label: 'META / RSI', count: 20 },
  team: { label: 'TEAM', count: 8 },
  infrastructure: { label: 'INFRASTRUCTURE', count: 12 },
  communication: { label: 'COMMUNICATION', count: 10 },
  onboarding: { label: 'ONBOARDING', count: 5 },
};

export const GRIP_SKILLS: GripSkill[] = [
  // PARAMOUNT — always active
  { id: 'ultrathink', name: 'Ultrathink', description: 'Extended reasoning with 6 verification gates — always active', category: 'paramount', paramount: true },
  { id: 'asking-users', name: 'Asking Users', description: 'Confidence gate protocol — halts and asks when uncertain', category: 'paramount', paramount: true },
  { id: 'context-gate', name: 'Context Gate', description: '10-gate unified enforcement hook with mechanical blocking', category: 'paramount', paramount: true },
  { id: 'design-principles', name: 'Design Principles', description: 'SOLID, GRASP, DRY, KISS, YAGNI, YSH, BIG-O enforcement', category: 'paramount', paramount: true },
  { id: 'grip-first-thinking', name: 'GRIP-First Thinking', description: 'Retrieval discipline — check what you know before searching', category: 'paramount', paramount: true },

  // Development
  { id: 'feature-complete', name: 'Feature Complete', description: '7-phase feature workflow combining frontend design with GRIP principles', category: 'development' },
  { id: 'code-agentic', name: 'Code Agentic', description: 'Verification gates and rollback mechanisms for code changes', category: 'development' },
  { id: 'pr-automation', name: 'PR Automation', description: 'Efficient PR creation with gh CLI automation', category: 'development' },
  { id: 'e2e-test-generation', name: 'E2E Test Generation', description: 'Automated test infrastructure with Playwright and Vitest', category: 'development' },
  { id: 'layered-refactoring', name: 'Layered Refactoring', description: 'Systematic refactoring one architectural layer per PR', category: 'development' },
  { id: 'converge', name: 'Converge', description: 'Recursive convergence at every decomposition level', category: 'development' },

  // Design
  { id: 'swiss-nihilism-design', name: 'Swiss Nihilism', description: 'Stark, asymmetric design language with system fonts and orange accent', category: 'design' },
  { id: 'ui-complete', name: 'UI Complete', description: 'Production-grade responsive interfaces with anti-AI-slop aesthetics', category: 'design' },
  { id: 'figma-to-code', name: 'Figma to Code', description: 'Translate Figma designs to production code with 1:1 parity', category: 'design' },
  { id: 'mobile-responsive-ui', name: 'Mobile Responsive', description: 'Mobile-first responsive design with dvh units and touch targets', category: 'design' },

  // Security
  { id: 'vulnerability-detection', name: 'Vulnerability Detection', description: 'Automated security vulnerability scanning', category: 'security' },
  { id: 'threat-modeling', name: 'Threat Modelling', description: 'STRIDE-based threat analysis', category: 'security' },
  { id: 'secure-code-review', name: 'Secure Code Review', description: 'Security-focused code review', category: 'security' },
  { id: 'sanitizing-public-releases', name: 'Release Sanitisation', description: 'Scan for sensitive data before public releases', category: 'security' },

  // Research
  { id: 'research-synthesis', name: 'Research Synthesis', description: 'Evidence synthesis across multiple sources', category: 'research' },
  { id: 'evidence-evaluation', name: 'Evidence Evaluation', description: 'CRAAP framework for source credibility', category: 'research' },
  { id: 'hypothesis-validation', name: 'Hypothesis Validation', description: 'Structured hypothesis testing', category: 'research' },
  { id: 'reasoning-with-ai', name: 'Reasoning with AI', description: 'Articulate-first reasoning patterns', category: 'research' },

  // Strategy
  { id: 'red-teaming-strategic-decisions', name: 'Red Teaming', description: 'Adversarial analysis of strategic decisions', category: 'strategy' },
  { id: 'decision-locking', name: 'Decision Locking', description: 'Finalise decisions to prevent drift', category: 'strategy' },
  { id: 'pre-mortem-facilitation', name: 'Pre-Mortem', description: 'Identify failure modes before they happen', category: 'strategy' },
  { id: 'strat-ops', name: 'Strategy Ops', description: 'Gap analysis, red-teaming, and decision routing', category: 'strategy' },

  // Content
  { id: 'authentic-writing', name: 'Authentic Writing', description: 'Anti-AI-fluff enforcement for external content', category: 'content' },
  { id: 'medium-article-writer', name: 'Article Writer', description: 'Technical article generation with consistent voice', category: 'content' },
  { id: 'pedagogical-patterns', name: 'Pedagogical Patterns', description: 'Educational content frameworks', category: 'content' },

  // Legal
  { id: 'legal-ops', name: 'Legal Ops', description: 'Dual-track legal workflows with jurisdiction awareness', category: 'legal' },
  { id: 'contract-formal', name: 'Contract Drafting', description: 'Senior attorney-level contract generation', category: 'legal' },
  { id: 'contract-simplification', name: 'Contract Simplification', description: 'Plain-language contract explanations', category: 'legal' },

  // Meta / RSI
  { id: 'recursive-learning', name: 'Recursive Learning', description: 'Learn from errors and generate preventive skills', category: 'meta' },
  { id: 'self-improvement-engine', name: 'Self-Improvement', description: '10-step improvement cycle automation', category: 'meta' },
  { id: 'autonomous-learning', name: 'Autonomous Learning', description: 'Dialectical reasoning for self-improvement', category: 'meta' },
  { id: 'genome-breeding', name: 'Genome Breeding', description: 'Evolutionary fitness tracking for GRIP components', category: 'meta' },
  { id: 'evo', name: 'Evo', description: 'Fractal facet evolution engine for friction analysis', category: 'meta' },

  // Team
  { id: 'pair-mode', name: 'Pair Mode', description: 'Local pair programming with Teams', category: 'team' },
  { id: 'sprint-loop', name: 'Sprint Loop', description: 'Autonomous sprint with guardrails', category: 'team' },
  { id: 'delegating-team-work', name: 'Delegating', description: 'Structured team delegation with capability matching', category: 'team' },

  // Infrastructure
  { id: 'context-refresh', name: 'Context Refresh', description: 'Rebuild mental model of any repository', category: 'infrastructure' },
  { id: 'backing-up-grip-infrastructure', name: 'Backup', description: 'Tiered GRIP backups with conflict handling', category: 'infrastructure' },
  { id: 'github-actions-setup', name: 'CI/CD Setup', description: 'GitHub Actions workflow configuration', category: 'infrastructure' },
  { id: 'node-cleanup', name: 'Node Cleanup', description: 'Terminate lingering Node.js processes', category: 'infrastructure' },
];

export function getSkillsByCategory(category: SkillCategory): GripSkill[] {
  return GRIP_SKILLS.filter(s => s.category === category);
}

export function getParamountSkills(): GripSkill[] {
  return GRIP_SKILLS.filter(s => s.paramount);
}

export function searchSkills(query: string): GripSkill[] {
  const lower = query.toLowerCase();
  return GRIP_SKILLS.filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.id.toLowerCase().includes(lower)
  );
}
