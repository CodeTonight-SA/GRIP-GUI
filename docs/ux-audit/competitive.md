# GRIP Commander — Competitive UX Audit (W2)

**Purpose.** Extract specific, stealable delight patterns from 10 best-in-class tools that occupy the adjacent niches to GRIP Commander (AI-assisted coding, terminal UX, command palettes, knowledge canvases, modal TUI). Each pattern is evaluated for concrete transferability to the Commander Electron + Next.js shell.

**Scope note.** GRIP Commander today is a utilitarian "Claude Code in a window" — tabbed sessions, a prompt box, a transcript pane, and a collapsible sidebar for orchestration controls. The v0.4.3 surface trades delight for honesty. This audit finds the ceiling.

**Bias.** Patterns that are 2025-2026 additions and documented in public changelogs are preferred over folklore. Where a feature is observed directly in product use, that is stated.

---

## 1. Claude Code CLI (Anthropic)

**One-line pitch.** Anthropic's first-party terminal agent — a REPL-shaped CLI that orchestrates file reads, edits, shell, and subagents from inside any shell session.

### Delight pattern 1: Output Styles (frontmatter-driven response modes)
- What it does. A user or plugin ships a markdown file with YAML frontmatter (`name`, `description`, optional `keep-coding-instructions`) under `~/.claude/output-styles/`. The model rewrites every response through that style — "Explanatory" adds teaching commentary; "Learning" quizzes the user; custom styles can enforce specific formatting (bullet length, code-fence rules, preamble bans). Styles are hot-swappable via `/output-style` with no session restart.
- Why it's delightful. It decouples *what the agent does* from *how it speaks*, so the same agent can be a patient tutor for onboarding and a terse executor for sprint work without re-onboarding. The keep-coding-instructions flag means style changes do not erode engineering guardrails.
- Source: https://code.claude.com/docs/en/changelog and https://claudefa.st/blog/guide/changelog (output-styles un-deprecated, plugin-shareable, 2026).
- Transferable to GRIP Commander? **Yes.** Commander already multiplexes agents; output-style selector as a per-tab dropdown (or slash-palette entry) adds almost zero backend work because the orchestrated Claude Code already understands the flag. High leverage for demo/user segmentation.

### Delight pattern 2: `/statusline` custom status line with refreshInterval
- What it does. `/statusline` command reads the user's `.bashrc`/`.zshrc` and generates a shell snippet that is piped through on every prompt turn, rendering model, cwd, remaining context tokens, session cost, git branch, or anything arbitrary. A `refreshInterval` setting re-executes the snippet every N seconds for live counters.
- Why it's delightful. Gives the operator a glanceable HUD without an always-on sidebar. Personalised per-repo by leaning on shell rc files the user already curated. Re-uses the cost/context telemetry Claude Code already emits.
- Source: https://code.claude.com/docs/en/changelog (statusline + refreshInterval, 2025-2026).
- Transferable to GRIP Commander? **Yes.** Commander has more screen real estate than a TUI — the status line maps naturally to a persistent bottom bar. Key win: let users drop a script into settings and see output live without restarting the session. Cost telemetry already surfaces from child processes.

### Delight pattern 3: `/recap` contextual session summary on return
- What it does. When the user reconnects to a paused/resumed session, a recap block summarises what the agent did last, what's pending, and any interrupted tool calls. Configurable in `/config`; manually re-invokable with `/recap`. Coupled with Claudio, which adds OS-native sounds for state transitions (tool-call complete, agent-waiting, error).
- Why it's delightful. Fights amnesia after coffee breaks and fragmented schedules. Sound design is rare in dev tools — most devs hate chimes, but opt-in mellow tones for "idle → waiting on you" state changes are genuinely loved (see "sparks joy" quote in release notes).
- Source: https://code.claude.com/docs/en/changelog and referenced in awesome-claude-code (https://github.com/hesreallyhim/awesome-claude-code).
- Transferable to GRIP Commander? **Yes, high value.** Commander sessions often span hours — a resumed-tab recap card is a natural desktop-app affordance. Subtle audio for "agent is idle and waiting for you" addresses the #1 friction in multi-tab agent orchestration: forgetting a tab is blocked on input.

---

## 2. Cursor (Anysphere)

**One-line pitch.** The AI-native fork of VS Code — an editor where chat, tab completion, and diff-apply are the primary UX, not bolted-on.

