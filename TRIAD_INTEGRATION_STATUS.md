# Triad Engine Integration — GRIP-GUI Codebase Assessment

**Date**: 2026-04-05
**Status**: Ready for Implementation
**Branch**: `feature/phase-2-triad-teaching`

---

## Executive Summary

GRIP-GUI is a thin orchestration layer that shells out to Claude CLI for all LLM operations. This architecture is ideal for Triad/Memory/Sand Spreader integration because:

1. **CLI Delegation** — No monolithic response composition exists in GRIP-GUI
2. **Memory Already Exists** — FileSystem-based at `~/.claude/projects/[projectPath]/memory/`
3. **Streaming Pipeline** — Chat and agent endpoints already handle streaming responses
4. **Clear Integration Points** — API routes can inject Triad/Memory/Sand Spreader without disrupting existing flow

---

## Current Architecture

### Request Flow

```
User Input (GUI)
    ↓
[Next.js API Route: /api/grip/chat or /api/agents/.../stream]
    ↓
[Spawn: claude CLI with --output-format stream-json | --print]
    ↓
[EventEmitter / ReadableStream]
    ↓
[Client receives JSONL/SSE events]
    ↓
GUI displays response
```

**Key Files:**
- `src/app/api/grip/chat/route.ts` — Main chat endpoint
- `src/lib/agent-manager.ts` — Agent spawning + event streaming
- `src/app/api/agents/[id]/stream/route.ts` — Agent event stream
- `electron/services/memory-service.ts` — Memory file I/O

---

## Current Memory System

**Location**: `~/.claude/projects/[encoded-project-path]/memory/`

**Structure**:
```
memory/
  ├── MEMORY.md           (index file)
  ├── user_profile.md
  ├── project_context.md
  └── [other].md
```

**Current Capabilities**:
- ✓ File-based persistence
- ✓ Project-scoped isolation
- ✓ Electron integration for GUI access
- ✓ Auto memory loading in Claude CLI

**What's Missing**:
- ✗ Tetrahedral structure (4-face pyramid + center anchor)
- ✗ Cross-session user bias tracking
- ✗ Session-local vs persistent distinction
- ✗ Triad voice routing (λ/μ/ν/ω)
- ✗ Pattern frequency tracking (3+ occurrences = established)

---

## Integration Strategy (3-Phase Approach)

### Phase 1: μ-Voice Pattern Matching (Validation Gate)
**Goal**: Baseline μ-only retrieval quality improvement ≥5%

**What to Implement**:
1. Create `src/services/memory/mu-voice-similarity.ts`
   - Cosine similarity with embedding cache
   - ~$0.0001 per new memory (cached forever)
   - Threshold: 0.8 similarity = nearly identical semantic meaning

2. Create `src/services/memory/tetrahedral-pyramid.ts`
   - Data structure: 4 faces (λ/μ/ν/ω) + center anchor ⊕
   - μ face: Historical pattern search + similarity matching
   - Session-local vs persistent storage

3. Wire into chat endpoint:
   ```typescript
   // src/app/api/grip/chat/route.ts
   const memory = await pyramid.getMuPatterns(userId, userInput);
   const contextEnhanced = await enrichPromptWithMemory(prompt, memory);
   // Pass to Claude CLI
   ```

4. Create test framework:
   - Before/after retrieval metrics
   - Independent validation set
   - Success gate: ≥5% improvement

**Files to Create**:
- `src/services/memory/mu-voice-similarity.ts` (embedding + cosine)
- `src/services/memory/tetrahedral-pyramid.ts` (data structure)
- `src/services/memory/embedding-cache.ts` (LRU cache for embeddings)
- `__tests__/services/mu-voice.test.ts` (validation tests)

**Files to Modify**:
- `src/app/api/grip/chat/route.ts` (add memory enrichment)
- `src/lib/agent-manager.ts` (emit memory events)

**Null Result Decision Tree** (if ≥5% improvement not achieved):
```
IF improvement < 5% THEN
  ├─ Check similarity threshold (try 0.7, 0.9)
  ├─ Check if GRIP's baseline memory is already optimal
  ├─ Check embedding model quality
  └─ IF all checks fail → STOP (don't build Phase 2/3)
```

