---
status: complete
priority: p1
issue_id: 003
tags: [code-review, ux, camera, permissions]
dependencies: [001]
---

# P1: Define camera permission and manual fallback flow

## Problem Statement
The plan requires manual fallback when camera access is denied, but the user journey and decision points are not specified.

## Findings
- Permission prompt timing is unspecified.
- Deny path and retry path are unspecified.
- Mid-session permission revocation behavior is unspecified.

## Proposed Solutions
### Option A: Mode first, permission second
Pros: User understands context before system prompt.
Cons: Adds one decision step before prompt.
Effort: Small
Risk: Low

### Option B: Fast start with immediate permission prompt
Pros: Potentially faster for camera-friendly users.
Cons: Higher confusion and denial rate.
Effort: Small
Risk: Medium

### Option C: Manual-first with optional camera upgrade
Pros: Guaranteed start and no permission friction.
Cons: Weakens camera-driven challenge value.
Effort: Medium
Risk: Medium

## Recommended Action
Adopt Option A for v1: mode first, permission second, with explicit deny, retry, grant-later, and mid-session revoke handling paths.

## Technical Details
- Affected source: docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
- Components impacted: onboarding flow, permission UI, fallback routing

## Acceptance Criteria
- [ ] Plan defines exact permission request timing.
- [ ] Plan defines deny, retry, and grant-later user paths.
- [ ] Plan defines behavior for permission revoked during active session.

## Work Log
- 2026-04-14: Created from ce-review synthesis.

### 2026-04-14 - Approved for Work
By: Claude Triage System
Actions:
- Issue approved during triage session.
- Status changed from pending to ready.
- Ready to be picked up and worked on.

Learnings:
- Clear permission flow is essential to hit startup speed and reduce user confusion.

### 2026-04-14 - Resolved
By: Claude Resolve System
Actions:
- Permission decision path and deny or retry or manual fallback flow documented.
- Revoked mid-session behavior added with explicit user choices.

Learnings:
- Mode-first permission flow keeps startup fast and predictable.

## Resources
- docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
- docs/brainstorms/2026-04-14-svelte-pwa-plank-challenge-mobile-brainstorm.md
