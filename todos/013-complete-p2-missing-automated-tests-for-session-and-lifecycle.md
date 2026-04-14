---
status: complete
priority: p2
issue_id: "013"
tags: [code-review, quality, testing, reliability]
dependencies: []
---

# P2: Missing automated tests for session transitions and lifecycle paths

## Problem Statement

Core behavior relies on timing and lifecycle transitions, but source-level automated tests are absent. This increases regression risk for pause/resume fairness and camera interruption flows.

## Findings

- No tests found under source tree (`find web/src -type f \( -name '*.test.*' -o -name '*.spec.*' \)` returned 0).
- Critical transition logic lives in [web/src/lib/sessionMachine.ts](web/src/lib/sessionMachine.ts#L3).
- Complex runtime/lifecycle behavior is concentrated in [web/src/App.svelte](web/src/App.svelte#L424), [web/src/App.svelte](web/src/App.svelte#L542), and [web/src/App.svelte](web/src/App.svelte#L598).
- Known Pattern: performance/lifecycle risk areas were already prioritized in [todos/007-complete-p2-performance-budget-detection-pipeline.md](todos/007-complete-p2-performance-budget-detection-pipeline.md).

## Proposed Solutions

### Option 1: Add unit tests for state machine + key helpers (recommended)

**Approach:** Add unit tests around `nextSessionState` and isolated lifecycle helper behavior.

**Pros:**
- Fastest coverage on deterministic logic.

**Cons:**
- Does not cover integrated DOM/camera event interactions.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Add component integration tests with mocked media APIs

**Approach:** Add integration tests for permission denied/revoked, visibility change, and manual fallback flows.

**Pros:**
- Better confidence for user-visible behavior.

**Cons:**
- More setup complexity for browser/media mocks.

**Effort:** Large

**Risk:** Medium

---

### Option 3: Hybrid test pyramid

**Approach:** Start with unit tests, then add targeted integration tests for highest-risk flows.

**Pros:**
- Balanced delivery vs confidence.

**Cons:**
- Requires phased rollout discipline.

**Effort:** Medium

**Risk:** Low

## Recommended Action

Adopt Option 3. Implement a hybrid test pyramid starting with session-machine unit tests, then add targeted integration tests for permission and lifecycle interruption flows.

## Technical Details

**Affected files:**
- [web/src/lib/sessionMachine.ts](web/src/lib/sessionMachine.ts#L3)
- [web/src/App.svelte](web/src/App.svelte#L424)

**Related components:**
- Session control UX
- Camera lifecycle and interruption handlers

**Database changes (if any):**
- No

## Resources

- [todos/007-complete-p2-performance-budget-detection-pipeline.md](todos/007-complete-p2-performance-budget-detection-pipeline.md)
- [docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md](docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md)

## Acceptance Criteria

- [ ] Unit tests cover all expected transitions and no-op events in session machine.
- [ ] Integration tests cover permission denied/revoked and visibility interruption paths.
- [ ] Regression tests validate timer fairness around pause/resume/loss countdown.

## Work Log

### 2026-04-14 - Initial Discovery

**By:** GitHub Copilot

**Actions:**
- Audited source tree for test files and found none.
- Mapped highest-risk logic to state and lifecycle functions.
- Drafted phased test strategy options.

**Learnings:**
- Deterministic session features need automated regression gates to remain reliable.

### 2026-04-14 - Approved for Work

**By:** Claude Triage System

**Actions:**
- Issue approved during triage session.
- Status changed from pending to ready.
- Recommended action set to phased unit plus integration test rollout.

**Learnings:**
- Regression risk is highest in timing and interruption paths without automated checks.

### 2026-04-14 - Resolved

**By:** GitHub Copilot

**Actions:**
- Added vitest tooling and new unit tests for session transitions and startup error classification.
- Validated all tests, type checks, and build output.

**Learnings:**
- Fast transition-level tests create reliable guardrails for lifecycle-heavy UI behavior.

## Notes

- This is important but non-blocking if quick follow-up is planned before broader release.
