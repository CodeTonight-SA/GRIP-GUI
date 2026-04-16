# GRIP Commander

Cross-domain knowledge work commander GUI built on Next.js 16 + React 19 + Electron 33.

## Design System

GRIP-Adapted Swiss Nihilism:
- **Background**: Paper-grey `#EAEAEA` (light) / `#0a0a0a` (dark)
- **Accent**: Cyan `#0891b2` (light) / `#22d3ee` (dark)
- **Typography**: System fonts (ui-sans-serif, ui-monospace)
- **Corners**: Sharp (0px border-radius)
- **Shadows**: None (border-defined)
- **Labels**: `font-mono text-xs uppercase tracking-widest`

## Architecture

- `src/app/` — Next.js App Router pages
- `src/components/` — React components (Engine, Sidebar, CommandPalette, etc.)
- `src/lib/` — Data definitions (grip-modes.ts, grip-skills.ts, grip-concepts.ts)
- `src/lib/terminal/` — Terminal constants and themes
- `src/store/` — Zustand state management
- `src/hooks/` — Custom React hooks
- `electron/` — Electron main process (agents, PTY, services)
- `mcp-*/` — MCP servers (orchestrator, kanban, vault, telegram, socialdata)

## Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Engine — Chat interface with context panel |
| `/modes` | Mode switcher (30 modes, multi-select max 3) |
| `/learn` | Understanding GRIP hub (5 core concepts) |
| `/learn/walkthrough` | Onboarding wizard |
| `/learn/concepts` | Concept deep-dives (asymmetric 3+9 layout) |

## Memory

Use auto memory (`~/.claude/projects/.../memory/`) actively on this project.

## Commands

```bash
npm run dev              # Next.js dev server
npm run electron:dev     # Electron + Next.js dev mode
npm run build            # Production build
npm run electron:build   # Distributable Electron app
```
