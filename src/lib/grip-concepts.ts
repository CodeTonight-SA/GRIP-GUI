export interface GripConcept {
  id: string;
  number: string;
  title: string;
  tagline: string;
  description: string;
  metaphor: string;
  details: string[];
  tryItPrompt: string;
  link: string;
}

export const GRIP_CONCEPTS: GripConcept[] = [
  {
    id: 'modes',
    number: '01',
    title: 'MODES',
    tagline: 'Like changing gears',
    description: 'GRIP adjusts its thinking style to match your task. Code mode thinks like an engineer. Strategy mode thinks like a CEO. Legal mode thinks like a solicitor.',
    metaphor: 'Think of modes as lenses. Each one focuses GRIP on a different domain, loading the right skills and knowledge for the job.',
    details: [
      '30 modes covering development, strategy, content, research, operations, and meta-learning',
      'Select up to 3 modes simultaneously for complex cross-domain work',
      'GRIP can auto-detect the right mode from your conversation',
    ],
    tryItPrompt: 'Help me review this code for security vulnerabilities',
    link: '/modes',
  },
  {
    id: 'skills',
    number: '02',
    title: 'SKILLS',
    tagline: 'Calling in the expert',
    description: 'Skills are specialised abilities GRIP can activate. Like calling an expert consultant, each skill brings deep knowledge in a specific area.',
    metaphor: 'If modes are the lens, skills are the tools. A photographer (mode) selects the right filter (skill) for each shot.',
    details: [
      '149 skills covering code, design, research, legal, security, and more',
      '5 PARAMOUNT skills are always active — they enforce safety and quality',
      'Skills can be combined: code + security gives you secure development',
    ],
    tryItPrompt: 'Run a threat model analysis on my authentication system',
    link: '/skills',
  },
  {
    id: 'agents',
    number: '03',
    title: 'AGENTS',
    tagline: 'Parallel thinking',
    description: 'Agents are parallel workers that handle multiple tasks simultaneously. Delegate work across different projects and let GRIP coordinate everything.',
    metaphor: 'Like a team of specialists working in parallel. Each agent has their own workspace, skills, and context — but they can share knowledge.',
    details: [
      'Run 10+ agents simultaneously across different projects',
      'Each agent has its own terminal, skills, and model selection',
      'A Super Agent can orchestrate other agents for complex multi-step work',
    ],
    tryItPrompt: 'Create an agent to review PRs while I work on a new feature',
    link: '/agents',
  },
  {
    id: 'safety',
    number: '04',
    title: 'SAFETY',
    tagline: 'Mechanical guardrails',
    description: 'Safety gates prevent mistakes before they happen. These are not suggestions — they are mechanical constraints that cannot be overridden, even by GRIP itself.',
    metaphor: 'Like a circuit breaker in your home. It does not ask permission to trip — it activates the moment conditions are unsafe.',
    details: [
      'Confidence gate: GRIP halts and asks when certainty drops below 99.9999999%',
      'Context gate: GRIP stops at 85% context usage to prevent memory overflow',
      'Safety gates are enforced by code, not by values — they cannot be argued around',
    ],
    tryItPrompt: 'Show me how GRIP handles uncertainty in decision-making',
    link: '/learn/concepts',
  },
  {
    id: 'convergence',
    number: '05',
    title: 'CONVERGENCE',
    tagline: 'Beyond good enough',
    description: 'Convergence is GRIP\'s process of iterating toward the best possible answer. It does not stop at the first working solution — it refines until the result meets a defined criterion.',
    metaphor: 'Like focusing a camera. The first attempt might be close, but convergence keeps adjusting until the image is sharp.',
    details: [
      'Each iteration produces a measurable improvement',
      'A criterion defines when convergence is complete — not arbitrary stopping',
      'GRIP learns from each convergence run to improve future performance',
    ],
    tryItPrompt: 'Converge on the best architecture for a real-time chat system',
    link: '/learn/concepts',
  },
];
