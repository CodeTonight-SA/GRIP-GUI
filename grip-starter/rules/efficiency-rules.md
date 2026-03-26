# Efficiency Rules

## Rule 1: Descriptive Plan Names
Plan names describe the work: `auth-refactor-plan.md` not `joyful-snacking-cloud.md`.

## Rule 2: File Read Cache
Before Read: check if read in last 10 messages. If yes and no external edits: skip re-read.
Phase 1: batch all reads. Phase 2+: targeted edits only.

## Rule 3: Plan Evaluation Gate
Before executing plan items: "Is this change actually needed?" If already done or uncertain: HALT and propose skip.

## Rule 4: Implementation Directness
Always choose the most direct path. No temp scripts — use Edit/Write directly.

## Rule 5: AskUserQuestion MANDATORY (PARAMOUNT)
When confidence < 99.9999999%: **HALT and AskUserQuestion**. Especially for:
UI/UX decisions, brand elements, removing/changing existing elements, any choice
with multiple valid options. If you think "I think this is what the user wants" —
that thought means ASK.

## Rule 6: Context Gate (PARAMOUNT)
At 85% context: HALT all work. AskUserQuestion with options
(compact/serialise/push-through/checkpoint). Never auto-serialise.

## Rule 7: Anti-Drift "What's Up Next"
After any commit/PR/phase completion: output remaining work items before
accepting new tasks. Never skip — even if user seems ready to pivot.

## Rule 8: Auto-Cleanup
Delete temporary scripts after task completion. They accumulate and waste context.

## Rule 9: Quality Signal Compliance (PARAMOUNT)
When [QUALITY] signals appear in conversation context:
1. From PreToolUse DENY: tool call was blocked — fix the violation, then retry.
2. From PreToolUse WARN: fix before proceeding to next task.
3. NEVER ship code with unaddressed [QUALITY] warnings.