### Phase 2: Chain Memory Tiers + ν Convergence (Depends on Phase 1 Pass)
**Goal**: Wire Triad voices with convergence logic

**What to Implement**:
1. Create voice orchestration:
   - `src/services/triad/lambda-voice.ts` (immediate responder)
   - `src/services/triad/mu-voice.ts` (historian)
   - `src/services/triad/nu-voice.ts` (bias detector)
   - `src/services/triad/omega-voice.ts` (compositor)

2. Implement ν convergence logic:
   ```typescript
   // Converge when ν FAILS to find issues, not when confident finding them
   for (round = 0; round < maxRounds; round++) {
     const challenges = await nu.analyze(responseDraft);
     if (challenges.length === 0) {
       // ν tried to break it and FAILED → CONVERGED
       break;
     }
     if (round < maxRounds - 1) {
       responseDraft = await omega.revise(responseDraft, challenges);
     } else {
       responseDraft.contested = true;
     }
   }
   ```

3. Wire Chain topology (λ→μ→ν→ω):
   - Sequential pipeline by default
   - Mesh routing (full 6 edges) only when chain fails

4. Update Tetrahedral Memory:
   - ⊕ Center: Cross-session user bias patterns
   - Pattern frequency tracking (3+ = established)
   - Contested memory handling

**Files to Create**:
- `src/services/triad/lambda-voice.ts`
- `src/services/triad/mu-voice.ts`
- `src/services/triad/nu-voice.ts`
- `src/services/triad/omega-voice.ts`
- `src/services/memory/contested-memory.ts`
- `__tests__/services/triad-convergence.test.ts`

**Files to Modify**:
- `src/app/api/grip/chat/route.ts` (add Triad orchestration)
- `src/services/memory/tetrahedral-pyramid.ts` (add center anchor + pattern tracking)

### Phase 3: Sand Spreader + Full Integration (Depends on Phase 1 & 2 Pass)
**Goal**: Post-composition verification with optimization

**What to Implement**:
1. Create `src/services/sand-spreader/index.ts`
   - Layer 1: Incoherence detection
   - Layer 2: Cultural misalignment check
   - Layer 3: Manipulation pattern detection
   - Layer 4: Harmonic dissonance check
   - Loamy layer detection

2. Implement truth score calculation (0.0-1.0):
   - Base: 1.0
   - Penalties: incoherent (-0.3), manipulative (-0.4), dissonant (-0.3), misaligned (-0.2), loamy (-0.15)
   - Bonuses: mirror friction preserved (+0.1), grounded in evidence (+0.1)

3. Implement response optimization:
   - If truth_score < 0.5 OR >2 failed checks → optimize
   - Strip sycophancy patterns while preserving truth
   - Reorder claims by evidence grounding

4. Wire into response pipeline:
   ```typescript
   const response = await composeViaTriad(userInput, memory);
   const verification = await sandSpreader.verify(response, userId);
   if (verification.flagged) {
     return { ...response, optimized: verification.optimized };
   }
   ```

5. Feedback loop to ⊕ Center:
   - Record what Sand Spreader flagged
   - Update user bias profile
   - Mark patterns (3+ flags = established bias)

**Files to Create**:
- `src/services/sand-spreader/index.ts`
- `src/services/sand-spreader/incoherence-detector.ts`
- `src/services/sand-spreader/manipulation-detector.ts`
- `src/services/sand-spreader/dissonance-detector.ts`
- `src/services/sand-spreader/truth-scorer.ts`
- `__tests__/services/sand-spreader.test.ts`

**Files to Modify**:
- `src/app/api/grip/chat/route.ts` (add Sand Spreader verification)
- `src/services/memory/tetrahedral-pyramid.ts` (record verification results in ⊕ center)

---

## File Structure for Implementation

