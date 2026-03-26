---
name: design-principles
description: Unified software design principles — SOLID, GRASP, DRY, KISS, YAGNI, BIG-O
version: 1.0.0
triggers:
  - designing architecture
  - reviewing code
  - refactoring
---

# Design Principles

## SOLID
- **S**ingle Responsibility: One reason to change per class/module
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for base types
- **I**nterface Segregation: Many specific interfaces over one general
- **D**ependency Inversion: Depend on abstractions, not concretions

## GRASP
- Information Expert: Assign responsibility to the class with the information
- Creator: Assign creation to the class that has the initialising data
- Controller: Assign system events to a non-UI class
- Low Coupling / High Cohesion: Minimise dependencies, maximise focus

## DRY (Don't Repeat Yourself)
Every piece of knowledge has a single, authoritative representation.
Three similar lines of code is NOT a DRY violation — premature abstraction is worse.

## KISS (Keep It Simple)
The right amount of complexity is the minimum needed for the current task.

## YAGNI (You Aren't Gonna Need It)
Don't build for hypothetical future requirements.

## BIG-O
Be aware of algorithmic complexity. Flag O(n^2)+ patterns.
