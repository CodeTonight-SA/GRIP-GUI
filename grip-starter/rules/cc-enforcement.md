# Cyclomatic Complexity Enforcement

## The Principle

Every `if`, `for`, `while`, `except`, `and`, `or`, `assert`, and comprehension
adds a decision path. Cyclomatic complexity (CC) counts these paths. High CC
means the function is doing too many things — split it.

## Thresholds

| Grade | CC Range | Meaning |
|-------|----------|---------|
| A     | 1-5      | Simple, well-focused function |
| B     | 6-10     | Moderate, acceptable |
| C     | 11-20    | Needs attention, consider decomposition |
| D     | 21-40    | Refactor needed, too many decision paths |
| F     | 41+      | Unmaintainable, must decompose |

Warn at CC > 15. Block at CC > 30.

## Decomposition Patterns

### 1. Extract-Dispatch
Replace if/elif chains with type-to-handler dispatch:
```python
HANDLERS = {"click": handle_click, "hover": handle_hover}
def process(event):
    return HANDLERS.get(event.type, handle_default)(event)
```

### 2. Extract-Independent-Blocks
Logically independent try/except blocks become helpers.

### 3. Coordinator Pattern
Parent function becomes pure orchestrator calling focused helpers:
```python
def build_report(data):
    validated = _validate_input(data)
    metrics = _compute_metrics(validated)
    return _format_output(metrics)
```