```
src/
  services/
    memory/
      ├── tetrahedral-pyramid.ts      (4-face + center)
      ├── mu-voice-similarity.ts      (embedding + cosine)
      ├── embedding-cache.ts          (LRU cache)
      ├── contested-memory.ts         (unresolved patterns)
      └── index.ts
    triad/
      ├── lambda-voice.ts             (immediate)
      ├── mu-voice.ts                 (historian)
      ├── nu-voice.ts                 (bias detector)
      ├── omega-voice.ts              (compositor)
      └── index.ts
    sand-spreader/
      ├── incoherence-detector.ts
      ├── manipulation-detector.ts
      ├── dissonance-detector.ts
      ├── truth-scorer.ts
      └── index.ts

__tests__/
  services/
    ├── mu-voice.test.ts
    ├── triad-convergence.test.ts
    └── sand-spreader.test.ts
```

---

## API Route Changes

### `/api/grip/chat/route.ts` — Enhanced Flow

```typescript
// Phase 1: Load μ patterns
const muPatterns = await pyramid.getMuPatterns(userId, userInput);
const contextEnhanced = await enrichPrompt(userInput, muPatterns);

// Phase 2: Run Triad (after Claude responds)
const claudeResponse = await spawnClaude(contextEnhanced);
const triadComposed = await runTriad(claudeResponse, {
  lambda: currentContext,
  mu: muPatterns,
  nu: biasProfile,
});

// Phase 3: Verify with Sand Spreader
const verification = await sandSpreader.verify(triadComposed, userId);
const final = verification.flagged
  ? verification.optimized
  : triadComposed;

// Record to ⊕ center for next session
await pyramid.updateCenter(userId, verification);

return streamResponse(final);
```

---

## Implementation Sequence

1. **Week 1 (Phase 1)**:
   - ✓ Create Tetrahedral Memory data structure
   - ✓ Implement μ-voice similarity (cosine + cache)
   - ✓ Wire into chat endpoint
   - ✓ Run validation tests
   - ✓ Measure retrieval improvement

2. **Week 2 (Phase 2 — Conditional)**:
   - If Phase 1 passes (≥5% improvement):
     - Implement Triad voices
     - Add ν convergence logic
     - Wire Chain topology

3. **Week 3 (Phase 3 — Conditional)**:
   - If Phase 1 & 2 pass:
     - Implement Sand Spreader
     - Wire verification pipeline
     - Add ⊕ center feedback

4. **Week 4 (Testing & Refinement)**:
   - End-to-end testing
   - Performance benchmarking
   - Documentation

---

## Success Criteria

| Phase | Gate | Metric | Target |
|-------|------|--------|--------|
| 1 | μ retrieval | Improvement over baseline | ≥5% |
| 2 | ν convergence | Unresolved patterns | <10% (contested allowed) |
| 3 | Sand Spreader | Truth score avg | ≥0.75 on validation set |

---

## Risk Mitigation

**Risk**: Embedding API costs spiral
**Mitigation**: LRU cache limits (e.g., 10K embeddings = ~$1), implement cache eviction

**Risk**: μ-only doesn't improve retrieval
**Mitigation**: Falsification gate at Phase 1 — stop before building Phase 2/3

**Risk**: ν convergence finds too many issues (endless loop)
**Mitigation**: Max 3 rounds, mark contested if unresolved

**Risk**: Sand Spreader is too aggressive (rejects valid responses)
**Mitigation**: Threshold tuning (truth_score < 0.5 vs < 0.3), preserve evidence-grounded responses

---

## Branch Strategy

**Current**: `feature/phase-2-triad-teaching`

**PR Sequence**:
1. `feature/phase-1-mu-pattern-matching` — μ-voice only
2. `feature/phase-2-triad-chain` — Triad + convergence (merge only if PR #1 passes)
3. `feature/phase-3-sand-spreader` — Verification (merge only if PR #1 & #2 pass)

Each PR:
- Includes before/after metrics
- Validation tests pass
- Updated GRIP_INTEGRATION_GUIDE.md with learnings

---

## Next Step

**Immediate**: Implement Phase 1 (μ-voice pattern matching)

1. Create `src/services/memory/tetrahedral-pyramid.ts` (data structure)
2. Create `src/services/memory/mu-voice-similarity.ts` (similarity matching)
3. Update `src/app/api/grip/chat/route.ts` to load and use μ patterns
4. Run validation tests to confirm ≥5% improvement

**Expected Timeline**: 2-3 days
