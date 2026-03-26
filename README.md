# GRIP Commander

![GRIP Commander](screenshots/background-2.png)

Cross-domain knowledge work engine. Deploy, monitor, and orchestrate AI agents from one interface.

**Electron 33 + Next.js 16 + React 19 + 7 MCP Servers**

[![Release](https://img.shields.io/github/v/release/CodeTonight-SA/GRIP-GUI?include_prereleases&label=release)](https://github.com/CodeTonight-SA/GRIP-GUI/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/CodeTonight-SA/GRIP-GUI/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeTonight-SA/GRIP-GUI/actions)

![GRIP Dashboard](screenshots/0.png)

---

## Table of Contents

- [Download](#download)
- [Why GRIP Commander](#why-grip-commander)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [MCP Servers](#mcp-servers)
- [Automations](#automations)
- [Remote Control](#remote-control)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Configuration](#configuration)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Download

| Platform | Architecture | Status | Link |
|----------|-------------|--------|------|
| macOS | ARM64 (Apple Silicon) | Alpha | [Download DMG](https://github.com/CodeTonight-SA/GRIP-GUI/releases/download/v0.1.0-alpha.1/GRIP-Commander-0.1.0-arm64.dmg) |
| macOS | Intel | Planned | — |
| Windows | x64 | Planned | — |
| Linux | x64 | Planned | — |

> **macOS Gatekeeper:** This alpha is unsigned. After installing, run:
> ```bash
> xattr -cr /Applications/GRIP\ Commander.app
> ```
> Or right-click the app, select Open, then click Open in the dialog.

---

## Why GRIP Commander

Claude Code runs one agent at a time, in one terminal. GRIP Commander removes that limitation:

- **Run 10+ agents simultaneously** across different projects and codebases
- **Automate agent workflows** — trigger agents on GitHub PRs, JIRA issues, and external events
- **Delegate and coordinate** — a Super Agent orchestrates other agents via MCP tools
- **Manage tasks visually** — Kanban board with automatic agent assignment
- **Schedule recurring work** — cron-based tasks that run autonomously
- **Control from anywhere** — Telegram and Slack integration for remote management
- **Learn and explore** — onboarding wizard, concept deep-dives, mode switching

---

## Architecture

### System Overview

![System Overview](docs/diagrams/system-overview.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
graph TB
    subgraph Electron["Electron App"]
        subgraph Renderer["React / Next.js (Renderer)"]
            Dashboard[Agent Dashboard]
            Kanban[Kanban Board]
            Automations[Automations]
            Scheduler[Scheduled Tasks]
            Usage[Usage Stats]
            Skills[Skills & Plugins]
            Settings[Settings]
            Learn[Learning Hub]
            Modes[Mode Switcher]
        end

        subgraph Main["Electron Main Process"]
            AgentMgr[Agent Manager<br/>node-pty, N parallel]
            PTY[PTY Manager<br/>terminal multiplexing]
            subgraph Services
                Telegram[Telegram Bot]
                Slack[Slack Bot]
                KanbanAuto[Kanban Automation]
                MCPLauncher[MCP Server Launcher]
                API[API Server]
            end
        end

        Renderer <-->|IPC| Main
    end

    subgraph MCP["MCP Servers (stdio)"]
        Orchestrator[mcp-orchestrator<br/>26+ tools]
        MCPTelegram[mcp-telegram<br/>4 tools]
        MCPKanban[mcp-kanban<br/>8 tools]
        MCPVault[mcp-vault<br/>10 tools]
        MCPSocial[mcp-socialdata<br/>5 tools]
        MCPX[mcp-x<br/>3 tools]
        MCPWorld[mcp-world<br/>5 tools]
    end

    Main <-->|stdio| MCP

    style Electron fill:#0a0a0a,stroke:#22d3ee,color:#fff
    style Renderer fill:#1a1a1a,stroke:#333,color:#fff
    style Main fill:#1a1a1a,stroke:#333,color:#fff
    style MCP fill:#0a0a0a,stroke:#22d3ee,color:#fff
```

</details>

### Agent Execution Flow

![Agent Execution Flow](docs/diagrams/agent-flow.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant IPC as Electron IPC
    participant AM as Agent Manager
    participant PTY as node-pty
    participant Claude as Claude Code CLI

    User->>UI: Create agent + assign task
    UI->>IPC: createAgent(project, skills)
    IPC->>AM: Spawn agent
    AM->>PTY: Allocate PTY session
    PTY->>Claude: Launch claude CLI
    Claude-->>PTY: Terminal output stream
    PTY-->>AM: Parse status (running/waiting/done)
    AM-->>IPC: Status update
    IPC-->>UI: Real-time output
    AM-->>Telegram: Notify on completion
    AM-->>Slack: Notify on completion
```

</details>

### Automation Pipeline

![Automation Pipeline](docs/diagrams/automation-pipeline.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
flowchart LR
    Cron[Cron Scheduler] --> Poll[Poll Source]
    Poll --> Filter[Filter & Dedup]
    Filter --> Spawn[Spawn Agent]
    Spawn --> Execute[Autonomous Execution]
    Execute --> Output[Deliver Output]
    Output --> Cleanup[Cleanup Agent]

    Poll -.-> GH[GitHub]
    Poll -.-> JIRA[JIRA]
    Output -.-> TG[Telegram]
    Output -.-> SL[Slack]
    Output -.-> GHC[GitHub Comment]
    Output -.-> JC[JIRA Comment]

    style Cron fill:#0891b2,stroke:#0891b2,color:#fff
    style Execute fill:#0891b2,stroke:#0891b2,color:#fff
```

</details>

---

## Core Features

### Parallel Agent Management

Run multiple Claude Code agents simultaneously, each in its own isolated PTY terminal session.

![Agents View](screenshots/agetns.png)

- Spawn unlimited concurrent agents across multiple projects
- Each agent runs in an isolated terminal with full PTY support
- Assign skills, model selection (sonnet, opus, haiku), and project context per agent
- Real-time terminal output streaming
- Agent lifecycle: `idle` → `running` → `completed` / `error` / `waiting`
- Git worktree support for branch-isolated development
- Persistent agent state across app restarts
- Autonomous execution mode for unattended operation

### Super Agent (Orchestrator)

A meta-agent that programmatically controls all other agents. Give it a high-level task and it delegates, monitors, and coordinates the work.

![Super Agent](screenshots/super-agent.png)

- Creates, starts, and stops agents via MCP tools
- Delegates tasks based on agent capabilities
- Monitors progress, captures output, handles errors
- Responds to Telegram and Slack messages for remote orchestration

### Kanban Task Management

Task board integrated with the agent system. Tasks flow through columns and can be automatically assigned to agents based on skill matching.

![Kanban Board](screenshots/kanban.png)

```
Backlog → Planned → Ongoing → Done
```

- Priority levels, progress tracking, labels
- Skill-based automatic agent assignment
- Self-managing task pipeline — add tasks, agents pick them up

### Learning Hub

Onboarding wizard and concept deep-dives for understanding the GRIP ecosystem.

- 5 core concepts with interactive walkthroughs
- Asymmetric 3+9 grid layout for concept deep-dives
- Mode switcher (31 operating modes, multi-select up to 3)

### Usage Tracking

Monitor Claude Code API usage across all agents — token consumption, cost tracking, activity patterns.

![Usage Stats](screenshots/stats.png)

### Skills & Plugin System

Extend agent capabilities with skills from [skills.sh](https://skills.sh).

![Skills Management](screenshots/skills.png)

- Code Intelligence: LSP plugins for TypeScript, Python, Rust, Go
- External Integrations: GitHub, GitLab, Jira, Figma, Slack, Vercel
- Install skills per-agent for specialised task handling

### Vault

Persistent document storage that agents can read, write, and search across sessions.

![Vault](screenshots/vault.png)

- Markdown documents with title, content, tags, file attachments
- Folder organisation with nested hierarchies
- Full-text search powered by SQLite FTS5
- Cross-agent access

---

## MCP Servers

GRIP Commander bundles **7 MCP servers** with **60+ tools** for programmatic agent control.

### mcp-orchestrator (26+ tools)

Agent management, messaging, scheduling, and automations.

<details>
<summary>Agent Management Tools</summary>

| Tool | Description |
|------|-------------|
| `list_agents` | List all agents with status |
| `get_agent` | Get detailed agent info |
| `get_agent_output` | Read agent terminal output |
| `create_agent` | Create a new agent |
| `start_agent` | Start agent with a task |
| `send_message` | Send input to running agent |
| `stop_agent` | Terminate a running agent |
| `remove_agent` | Permanently delete agent |
| `wait_for_agent` | Poll until completion |

</details>

<details>
<summary>Scheduler & Automation Tools</summary>

| Tool | Description |
|------|-------------|
| `list_scheduled_tasks` | List recurring tasks |
| `create_scheduled_task` | Create recurring task (cron) |
| `delete_scheduled_task` | Remove scheduled task |
| `run_scheduled_task` | Execute immediately |
| `list_automations` | List all automations |
| `create_automation` | Create automation pipeline |
| `run_automation` | Trigger immediately |
| `pause_automation` / `resume_automation` | Control automation state |
| `send_telegram` / `send_slack` | Send messages |

</details>

### mcp-telegram (4 tools)

Telegram messaging with media support: text, photos, videos, documents.

### mcp-kanban (8 tools)

Programmatic Kanban task management: create, move, assign, complete tasks.

### mcp-vault (10 tools)

Document management: create, update, search, attach files, folder organisation.

### mcp-socialdata (5 tools)

Twitter/X data via [SocialData API](https://socialdata.tools): search tweets, user profiles, engagement metrics.

### mcp-x (3 tools)

Twitter/X posting: create tweets, reply, delete.

### mcp-world (5 tools)

Generative game worlds: create zones, manage NPCs, update signs, list sprites.

---

## Automations

Poll external sources, detect new items, spawn Claude agents to process each item autonomously.

| Source | Status |
|--------|--------|
| GitHub | Active (PRs, issues, releases via `gh` CLI) |
| JIRA | Active (REST API v3) |
| Pipedrive | Planned |
| Twitter | Planned |
| RSS | Planned |

### Pipeline

```mermaid
flowchart TD
    A[Cron Trigger] --> B[Poll Source]
    B --> C{New/Updated?}
    C -->|Yes| D[Dedup Check]
    C -->|No| Z[Sleep]
    D --> E[Spawn Temp Agent]
    E --> F[Inject Template Variables]
    F --> G[Autonomous Execution]
    G --> H[Deliver Output]
    H --> I[Cleanup Agent]
    I --> Z

    style A fill:#0891b2,color:#fff
    style G fill:#0891b2,color:#fff
```

### Template Variables

Use `{{variable}}` syntax in agent prompts:

**GitHub:** `{{title}}`, `{{url}}`, `{{author}}`, `{{body}}`, `{{labels}}`, `{{repo}}`, `{{number}}`, `{{type}}`

**JIRA:** `{{key}}`, `{{summary}}`, `{{status}}`, `{{issueType}}`, `{{priority}}`, `{{assignee}}`, `{{reporter}}`, `{{url}}`, `{{body}}`

---

## Remote Control

### Telegram

Control your agent fleet from Telegram. Send `/status`, `/agents`, `/start_agent <name> <task>`, `/stop_agent <name>`, `/ask <message>`, or any free-form message to the Super Agent.

**Setup:** Create a bot via [@BotFather](https://t.me/botfather), paste the token in Settings, send `/start` to register.

### Slack

Same capabilities via @mentions or DMs. Socket Mode (no public URL needed).

**Setup:** Create app at [api.slack.com/apps](https://api.slack.com/apps), enable Socket Mode, add OAuth scopes (`app_mentions:read`, `chat:write`, `im:history`, `im:read`, `im:write`), subscribe to events (`app_mention`, `message.im`).

---

## Installation

### Download (Recommended)

Download the [latest release](https://github.com/CodeTonight-SA/GRIP-GUI/releases) and install.

> **macOS Gatekeeper:** `xattr -cr /Applications/GRIP\ Commander.app`

### Prerequisites (Build from Source)

- Node.js 18+
- Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
- GitHub CLI (`gh`) for automations

### Build from Source

```bash
git clone https://github.com/CodeTonight-SA/GRIP-GUI.git
cd GRIP-GUI
npm install
npx @electron/rebuild
npm run electron:dev          # Development mode
npm run electron:build        # Production build (signed DMG)
npm run commander:dmg         # Unsigned DMG (alpha)
npm run commander:pack        # Unsigned .app directory
```

### Web Browser (No Electron)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Agent management requires the Electron app.

---

## Project Structure

```
grip-gui/
├── src/                           # Next.js frontend
│   ├── app/                       # App Router pages
│   │   ├── page.tsx               # Engine (chat interface)
│   │   ├── agents/                # Agent management
│   │   ├── kanban/                # Kanban board
│   │   ├── automations/           # Automation management
│   │   ├── recurring-tasks/       # Scheduled tasks
│   │   ├── modes/                 # Mode switcher (31 modes)
│   │   ├── learn/                 # Learning hub + onboarding
│   │   ├── vault/                 # Document management
│   │   ├── skills/                # Skills marketplace
│   │   ├── usage/                 # Usage statistics
│   │   ├── settings/              # Configuration
│   │   └── api/                   # Backend API routes
│   ├── components/                # React components
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Data definitions
│   └── store/                     # Zustand state management
├── electron/                      # Electron main process
│   ├── main.ts                    # Entry point
│   ├── preload.ts                 # IPC bridge
│   ├── core/                      # Agent, PTY, window managers
│   ├── services/                  # Telegram, Slack, API, MCP
│   └── handlers/                  # IPC handlers
├── mcp-orchestrator/              # Orchestration server (26+ tools)
├── mcp-telegram/                  # Telegram media server (4 tools)
├── mcp-kanban/                    # Kanban server (8 tools)
├── mcp-vault/                     # Vault server (10 tools)
├── mcp-socialdata/                # Twitter/X data server (5 tools)
├── mcp-x/                         # Twitter/X posting server (3 tools)
└── mcp-world/                     # Generative worlds server (5 tools)
```

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| Frontend | React | 19 |
| Desktop | Electron | 33 |
| Styling | Tailwind CSS | 4 |
| State | Zustand | 5 |
| Animations | Framer Motion | 12 |
| Terminal | xterm.js + node-pty | 5 / 1.1 |
| Database | better-sqlite3 | 11 |
| MCP | @modelcontextprotocol/sdk | 1.0 |
| Language | TypeScript | 5 |

---

## Configuration

### Settings Files

| File | Purpose |
|------|---------|
| `~/.grip/app-settings.json` | App settings (tokens, preferences) |
| `~/.grip/agents.json` | Persisted agent state |
| `~/.grip/kanban-tasks.json` | Kanban board tasks |
| `~/.grip/automations.json` | Automation definitions |
| `~/.grip/vault.db` | Vault documents (SQLite) |
| `~/.claude/settings.json` | Claude Code settings |
| `~/.claude/schedules.json` | Scheduled task definitions |

---

## Development

```bash
npm run dev              # Next.js dev server
npm run electron:dev     # Electron + Next.js dev mode
npm run build            # Production build
npm run electron:build   # Distributable (signed DMG)
npm run commander:dmg    # Unsigned DMG (alpha distribution)
npm run commander:pack   # Unsigned .app (development)
npm run test             # Run tests (vitest)
npm run lint             # ESLint
```

---

## Contributing

Contributions are welcome. Please submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [Anthropic](https://anthropic.com) for Claude Code
- [skills.sh](https://skills.sh) for the skills ecosystem
- Built with [GRIP](https://grip-preview.vercel.app) — the AI operating system