### Delight pattern 1: Parallel Agents with automatic winner selection
- What it does. Cursor 2.0 runs up to 8 agents on the same prompt, each in its own git worktree (or remote machine), preventing file conflicts. On completion, Cursor evaluates all runs and recommends the best solution, with a comment on the selected agent explaining *why* it was picked. User can still switch to a losing branch with one click.
- Why it's delightful. Removes the cognitive cost of "which model should I pick" by running them all and letting the output decide. Worktree isolation means the user never sees a merge conflict between sibling agents. The explanation-of-pick is a trust primitive — users accept or reject the pick with context.
- Source: https://cursor.com/changelog/2-0 (Cursor 2.0, Oct 2025) and https://cursor.com/changelog/2-2 (multi-agent judging).
- Transferable to GRIP Commander? **Yes — this is the biggest leverage pattern.** Commander already orchestrates multiple CC instances. Formalising "parallel agents with judged winner" turns the existing session multiplexer into a differentiator. Worktree isolation already lives in GRIP (Rule 13, grip-worktree.sh).

### Delight pattern 2: Plan Mode in Background (plan model + build model split)
- What it does. Cursor 2.2 lets the user draft a plan with one model while a different model executes the plan in the background. Plan can be foreground (user iterates on it), background (model refines while user codes), or spawned as *parallel plan agents* for multiple plan drafts to compare.
- Why it's delightful. Makes the plan/execute split a first-class flow rather than a prompt convention. "Plan with Opus, build with Haiku" becomes a dropdown, not a 30-line system prompt.
- Source: https://cursor.com/changelog/2-2 (Plan Mode, Debug Mode, Multi-Agent Judging).
- Transferable to GRIP Commander? **Yes.** Commander's mode system (/mode, presets) already has the abstraction. Adding a "planner model" and "builder model" split in the session-start wizard directly productises GRIP's existing preplan-driven-development skill.

### Delight pattern 3: Visual multi-file diff-apply with single-button accept
- What it does. Every code block in chat has an Apply button that infers the target file from conversational context and inserts the code as a reviewable diff — not a text replace. Multi-file edits render as a unified diff overlay; users accept/reject per-hunk with keyboard shortcuts, and rejected hunks feed back into the agent as "what not to do."
- Why it's delightful. Collapses the "copy-paste-from-chat" ritual. The per-hunk reject-with-feedback loop is the closest thing AI coding has to a proper review UX.
- Source: https://cursor.com/changelog (multi-file diff-apply), observed directly.
- Transferable to GRIP Commander? **Partial.** Commander does not own the editor, so the diff-apply surface is outside its remit. BUT a read-only "proposed changes" panel that renders the agent's pending file writes before Claude Code executes them is a direct steal — and it gives Commander a unique affordance: approve/reject edits *before* the subagent ships them.

---

## 3. Warp (warp.dev)

**One-line pitch.** A terminal rebuilt around "blocks" (command + output as a first-class unit) with AI search, shareable workflows, and a team knowledge layer (Warp Drive).

### Delight pattern 1: Blocks — every command is a navigable, shareable object
- What it does. Instead of a scrolling text river, Warp renders each command + output as a discrete block with metadata (exit code, duration, host, cwd, timestamp). Blocks are selectable, copyable-as-markdown, shareable via permalink, and searchable. You can bookmark a block, filter the session by block type, or jump between failed blocks with a hotkey.
- Why it's delightful. Terminals have shipped as text streams since 1970. Blocks make scrollback *structured data* — you can say "show me every failed command in this session" and the terminal answers.
- Source: https://www.warp.dev/all-features and https://docs.warp.dev/changelog.
- Transferable to GRIP Commander? **Yes — this is the single highest-leverage steal for Commander.** The transcript pane is already a block-like structure (user turn → tool calls → agent reply). Treating each turn as a first-class block with permalink, filter, and export makes the transcript feel like Warp instead of a chat log. Also unlocks "share failed turn with teammate" as a one-click action.

