# GRIP Commander — GUILD Live Demo Script

## Pre-Demo Checklist

- [ ] `npm run electron:dev` running and responsive
- [ ] Dark mode ON (Swiss Nihilism looks best in dark)
- [ ] Screen sharing set up (full screen, no notifications)
- [ ] Terminal font size increased for visibility
- [ ] Close unrelated apps (clean desktop)

## Demo Flow (15-20 minutes)

### Act 1: First Impression (2 min)

1. **Launch GRIP Commander** — let the audience see the cold start
   - Sidebar nav items stagger in (subtle entrance animation)
   - Status bar at bottom shows GATES ACTIVE + GRIP pulse
   - Point out: "This is a knowledge work engine, not just a chat wrapper"

2. **Quick orientation** — hover over sidebar items
   - ENGINE, AGENTS, TASKS, VAULT, SKILLS, MODES, AUTOMATIONS, SCHEDULED, USAGE, MEMORY
   - "Every section maps to a real capability, not a placeholder"

### Act 2: The Engine — Chat Interface (5 min)

3. **Start a new chat** — type a real task:
   ```
   Review this repository for security vulnerabilities and suggest fixes
   ```
   - Watch the thinking indicator appear
   - Messages slide in with animation
   - Tool use blocks appear colour-coded (cyan=file, blue=search, amber=execute)
   - Gate indicators show safety gates firing

4. **Show the status bar** — point out live metrics:
   - Model indicator (SONNET/OPUS)
   - Streaming pulse animation
   - Response duration after completion
   - Turn counter
   - Context percentage bar

5. **Command palette** — press `Cmd+K`:
   - Show recently-used commands at the top
   - Type "mode" to filter modes
   - Type "vault" to navigate
   - "This is your fast-access command centre"

### Act 3: Modes (3 min)

6. **Navigate to /modes** — cards scale in with stagger animation
   - Show 23 modes across 6 categories
   - Click to activate CODE mode — cyan border + checkmark
   - Activate up to 3 simultaneously
   - "Modes change how GRIP thinks. CODE adds design principles. SECURITY adds STRIDE/OWASP."

7. **Category filtering** — click through categories:
   - DEVELOPMENT, STRATEGY, CONTENT, RESEARCH, OPERATIONS, META
   - "Each mode has a token budget — GRIP allocates resources intelligently"

### Act 4: Agents (3 min)

8. **Navigate to /agents** — show the agent pool
   - Explain: each agent is an independent Claude Code process
   - Show agent terminals (if any are running)
   - "Agents can work in parallel on different tasks"

9. **Show Super Agent** (if configured):
   - Demonstrate sending a message
   - Show tool execution in real-time
   - "This is Claude Code with a GUI — full terminal power, visual interface"

### Act 5: Vault + Skills (2 min)

10. **Vault** — document storage with full-text search
    - Show any stored documents
    - Demonstrate search functionality
    - "Your knowledge base, searchable and organised"

11. **Skills browser** — show the 149+ skills
    - Filter by category
    - Show skill details
    - "Each skill is a specialised protocol GRIP loads on demand"

### Act 6: The WOW Moment (2 min)

12. **Vortex** — triple-click the GRIP logo (or Konami code)
    - 3D double helix visualisation appears
    - "This is the knowledge vortex — a visual representation of GRIP's architecture"
    - Let it spin for dramatic effect

13. **Learn hub** — navigate to /learn
    - Show the 5 core concepts
    - "GRIP is self-documenting — it teaches you how to use it"

### Act 7: Close (2 min)

14. **Page transitions** — navigate between pages
    - Smooth opacity fades between routes
    - "Every interaction is designed for clarity and speed"

15. **Key takeaways**:
    - "GRIP Commander is Claude Code with a knowledge work engine GUI"
    - "23 modes, 149 skills, multi-agent orchestration, safety gates"
    - "Swiss Nihilism design — intentional, minimal, precise"
    - "Open source, self-improving, built for professionals"

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App won't start | `npm run electron:dev` — check console |
| Chat not responding | Check Claude Code CLI is installed (`which claude`) |
| Blank screen | Clear cache: `rm -rf .next && npm run dev` |
| Status bar missing | Scroll down or check if engine page is active |

## Key Shortcuts to Remember

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `1-9` | Navigate sidebar items |
| `?` | Open Learn hub |
| `Cmd+N` | New chat |
| Triple-click logo | Vortex easter egg |
| Konami code | Also Vortex |
