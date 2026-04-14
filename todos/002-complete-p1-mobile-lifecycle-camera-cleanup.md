---
status: complete
priority: p1
issue_id: 002
tags: [code-review, reliability, mobile, privacy]
dependencies: [001]
---

# P1: Specify mobile lifecycle and camera cleanup behavior

## Problem Statement
The plan identifies background and foreground lifecycle risk but does not define required behavior when the app is hidden, resumed, or interrupted.

## Findings
- No explicit rule for timer behavior on background.
- No explicit contract to stop camera tracks when session ends or app hides.
- Lifecycle ambiguity can cause battery drain and inconsistent timer states.

## Proposed Solutions
### Option A: Hard pause on hide + explicit resume on return
Pros: Predictable behavior and safer battery profile.
Cons: User may need an extra tap after returning.
Effort: Medium
Risk: Low

### Option B: Auto-resume attempt with fallback banner
Pros: Smoother user experience.
Cons: More edge cases across mobile browsers.
Effort: Medium
Risk: Medium

### Option C: End session on interruption
Pros: Simplest lifecycle rule.
Cons: Harsh UX for short context switches.
Effort: Small
Risk: Medium

## Recommended Action
Adopt Option A for v1: hard pause on hide and explicit resume on return, with mandatory camera track stop on app hide and session end.

## Technical Details
- Affected source: docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
- Components impacted: camera stream management, app lifecycle hooks, timer persistence

## Acceptance Criteria
- [ ] Behavior is defined for hide, show, lock screen, and tab switch.
- [ ] Camera tracks are explicitly stopped on session end and app hide.
- [ ] User-visible status is defined for interruption and resume.

## Work Log
- 2026-04-14: Created from ce-review synthesis.

### 2026-04-14 - Approved for Work
By: Claude Triage System
Actions:
- Issue approved during triage session.
- Status changed from pending to ready.
- Ready to be picked up and worked on.

Learnings:
- Explicit mobile lifecycle behavior is required to avoid battery and state integrity regressions.

### 2026-04-14 - Resolved
By: Claude Resolve System
Actions:
- Lifecycle policy for hide or show or lock and tab switch added.
- Camera cleanup contract documented for session end and interruption.

Learnings:
- Lifecycle rules must be explicit for reliability on mobile browsers.

## Resources
- docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md