### Delight pattern 2: Warp Drive — parameterised Prompts, Workflows, Notebooks
- What it does. Warp Drive is a team-shared vault of (a) Workflows — named CLI snippets with `{{placeholder}}` parameters that prompt the user at run time; (b) Notebooks — interactive markdown + command blocks that sync across teammates; (c) Prompts — reusable Agent Mode prompts with parameters; (d) Rules — convention files the agent respects. All four are first-class, searchable, and injectable from the command bar with `drive:`.
- Why it's delightful. The unit of sharing is no longer a Slack message with backticks. The notebook format collapses runbook + terminal into one artefact that *executes*.
- Source: https://docs.warp.dev/knowledge-and-collaboration/warp-drive/notebooks, https://www.warp.dev/drive.
- Transferable to GRIP Commander? **Yes.** Commander's existing `skills/` and `playbooks/` directories are the substrate. Exposing them as a searchable "Commander Drive" palette with parameterised invocation is a direct win. Notebook format (prose + live command) is a better presentation for GRIP's `plans/*.md` than a plain markdown reader.

### Delight pattern 3: AI Command Search across app surface
- What it does. One input (Cmd+P) fuzzy-matches across shell command history, 400+ CLI tool suggestions (with argument hints), keyboard shortcuts, app settings, and navigation. AI infers intent — typing "what did I run yesterday that failed" returns historic failed blocks.
- Why it's delightful. Discoverability collapses into a single affordance. No hunting through menus.
- Source: https://www.warp.dev/all-features.
- Transferable to GRIP Commander? **Yes.** Commander already has a command palette in design. Making it cover (a) GRIP skills, (b) slash commands, (c) CC settings, (d) session history turns with AI intent matching is the right ceiling.

---

## 4. Zed (zed.dev)

**One-line pitch.** GPU-rendered collaborative editor with a deeply-integrated agent panel and proportional/monospace typography mixed in the UI chrome.

### Delight pattern 1: Multibuffer review for agent-generated edits
- What it does. When the agent proposes changes across 7 files, Zed opens a single multibuffer — a virtual editor that splices the changed regions from each file into one scrollable document with collapsible per-file headers. The user edits in-place (full LSP, cursors, selections); on save, changes propagate back to the underlying files.
- Why it's delightful. Review feels like editing one long document rather than alt-tabbing between 7 diffs. Cursors and LSP work as normal — so you can jump to definition across the multibuffer.
- Source: https://zed.dev/2025 (2025 Recap: multibuffer review, agent following), https://zed.dev/docs/ai/agent-panel.
- Transferable to GRIP Commander? **Yes, with caveat.** Commander does not own editing, but a "multibuffer-style" review panel for pending file edits (flat scrollable list of hunks, each with a file header + accept/reject) is directly adaptable and would be a signature affordance.

### Delight pattern 2: Agent Following ("watch the agent work")
- What it does. When the agent edits files, the editor viewport *follows* the agent — scrolls to the file being edited, highlights the region being changed, shows the agent's cursor and selection. User can toggle off at any time; user's own navigation preempts the follow.
- Why it's delightful. Turns agent execution from a black box into a visible performance. Dramatically reduces "what just happened" anxiety on long-running tasks.
- Source: https://zed.dev/2025, https://zed.dev/docs/ai/agent-panel.
- Transferable to GRIP Commander? **Yes.** Commander could mirror this by (a) auto-scrolling the transcript to the active tool call, (b) surfacing the file the agent is editing in a side peek, (c) showing a live cursor/selection badge when tool calls are in flight. Directly attacks the "is it still working" confusion in long sessions.

### Delight pattern 3: Rules Library with per-project `.rules` files
- What it does. Rules (formerly "prompts") are markdown files in a library. Rules can nest other rules. A per-project `.rules` file at the work tree root is auto-included in agent context. Rules are invoked with `@rule <name>` from the agent panel; files with `@file`. The Text Threads panel (cmd-shift-h) shows all historical conversations; cmd-shift-j opens a dropdown of the 6 most-recently-updated threads.
- Why it's delightful. The thread-history affordance is underrated — most AI panels bury past chats. The recently-updated-6 dropdown is the right shape: it maps to human short-term memory, not an infinite list.
- Source: https://zed.dev/docs/ai/agent-panel, https://zed.dev/docs/ai/text-threads.
- Transferable to GRIP Commander? **Yes.** Commander's session-history UX today is weak. Stealing "6 most-recently-updated threads in a dropdown" + cmd-shift-j hotkey is a one-afternoon implementation with large ergonomic win.

---

## 5. Raycast (raycast.com)

