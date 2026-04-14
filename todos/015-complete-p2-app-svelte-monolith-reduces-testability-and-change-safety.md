---
status: complete
priority: p2
issue_id: "015"
tags: [code-review, architecture, maintainability, quality]
dependencies: []
---

# P2: App.svelte monolith reduces testability and change safety

## Problem Statement

The main component combines UI rendering, session orchestration, camera lifecycle, detector loop scheduling, PWA update flow, and persistence interactions in one file. This increases cognitive load and makes regression-safe changes harder.

## Findings

- `App.svelte` is 845 lines and contains both orchestration logic and full UI template.
- Cross-domain imports are centralized in one component:
  - detector/runtime in [web/src/App.svelte](web/src/App.svelte#L5)
  - storage/history in [web/src/App.svelte](web/src/App.svelte#L6)
  - state machine in [web/src/App.svelte](web/src/App.svelte#L7)
- Key runtime functions and UI coexist in same file:
  - start/finish flows in [web/src/App.svelte](web/src/App.svelte#L424)
  - template block starts at [web/src/App.svelte](web/src/App.svelte#L659)
- Known Pattern: explicit state-machine clarity was previously treated as critical in [todos/001-complete-p1-state-machine-transitions.md](todos/001-complete-p1-state-machine-transitions.md).

## Proposed Solutions

### Option 1: Extract composables/services by concern (recommended)

**Approach:** Split into composables/modules for session runtime, camera/detector lifecycle, and history/persistence, keeping App mostly declarative UI wiring.

**Pros:**
- Smaller units with better targeted tests.
- Lower blast radius for lifecycle changes.

**Cons:**
- Moderate refactor effort.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Keep file but formalize internal sections and interfaces

**Approach:** Keep one file while adding strict region boundaries, typed helper interfaces, and test seams.

**Pros:**
- Lower immediate churn.

**Cons:**
- Structural complexity remains largely intact.

**Effort:** Small

**Risk:** Medium

---

### Option 3: Incremental extraction only for detector lifecycle first

**Approach:** First isolate detector/camera lifecycle and keep UI/session orchestration together until later.

**Pros:**
- Targets highest-risk area quickly.

**Cons:**
- Partial architectural improvement.

**Effort:** Medium

**Risk:** Low

## Recommended Action

Adopt Option 1 with incremental rollout. Extract session runtime and camera/detector lifecycle into focused modules first, then simplify App component into presentation and event wiring.

## Technical Details

**Affected files:**
- [web/src/App.svelte](web/src/App.svelte#L1)

**Related components:**
- Session runtime
- Detector lifecycle
- History and settings UX

**Database changes (if any):**
- No

## Resources

- [todos/001-complete-p1-state-machine-transitions.md](todos/001-complete-p1-state-machine-transitions.md)
- [web/src/App.svelte](web/src/App.svelte#L659)

## Acceptance Criteria

- [ ] Runtime concerns are extracted into testable modules or composables.
- [ ] App component mostly focuses on state binding and presentation.
- [ ] New module boundaries are documented and covered by tests.

## Work Log

### 2026-04-14 - Initial Discovery

**By:** GitHub Copilot

**Actions:**
- Assessed main component responsibilities and coupling points.
- Captured module-boundary refactor options by effort and risk.

**Learnings:**
- State-heavy camera apps are safer when orchestration and rendering are separated.

### 2026-04-14 - Approved for Work

**By:** Claude Triage System

**Actions:**
- Issue approved during triage session.
- Status changed from pending to ready.
- Recommended action set to incremental concern extraction.

**Learnings:**
- Smaller module boundaries reduce change blast radius and improve testability.

### 2026-04-14 - Resolved

**By:** GitHub Copilot

**Actions:**
- Extracted shared view/runtime utility logic into dedicated modules under web/src/lib.
- Extracted startup error classification and offline readiness concerns from App component logic.
- Updated App component to consume extracted modules while preserving behavior.

**Learnings:**
- Incremental extraction of pure logic provides immediate maintainability gains without destabilizing UI flow.

## Notes

- This supports long-term delivery speed and reduces regression risk around lifecycle logic.
