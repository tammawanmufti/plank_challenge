---
status: complete
priority: p1
issue_id: 001
tags: [code-review, architecture, state-machine]
dependencies: []
---

# P1: Define explicit session state machine transitions

## Problem Statement
The plan defines session states but does not define transition rules, guards, and entry or exit actions. This can lead to inconsistent behavior across Practice, Challenge, and Manual flows.

## Findings
- State names exist, but transition contracts are not specified.
- Acceptance criteria rely on deterministic pause and resume behavior.
- Without a transition table, multiple implementations can pass local tests but diverge in edge cases.

## Proposed Solutions
### Option A: Transition table in the plan
Pros: Fastest to align team; no extra artifact.
Cons: Can become verbose inside one plan file.
Effort: Small
Risk: Low

### Option B: Separate state-machine spec document
Pros: Cleaner long-term reference for implementation and QA.
Cons: Adds another artifact to maintain.
Effort: Medium
Risk: Low

### Option C: Decision table + sequence examples
Pros: Balances clarity and brevity with concrete examples.
Cons: Slightly more writing than Option A.
Effort: Medium
Risk: Low

## Recommended Action
Adopt Option C: add a compact transition decision table plus sequence examples directly in the plan so engineering and QA share one deterministic contract.

## Technical Details
- Affected source: docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
- Components impacted: session engine, timer UI, mode selection, manual fallback

## Acceptance Criteria
- [ ] State transition rules are explicit for all states and modes.
- [ ] Guard conditions are defined for detection loss, permission denial, and manual fallback.
- [ ] Entry and exit actions are defined for each state.

## Work Log
- 2026-04-14: Created from ce-review synthesis.

### 2026-04-14 - Approved for Work
By: Claude Triage System
Actions:
- Issue approved during triage session.
- Status changed from pending to ready.
- Ready to be picked up and worked on.

Learnings:
- Deterministic state contracts are mandatory before implementation to prevent mode divergence.

### 2026-04-14 - Resolved
By: Claude Resolve System
Actions:
- Session state contract added into plan.
- Transition table, guards, and sequence examples documented.

Learnings:
- Defining deterministic transitions early reduces implementation ambiguity.

## Resources
- docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
- docs/brainstorms/2026-04-14-svelte-pwa-plank-challenge-mobile-brainstorm.md