**One-line pitch.** The command-palette-as-operating-system. Spotlight replacement with 1500+ open-source extensions and a TypeScript extension API.

### Delight pattern 1: AI Commands — parameterised reusable prompts
- What it does. User defines an "AI Command" with a name, model, icon, specific system prompt, and input source (clipboard / selection / no-view). Example: "Review PR" takes clipboard diff and outputs a structured review. Commands are invocable from root search, bindable to hotkeys, exportable as YAML. They support `{argument}` placeholders so one command serves a class of prompts.
- Why it's delightful. Promotes prompt templates from "thing I paste into a chat" to first-class, icon-branded, keyboard-bound tools. Each command is a tiny app.
- Source: https://manual.raycast.com/ and https://developers.raycast.com/misc/changelog.
- Transferable to GRIP Commander? **Yes.** Commander's `skills/` already have this shape but without the icon/hotkey/clipboard-input surface. Exposing a "New AI Command" wizard that writes a skill file and binds a hotkey turns GRIP's library into a user-visible power tool.

### Delight pattern 2: Quicklinks with icon and argument
- What it does. A Quicklink is a stored URL or CLI invocation with a name, icon, and optional `{argument}` placeholder. `jira {ticket}` becomes a Quicklink that prompts for a ticket ID and opens the Jira URL. `code-tonight {repo}` opens the repo folder in VS Code. Extensions can create Quicklinks programmatically via `Action.CreateQuicklink` with custom icon.
- Why it's delightful. Muscle memory for "jump to thing X with argument Y" compresses from 5 steps to 2 keystrokes + parameter. The API surface means extensions can offer "save this as a Quicklink" from any result.
- Source: https://manual.raycast.com/quicklinks, https://developers.raycast.com/misc/changelog (Action.CreateQuicklink).
- Transferable to GRIP Commander? **Yes.** Commander's "recent sessions / pinned repos" sidebar is a Quicklinks equivalent waiting to happen. Add argument placeholders (e.g., `resume {gen}` to resume a specific generation) and it becomes a power surface.

### Delight pattern 3: Snippets with "After Delimiter" expansion mode
- What it does. Raycast Snippets expand a keyword into longer text. "After Delimiter" mode means the keyword only expands after a space or punctuation character, preventing accidental expansion mid-word. Delay-before-expansion is configurable (immediate / 50ms / 200ms). Snippets support `{cursor}`, `{clipboard}`, `{date}` dynamic fields.
- Why it's delightful. Solves the #1 friction of text expanders (accidental triggers inside larger words) with a one-toggle fix. Dynamic fields make snippets first-class macros.
- Source: https://www.raycast.com/changelog (1.22.0 and surrounding).
- Transferable to GRIP Commander? **Partial.** Not a Commander-shaped primitive on its own, but in the Commander prompt box, text expansion for GRIP slash commands (`/mode` expanding to a parameter-prompted template with `{cursor}` landing at the focus point) is a straightforward lift.

---

## 6. Arc Browser (The Browser Company)

**One-line pitch.** The "browser reimagined" — vertical sidebar, spaces, split view, and a heavily-invested keyboard-first command surface. Development wound down 2024 but the UX patterns remain benchmark.

### Delight pattern 1: Little Arc — frameless single-page peek window
- What it does. Cmd+Option+click any link (in any app, Arc or not) opens the target in a small chromeless Arc window floating over current focus. Close the window with Esc or a single click. Decide-to-keep-it? Cmd+O moves the tab into your main Space. Cmd+Option+O routes it to a specific Space.
- Why it's delightful. Disrupts the "new-tab-that-I'll-forget" cycle by giving links a triage UX. Little Arc says: "read this now, decide later if it stays."
- Source: https://resources.arc.net/hc/en-us/articles/19235387524503-Little-Arc-Quick-Lookups-Instant-Triaging.
- Transferable to GRIP Commander? **Yes.** Commander's "I want to ask a quick question without polluting a session" use case is Little Arc exactly. Spawn a chromeless transient window tied to Claude Code with no persistence, auto-discardable unless promoted to a real tab with a hotkey.

