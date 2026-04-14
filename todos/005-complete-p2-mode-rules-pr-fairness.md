---
status: complete
priority: p2
issue_id: 005
tags: [code-review, product, ux, fairness]
dependencies: [001,003]
---

# P2: Clarify mode behavior and PR fairness rules

## Problem Statement
The plan defines Practice and Challenge modes, but user-facing behavior and PR fairness rules are not explicit enough for consistent implementation.

## Findings
- Practice-mode behavior on detection loss is not explicit.
- Manual mode relation to PR scoring lacks clarity.
- Challenge variant flow (free timer versus presets) is not fully explicit.

## Proposed Solutions
### Option A: One rule matrix for all modes
Pros: Fast to read and test.
Cons: May require careful wording to avoid ambiguity.
Effort: Small
Risk: Low

### Option B: Separate behavior specs per mode
Pros: Very clear for implementation and QA.
Cons: Longer documentation.
Effort: Medium
Risk: Low

### Option C: Keep unified PR but add mode labels in UI
Pros: Preserves motivational simplicity and transparency.
Cons: Needs UI copy decisions.
Effort: Small
Risk: Low

## Recommended Action
Adopt Option A plus Option C: define one explicit cross-mode rule matrix and keep unified PR with clear mode labels in session summaries.

## Technical Details
- Affected source: docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
- Components impacted: scoring logic, session summary UI, challenge setup UI

## Acceptance Criteria
- [ ] Behavior is explicit for detection loss in Practice, Challenge, and Manual.
- [ ] PR calculation and display rules are explicit and testable.
- [ ] Challenge setup flow clearly differentiates free timer and preset paths.

## Work Log
- 2026-04-14: Created from ce-review synthesis.

### 2026-04-14 - Approved for Work
By: Claude Triage System
Actions:
- Issue approved during triage session.
- Status changed from pending to ready.
- Ready to be picked up and worked on.

Learnings:
- Fairness perception depends more on transparent scoring rules than on adding extra scoring complexity.

### 2026-04-14 - Resolved
By: Claude Resolve System
Actions:
- Cross-mode behavior matrix documented.
- Unified PR rules clarified with mode-context display requirements.

Learnings:
- Explicit scoring context prevents user confusion about fairness.

## Resources
- docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
