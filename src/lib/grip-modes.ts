export interface GripMode {
  id: string;
  name: string;
  description: string;
  category: ModeCategory;
  skills: string[];
  tokenBudget: number;
}

export type ModeCategory =
  | 'development'
  | 'strategy'
  | 'content'
  | 'research'
  | 'operations'
  | 'meta';

export const MODE_CATEGORIES: Record<ModeCategory, { label: string; description: string }> = {
  development: { label: 'DEVELOPMENT', description: 'Build, review, test, and architect software' },
  strategy: { label: 'STRATEGY', description: 'Plan, decide, and lead with structured thinking' },
  content: { label: 'CONTENT', description: 'Write, teach, market, and communicate' },
  research: { label: 'RESEARCH', description: 'Investigate, analyse, and synthesise knowledge' },
  operations: { label: 'OPERATIONS', description: 'Automate, secure, plan, and manage' },
  meta: { label: 'META', description: 'Learn, create, and improve GRIP itself' },
};

export const GRIP_MODES: GripMode[] = [
  // Development
  { id: 'code', name: 'CODE', description: 'Software development with design principles and verification gates', category: 'development', skills: ['feature-complete', 'design-principles', 'code-agentic'], tokenBudget: 6000 },
  { id: 'architect', name: 'ARCHITECT', description: 'System design through SOLID, GRASP, and ADR frameworks', category: 'development', skills: ['design-principles', 'adr-generation', 'system-diagramming'], tokenBudget: 4000 },
  { id: 'review', name: 'REVIEW', description: 'Unified review across code, content, documents, and designs', category: 'development', skills: ['reviewing-contributions', 'design-principles'], tokenBudget: 3500 },
  { id: 'testing', name: 'TESTING', description: 'QA lifecycle with human-in-the-loop gates and Devil\'s Advocate', category: 'development', skills: ['testing-qa-lifecycle', 'e2e-test-generation'], tokenBudget: 3000 },

  // Strategy
  { id: 'strategy', name: 'STRATEGY', description: 'Strategic assessment through gap analysis and decision locking', category: 'strategy', skills: ['strat-ops', 'leading-organisation', 'red-teaming-strategic-decisions'], tokenBudget: 3500 },
  { id: 'business', name: 'BUSINESS', description: 'Founder decisions through strategy, team, and financial frameworks', category: 'strategy', skills: ['leading-organisation', 'decision-locking'], tokenBudget: 2500 },
  { id: 'decision', name: 'DECISION', description: 'Structured decisions through bias-aware analysis with cognitive checks', category: 'strategy', skills: ['decision-locking', 'red-teaming-strategic-decisions'], tokenBudget: 3000 },
  { id: 'brainstorm', name: 'BRAINSTORM', description: 'Ideation through divergent thinking with suspended criticism', category: 'strategy', skills: ['reasoning-with-ai'], tokenBudget: 2500 },

  // Content
  { id: 'writing', name: 'WRITING', description: 'Long-form writing through voice-consistent editing protocols', category: 'content', skills: ['authentic-writing', 'medium-article-writer'], tokenBudget: 3000 },
  { id: 'marketing', name: 'MARKETING', description: 'Content across formats with anti-fluff enforcement', category: 'content', skills: ['authentic-writing', 'medium-article-writer'], tokenBudget: 2500 },
  { id: 'teaching', name: 'TEACHING', description: 'Educational content through pedagogical frameworks', category: 'content', skills: ['pedagogical-patterns', 'curriculum-design'], tokenBudget: 2500 },
  { id: 'learning', name: 'LEARNING', description: 'Personal learning pathway design with spaced repetition', category: 'content', skills: ['pedagogical-patterns'], tokenBudget: 3500 },
  { id: 'triad-teaching', name: 'TRIAD TEACHING', description: 'Multi-voice teaching through Explainer, Contextualizer, and Challenger synthesis', category: 'content', skills: ['pedagogical-patterns', 'curriculum-design', 'research-synthesis'], tokenBudget: 4000 },

  // Research
  { id: 'research', name: 'RESEARCH', description: 'Systematic research through PICO and CRAAP evidence frameworks', category: 'research', skills: ['research-synthesis', 'evidence-evaluation', 'hypothesis-validation'], tokenBudget: 3000 },
  { id: 'analysis', name: 'ANALYSIS', description: 'Structured analysis through RIPER phases', category: 'research', skills: ['riper-workflow'], tokenBudget: 3000 },
  { id: 'synthesis', name: 'SYNTHESIS', description: 'Knowledge synthesis through cross-domain integration', category: 'research', skills: ['research-synthesis'], tokenBudget: 3500 },

  // Operations
  { id: 'planning', name: 'PLANNING', description: 'Daily planning through prioritisation hierarchy', category: 'operations', skills: ['daily-planning', 'preplan-driven-development'], tokenBudget: 2500 },
  { id: 'automation', name: 'AUTOMATION', description: 'Workflow automation through safety guardrails', category: 'operations', skills: ['safety-guardrails', 'code-agentic'], tokenBudget: 3000 },
  { id: 'security', name: 'SECURITY', description: 'Security auditing through STRIDE, OWASP, and DREAD', category: 'operations', skills: ['vulnerability-detection', 'threat-modeling', 'secure-code-review'], tokenBudget: 4000 },
  { id: 'legal', name: 'LEGAL', description: 'Legal-ops workflows with jurisdiction awareness', category: 'operations', skills: ['legal-ops', 'contract-formal'], tokenBudget: 2500 },

  // Meta
  { id: 'upskilling', name: 'UPSKILLING', description: 'Meta-skill creation through recursive learning', category: 'meta', skills: ['creating-skills', 'skill-creation-best-practices'], tokenBudget: 1500 },
  { id: 'create', name: 'CREATE', description: 'Guided mode and skill creation with quality gates', category: 'meta', skills: ['creating-skills', 'creating-wizards'], tokenBudget: 2000 },
  { id: 'rsi', name: 'RSI', description: 'Recursive self-improvement sprints with convergence tracking', category: 'meta', skills: ['recursive-learning', 'self-improvement-engine', 'autonomous-learning'], tokenBudget: 5500 },
  { id: 'incognito', name: 'INCOGNITO', description: 'Private mode with no persistence and minimal logging', category: 'meta', skills: ['concise-communication'], tokenBudget: 1000 },
];

export function getModesByCategory(category: ModeCategory): GripMode[] {
  return GRIP_MODES.filter(m => m.category === category);
}

export function getModeById(id: string): GripMode | undefined {
  return GRIP_MODES.find(m => m.id === id);
}
