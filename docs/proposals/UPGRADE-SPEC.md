# GRIP Upgrade Spec — Memory Depth + Education Triad

## Overview

Three targeted improvements to increase GRIP's depth without breaking existing workflows:

1. **Memory metadata** — enrich the existing filesystem memory service with scoring fields
2. **TRIAD-TEACHING mode** — a new mode that applies three-voice synthesis to learning interactions
3. **CI coverage** — add coverage reporting to the existing `ci.yml` pipeline

All changes are additive. No breaking changes to IPC channels, existing modes, or vault storage.

---

## 1. Memory Metadata Extension

### Current baseline

GRIP memory is filesystem-based markdown files surfaced via five Electron IPC channels:

```
memory:list-projects
memory:read-file
memory:write-file
memory:create-file
memory:delete-file
```

`MemoryFile` carries `name`, `path`, `content`, `modified`. No scoring or classification.

### Proposed addition

Extend `MemoryFile` and `memory-service` to support an optional YAML front matter block:

```yaml
---
importance: 8          # 1–10, used to rank retrieval
confidence: 0.9        # 0–1, how reliable this fact is
scope: project         # user | project | global
tags: [architecture, decision]
source: conversation   # conversation | execution | review | manual
---
```

Rules:
- Field is optional — files without front matter continue to work unchanged
- `memory:read-file` parses front matter if present and surfaces it as structured fields
- `memory:write-file` accepts optional metadata object; serialises back to front matter
- `memory:list-projects` ranking can use `importance` to sort/surface relevant files first

### New IPC channel (additive)

| Channel | Purpose |
|---------|---------|
| `memory:search` | Filters files by `scope`, `tags`, importance threshold |

### Retrieval scoring (in `memory-service`)

When `memory:search` is called, score each file:

```
score = importance × confidence × recency_decay(modified)
```

Return files sorted by score descending. Scope filter applied first.

### Types to update

`src/types/electron.d.ts` — add optional fields to `MemoryFile`:

```ts
importance?: number;     // 1–10
confidence?: number;     // 0–1
scope?: 'user' | 'project' | 'global';
tags?: string[];
source?: 'conversation' | 'execution' | 'review' | 'manual';
```

---

## 2. TRIAD-TEACHING Mode

### Pattern

Three specialised sub-voices are synthesised into one response before delivery to the user:

| Role | Function | GRIP analogy |
|------|---------|-------------|
| EXPLAINER | Clear direct answer, era/domain grounded | λ Local voice |
| CONTEXTUALIZER | Wider connections, cross-domain patterns | μ Guide voice |
| CHALLENGER | Probe assumptions, expose what the user hasn't asked | ν Mirror voice |

The compositor blends the three into one natural response. If a question is simple and confidence is high, the compositor can collapse to a single voice.

### Mode entry (add to `grip-modes.ts`)

```ts
{
  id: 'triad-teaching',
  name: 'TRIAD TEACHING',
  description: 'Multi-voice teaching through Explainer, Contextualizer, and Challenger synthesis',
  category: 'content',
  skills: ['pedagogical-patterns', 'curriculum-design', 'research-synthesis'],
  tokenBudget: 4000,
},
```

### Skill definition

A new skill `triad-teaching` defines the prompt scaffolding for each role and the compositor instructions. Follows the existing skill file format used throughout `.agents/skills/`.

### Optional learner profile

Stored in memory as a `scope: user`, `tags: [learner-profile]` file. TRIAD TEACHING reads this at session start and adjusts CHALLENGER depth (shallow for novice, deep for expert).

---

## 3. CI Coverage Reporting

### Current baseline

`ci.yml` runs `npm test` (Vitest). No coverage output is collected or reported.

### Proposed addition

Extend the existing single `test` job — no additional jobs, no path filters:

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    fail_ci_if_error: false
```

`test:coverage` already exists in `package.json` (`vitest run --coverage`). One-line step swap + one upload step.

---

## Rollout

| Phase | What ships | Risk |
|-------|-----------|------|
| 1 | Memory front matter parsing + `memory:search` IPC channel | Low — additive, no breaking changes |
| 2 | TRIAD-TEACHING mode entry + skill definition | Low — new mode, no existing code changed |
| 3 | CI coverage step | Near-zero — extends existing job |

Each phase ships as a standalone PR. No feature flags required given purely additive scope.
