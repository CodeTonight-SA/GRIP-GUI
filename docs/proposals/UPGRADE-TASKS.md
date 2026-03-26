# GRIP Upgrade Tasks

Three phases tracking delivery of the changes in `UPGRADE-SPEC.md`.
Each phase ships as one PR. Phases are independent and can be sequenced or parallelised.

---

## Phase 1: Memory Metadata

### 1.1 Types

- [ ] Add optional fields to `MemoryFile` in `src/types/electron.d.ts`:
  - `importance?: number`
  - `confidence?: number`
  - `scope?: 'user' | 'project' | 'global'`
  - `tags?: string[]`
  - `source?: 'conversation' | 'execution' | 'review' | 'manual'`

### 1.2 Memory service

- [ ] Add YAML front matter parser to `electron/services/memory-service`
  - Parse on `readMemoryFileContent` — return metadata fields alongside content
  - Serialise back to front matter on `writeMemoryFileContent` when metadata is provided
  - Files without front matter continue to work unchanged

### 1.3 New IPC channel

- [ ] Register `memory:search` handler in `electron/handlers/memory-handlers`
  - Accept: `{ scope?, tags?, minImportance?, query? }`
  - Return: files scored by `importance × confidence × recency_decay(modified)`, sorted descending

### 1.4 Tests (add to `__tests__/electron/handlers/memory-handlers.test.ts`)

- [ ] Front matter round-trip: write with metadata → read → fields intact
- [ ] Files without front matter: read returns `undefined` for metadata fields
- [ ] `memory:search` filters by scope and tags
- [ ] `memory:search` returns results sorted by score descending

---

## Phase 2: TRIAD-TEACHING Mode

### 2.1 Mode entry

- [ ] Add to `GRIP_MODES` array in `src/lib/grip-modes.ts`:
  ```ts
  {
    id: 'triad-teaching',
    name: 'TRIAD TEACHING',
    description: 'Multi-voice teaching through Explainer, Contextualizer, and Challenger synthesis',
    category: 'content',
    skills: ['pedagogical-patterns', 'curriculum-design', 'research-synthesis'],
    tokenBudget: 4000,
  }
  ```

### 2.2 Skill definition

- [ ] Create `.agents/skills/triad-teaching/SKILL.md` with:
  - EXPLAINER role prompt scaffolding
  - CONTEXTUALIZER role prompt scaffolding
  - CHALLENGER role prompt scaffolding
  - COMPOSITOR merge instructions
  - Collapse logic (single voice when confidence is high)

### 2.3 Learner profile integration

- [ ] Document the memory file convention: `scope: user`, `tags: [learner-profile]`
- [ ] Add depth-adjustment logic to the COMPOSITOR section of the skill

### 2.4 Tests

- [ ] Unit test: mode entry present in `GRIP_MODES` with correct fields
- [ ] Snapshot test: skill file renders expected prompt structure

---

## Phase 3: CI Coverage

### 3.1 Update `ci.yml`

- [ ] Replace `npm test` step with `npm run test:coverage`
- [ ] Add `codecov/codecov-action@v4` upload step with `fail_ci_if_error: false`
- [ ] Verify coverage badge renders correctly in README

---

## Definition of Done

| Phase | Gate |
|-------|------|
| 1 | All memory-handlers tests pass; no regressions in existing 5-channel tests |
| 2 | Mode appears in `/modes` page; skill parseable by skill browser |
| 3 | Coverage report uploads on every CI run; badge live in README |