### Delight pattern 2: Tidy Tabs — AI-powered sidebar auto-organisation
- What it does. Press the broom icon and Arc's AI groups your Today Tabs into named folders by inferred topic. Bad groupings are reversible with one click; accepted groupings persist. Runs on-demand, never autonomously.
- Why it's delightful. Attacks tab bankruptcy without punishing the user for it. The opt-in trigger means the AI never surprises you.
- Source: https://resources.arc.net/hc/en-us/articles/20498293324823 (2024-2026 release notes, Tidy Tabs).
- Transferable to GRIP Commander? **Yes.** Commander users accumulate dozens of session tabs. A "tidy sessions" broom that groups by repo / topic / mode and labels each group is a direct lift. AI-driven but user-triggered — matches GRIP's consent ethos.

### Delight pattern 3: Boosts + Zap — per-site customisation primitives
- What it does. Zap (lightning icon) lets the user click any DOM region and Arc removes it permanently for that site. Slash key restores. Boosts let you inject CSS/JS into a site — change the font, hide the banner, recolour the header. Boosts are shareable links (one click to install someone else's Boost).
- Why it's delightful. Makes the web feel malleable. The Zap-then-Slash-to-restore pair is a rare "undo everything" affordance that most opinionated UX tools skip.
- Source: https://resources.arc.net/hc/en-us/articles/19212718608151-Boosts-Customize-Any-Website.
- Transferable to GRIP Commander? **Partial.** Not directly applicable to Commander's native chrome. But the *pattern* — "let users prune or re-style the rendered output of an agent turn" (hide tool-call boilerplate, collapse verbose file reads into one line) — is a Commander-shaped version. Call it "Block Boosts".

---

## 7. Amazon Q Developer CLI (formerly Fig)

**One-line pitch.** The autocomplete overlay for 500+ CLIs, inline on top of bash/zsh/fish, plus AI chat and natural-language-to-command translation.

### Delight pattern 1: Inline autocomplete dropdown with argument awareness
- What it does. As the user types `git`, a dropdown renders to the right of the cursor showing subcommands (commit, push, rebase...) with one-line descriptions. Type a space and arrow-key through arguments — `--amend`, `--no-verify`, each with a tooltip explaining what it does. Works across iTerm2, Terminal.app, Hyper, Alacritty, Kitty, WezTerm via a shell integration hook. 500+ CLIs have curated spec files (ported from the original Fig project).
- Why it's delightful. The tooltip-per-flag fixes the #1 CLI pain: "what does --porcelain do again?" You never leave the prompt to read a man page.
- Source: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-autocomplete.html.
- Transferable to GRIP Commander? **Yes.** Commander's prompt box is the natural place for an equivalent: as the user types a slash command, render a dropdown with subcommands, argument hints, and a short description. GRIP has ~56 slash commands and ~210 skills — discoverability is already a pain.

### Delight pattern 2: Natural-language-to-command (`q`)
- What it does. Run `q` in any shell and describe what you want ("find all python files modified this week larger than 1MB"). Q generates the command, shows it inline for review, and only executes on explicit confirmation. Command history feeds back into future suggestions.
- Why it's delightful. The NL→shell translation is commoditised, but the *review-before-execute* pattern is the delight. User sees the command, learns it, owns the execution decision.
- Source: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html.
- Transferable to GRIP Commander? **Partial.** Commander already has an agent that runs shell. But the specific UX — "show the generated command, let me edit it inline, then run" — is a better affordance than Claude Code's current "agent decides and runs, user watches" pattern. A "Dry-run first" toggle in Commander's prompt is a direct steal.

### Delight pattern 3: Dotfiles/specs sync across machines
- What it does. User config (autocomplete preferences, aliases, spec overrides) syncs to the AWS account and pulls automatically on a new machine. First-run setup on a new laptop is ~30 seconds.
- Why it's delightful. Removes the "set up my shell for the 12th time" tax.
- Source: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-installing.html.
- Transferable to GRIP Commander? **Yes.** GRIP already has `~/.claude/` as the config substrate; Commander could expose a "push settings to cloud / pull on new machine" affordance that operates on the curated subset (skills, modes, keybindings, aliases) and leaves secrets alone.

---

## 8. Obsidian

**One-line pitch.** A local-first markdown knowledge base with wikilinks, a live preview editor, canvas, and a graph view. The "second brain" standard.

### Delight pattern 1: Hover Preview for internal links
- What it does. The Page Preview core plugin shows a floating preview of a linked note when the cursor hovers over `[[wikilink]]` — no click, no navigation. Works from the editor, from search results, from the graph view. Preview follows cursor; dismiss by moving away. Modifier-key variant pins the preview for reading.
- Why it's delightful. Converts linked-note navigation from a mode switch to a peek. You stay in your current context while absorbing the referenced one.
- Source: https://obsidian.md/help/plugins/page-preview (implicit in core plugin docs).
- Transferable to GRIP Commander? **Yes.** Commander's transcript references files, skills, plans, past sessions constantly. Hovering over `plans/solid-audit-ultrado.md` in a transcript should show the first 20 lines in a floating preview — no new tab, no navigation. Large delight win, small implementation.

### Delight pattern 2: Command Palette with plugin-filtered search
- What it does. Cmd+P opens the palette. Typing the name of an installed plugin filters to that plugin's commands — so typing "dataview" shows every command Dataview added. Hotkeys assigned to commands render inline in the palette entry. Fuzzy match across ~300 commands.
- Why it's delightful. The plugin-as-namespace filter is the right mental model when you've installed 40 plugins. It teaches the user which plugin owns which capability.
- Source: https://obsidian.md/ (command palette docs) and observed directly.
- Transferable to GRIP Commander? **Yes.** Commander's palette should let users type "broly" and filter to every broly-related action. Matches GRIP's own taxonomy (skills own a namespace).

### Delight pattern 3: Canvas — infinite spatial note + media surface
- What it does. Canvas is an infinite 2D plane where the user drops notes, images, PDFs, videos, webpages, and sticky cards, drawing arrows between them. Notes embed live (editable in-place). Canvases nest inside Canvases via "portals." Nodes auto-resize; focus mode dims everything except the selected node; presentation mode navigates node-by-node.
- Why it's delightful. The infinite plane is the right shape for "I am thinking, don't constrain me to a tree." The live-embedded notes mean Canvas is not a dead diagram — it's a runnable one.
- Source: https://obsidian.md/canvas.
- Transferable to GRIP Commander? **Partial/speculative.** Commander is session-centric, not note-centric. But a "session canvas" that pins agent turns, tool calls, and file artefacts as nodes with arrows (as a second tab on the session) is a compelling way to visualise RSI loops. Lower priority than the block/palette steals.

---

## 9. IntelliJ New UI / JetBrains AI Assistant + Junie

**One-line pitch.** The reference enterprise IDE with a 2025-era redesign (collapsible tool windows, merged toolbar) plus an agent (Junie) that drafts a `PLAN.md` before acting.

### Delight pattern 1: Search Everywhere (Double-Shift)
- What it does. Press Shift twice. One input fuzzy-searches across classes, files, symbols, actions, git history, recent locations, and now full-text content (2025.1 addition). Typing `main.py:42` jumps straight to file:line. Typing `run tests` surfaces the action. Recent usage is weighted. The underlying architecture was rewritten in 2025 for remote-dev speed.
- Why it's delightful. One entrypoint, seven kinds of navigation. The double-shift gesture is muscle memory for millions of IntelliJ users.
- Source: https://blog.jetbrains.com/platform/2025/12/major-architectural-update-introducing-the-new-search-everywhere-api-built-for-remote-development/, https://www.jetbrains.com/help/idea/searching-everywhere.html.
- Transferable to GRIP Commander? **Yes.** A double-modifier gesture (double-cmd, for example) that opens a palette scoped to "everything GRIP knows" (sessions, commits, files, skills, past transcripts, issues) is a direct lift. The cost-to-build is low; the productivity ceiling is high.

### Delight pattern 2: Distraction-Free Mode
- What it does. A single toggle collapses tool windows, tabs, and menus, centring the source code in the main window. Esc exits; any tool-window hotkey temporarily reveals that window. Unlike zen mode in other editors, typography and colours remain identical so the visual context doesn't break.
- Why it's delightful. Respects muscle memory on exit — nothing has moved. Addresses the real friction (visual noise) without the theatre of a fade-to-black.
- Source: https://www.jetbrains.com/help/idea/ide-viewing-modes.html.
- Transferable to GRIP Commander? **Yes.** Commander's sidebar + status + tabs + orchestration rail are visually busy. One "focus" hotkey that collapses everything except the transcript + prompt — and leaves a 3px edge affordance to reveal on hover — is a high-value addition.

### Delight pattern 3: Junie's two-column plan-then-execute panel
- What it does. Junie is the JetBrains agent. Given a task, it drafts a sequenced plan and writes it to `PLAN.md`. The agent panel is two columns: left is the high-level plan with ticked steps; right is the live action stream. Each file Junie touches is linked — click to open the diff viewer. On completion, all changed files appear in a Done panel with selective revert buttons per-file.
- Why it's delightful. Plan and execution live side-by-side, not in sequence. The linked-diff-per-file pattern collapses "what did the agent change" from a question to a glance. Selective revert at file granularity means partial acceptance is cheap.
- Source: https://junie.jetbrains.com/docs/junie-ide-plugin.html, https://blog.jetbrains.com/junie/.
- Transferable to GRIP Commander? **Yes — very high leverage.** Commander orchestrates agents that already produce plans (GRIP's plans/*.md). Rendering plan + execution as two columns, with per-file revert in the Done panel, is a direct productisation of the GRIP workflow. Probably the single most GRIP-aligned pattern in this audit.

---

## 10. tmux + Modern TUIs (Helix, lazygit, k9s)

**One-line pitch.** The reference modal-UX family. Keyboard-only, no mouse assumed, discoverable via which-key prompts.

### Delight pattern 1: Helix Space Mode (sticky which-key picker)
- What it does. Press Space in normal mode. A minibuffer shows the available secondary keys with labels — `f` file picker, `b` buffer picker, `/` workspace symbols, `j` jumplist. Space mode is *sticky*: after executing a pick, the space mode remains until Esc, so you can run several pickers in a row. Pickers support fuzzy filter, live preview of selection, and multi-select.
- Why it's delightful. Discoverable (which-key) + efficient (sticky) in one. You don't have to memorise the bindings because they render; after you do, the stickyness removes friction.
- Source: https://docs.helix-editor.com/keymap.html (space mode), https://felix-knorr.net/posts/2025-03-16-helix-review.html.
- Transferable to GRIP Commander? **Yes.** The which-key pattern is the right solution for GRIP's 56 slash commands. A space-like prefix that opens a labelled menu (with fuzzy filter) and stays open for chained actions is a massive discoverability win.

### Delight pattern 2: lazygit modal panels with context-aware keybinds
- What it does. lazygit shows four panels (Status / Files / Branches / Commits) with Tab to cycle. Each panel has its own keybinds that render in the bottom help bar. `i` enters interactive rebase mode in the Commits panel; within that mode, `d/s/f/r` drop/squash/fixup/reword; `ctrl-J/K` reorder commits. Cherry-pick is copy-paste: `c` on a commit, `V` in target branch to paste. A user-config `custom_commands` section binds arbitrary git invocations to keys with parameter prompts.
- Why it's delightful. Git's most-feared operations (interactive rebase, cherry-pick) become trivial through mode-scoped bindings. Custom commands turn lazygit into a DSL host.
- Source: https://github.com/jesseduffield/lazygit/wiki/Interactive-Rebasing, https://github.com/jesseduffield/lazygit/blob/master/docs/keybindings/Keybindings_en.md.
- Transferable to GRIP Commander? **Yes.** Commander's git/worktree operations today are spread across shell + menus. A lazygit-style panel scoped to the current repo (with keybinds for branch ops, commit review, push) + user-definable `custom_commands` mapping would be unique in the agent-shell space.

### Delight pattern 3: k9s skins + plugins + pulses + xray tree view
- What it does. k9s is a TUI for Kubernetes. Features to steal: (a) *skins* — user-editable YAML colour themes under `~/.config/k9s/skins/`; (b) *plugins* — arbitrary shell commands bound to hotkeys that operate on the currently-selected resource with templating (`$NAME`, `$NAMESPACE`); (c) *pulses* — dashboard showing live counters and heartbeat for cluster health; (d) *xray* — a tree view of a resource and its transitively-related objects.
- Why it's delightful. Skins and plugins make k9s feel *yours*. Xray's tree is the right UX for "show me this thing and everything connected to it."
- Source: https://k9scli.io/, https://github.com/derailed/k9s.
- Transferable to GRIP Commander? **Yes.** Skins (Commander themes as YAML) + plugins (user-scripted actions on selected transcript items) + pulses (live health tiles for grip-channel, grip-server, meeting-absorb) + xray (tree of session → child agents → tool calls) are all direct shapes for Commander's orchestration surface.

---

## Top 10 Cross-Tool Stealable Patterns (ranked by leverage for Commander)

Leverage = (transferability × expected delight) / implementation cost. Ranked high-to-low.

1. **Block-based transcript** (Warp blocks + Obsidian palette). Render each user turn / tool call / agent reply as a structured block with metadata (exit, duration, cost, model), filterable by type, permalinkable, exportable as markdown. The single largest shape change for Commander v0.5.

2. **Plan + Execute two-column view** (Junie). Split the active session pane: plan tree on the left (ticked steps), live action stream on the right, files-touched panel with per-file revert at the bottom. Productises GRIP's existing plans/*.md workflow. Biggest GRIP-alignment win.

3. **Parallel agents with judged winner** (Cursor 2.0). Run 3-8 Claude Code instances on the same prompt in isolated worktrees; evaluate outputs; recommend a winner with rationale. GRIP already has the worktree isolation; this is the missing product-shaped surface.

4. **Search Everywhere** (IntelliJ double-shift). One palette covering sessions, files, past transcripts, commits, skills, issues. Double-modifier gesture. Fuzzy with recent-usage weighting. The single highest-leverage palette primitive.

5. **Agent Following + Live File Peek** (Zed). Auto-scroll transcript to active tool call; show the file the agent is currently editing in a side peek with live cursor/highlight. Fixes the "is it still working" anxiety that plagues long RSI loops.

6. **`/recap` + Handoff Chime** (Claude Code). When a session is resumed or a tab becomes idle-waiting-on-user, show a summary card and play an opt-in mellow chime. Fights amnesia and forgotten-blocked-tab syndrome.

7. **Custom Statusline with refreshInterval** (Claude Code). Persistent bottom bar rendered from a user-defined shell snippet re-executed every N seconds. Live cost, context-left, branch, custom telemetry. Personalisation affordance with near-zero backend work.

8. **Hover Preview on in-transcript links** (Obsidian). Hover any filepath, skill name, PR reference, or plan link in the transcript → floating preview of the target's first 20 lines. No navigation, no tab pollution. Small implementation, large ergonomic win.

9. **Little Arc-style ephemeral question window** (Arc). Global hotkey opens a chromeless always-on-top Commander mini-window bound to a throwaway Claude Code session. Ask, get answer, close. Promote to a real tab on demand. Triage UX for interruptions.

10. **Space-mode which-key + command namespacing** (Helix + Obsidian). Press a prefix, see a labelled menu of next keys (`g` git, `s` skills, `m` mode, `w` worktree). Sticky. Plugin/skill namespaces auto-filter. Discoverability solution for GRIP's 56 commands + 210 skills + 39 agents without forcing memorisation.

---

## Honourable mentions (did not make top 10 but worth tracking)

- **Warp Drive Notebooks** — executable runbooks (prose + command blocks) shared team-wide. Better presentation than `plans/*.md`.
- **Raycast AI Commands as bindable hotkey tools** — promote individual skills to hotkey-invokable commands with icons.
- **lazygit interactive rebase panel** — if Commander builds a git UI at all, steal this wholesale.
- **k9s xray tree view** — a "session xray" that renders the agent tree + tool-call tree + file-touch tree is a debugging superpower for RSI loops.
- **Tidy Tabs broom** — AI-grouped session tabs by repo/mode/topic, user-triggered only.
- **Distraction-Free Mode** — one-toggle focus with muscle-memory-preserving exit; very cheap, visibly premium.

---

## Research coverage note

All 10 tools covered with 2-3 specific patterns each (30 patterns total). Primary research method was web search against 2025-2026 changelogs, official docs, and release notes. Direct observation was used for Cursor, Obsidian, Raycast, and Claude Code CLI where I have used the product surface firsthand. Where a pattern could not be 100% confirmed (e.g., exact keybinds in the very latest Arc build, since Arc's active development wound down) the claim is hedged or attributed to the 2024-2026 release-notes window.

Lowest-confidence tool: Fig / Amazon Q Developer CLI — the Fig-era TUI integration was rich, but post-Amazon-acquisition the docs focus on AWS-specific features and the overlay/spec-file ecosystem has been less clearly documented; patterns 2 and 3 are inferred from extant docs, not verified live.
