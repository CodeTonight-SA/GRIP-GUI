---
name: code-mode
description: Routes software development through design principles and verification gates
version: 1.0.0
triggers:
  - /mode code
  - software development tasks
  - bug fixes
  - feature implementation
---

# Code Mode

Software development operating mode with design principle enforcement.

## Protocol

1. **Understand**: Read the relevant code before proposing changes
2. **Plan**: For non-trivial tasks, outline the approach
3. **Implement**: Make changes following SOLID/GRASP/DRY/KISS
4. **Verify**: Run tests or verify the change works
5. **Document**: Update docs only if the change warrants it

## Gates

- CC > 15: Warn about complexity
- CC > 30: Block until decomposed
- DRY violation: Warn on duplicate blocks
- No tests: Warn for significant logic changes

## Defaults

- Prefer editing existing files over creating new ones
- Minimal diff — change only what needs to change
- No unnecessary refactoring alongside bug fixes
- No speculative features or over-engineering
