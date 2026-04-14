---
status: complete
priority: p1
issue_id: "009"
tags: [code-review, reliability, mobile, lifecycle, performance]
dependencies: []

# P1: Detector loop not cleaned on camera close paths

## Problem Statement

Camera stream cleanup is implemented, but detector loop cleanup is not consistently coupled to camera shutdown paths. This can keep polling work alive after camera close and cause hidden CPU and battery drain on mobile.

## Findings

- `clearIntervals()` stops `detectorInterval` explicitly in [web/src/App.svelte](web/src/App.svelte#L129).
- `closeCamera()` stops tracks and nulls `srcObject`, but does not clear `detectorInterval` in [web/src/App.svelte](web/src/App.svelte#L174).
- `closeCamera()` is called in background and fallback flows without interval teardown:
  - `continueInManualMode()` in [web/src/App.svelte](web/src/App.svelte#L529)
  - `handleCameraRevoked()` in [web/src/App.svelte](web/src/App.svelte#L542)
  - `onVisibilityChange()` in [web/src/App.svelte](web/src/App.svelte#L598)
- Detector polling is created with `setInterval` in [web/src/App.svelte](web/src/App.svelte#L323), so loop wakeups continue unless explicitly cleared.
- Known Pattern: prior lifecycle requirement already documented and resolved in [todos/002-complete-p1-mobile-lifecycle-camera-cleanup.md](todos/002-complete-p1-mobile-lifecycle-camera-cleanup.md).

## Proposed Solutions

### Option 1: Unified teardown function (recommended)

**Approach:** Create one idempotent `teardownCameraAndDetector()` that calls both `closeCamera()` and detector/countdown/timer cleanup, and use it for all interruption paths.

**Pros:**
- Removes duplicated lifecycle logic.
- Reduces race-condition risk between camera and detector states.

**Cons:**
- Requires careful replacement across existing handlers.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Make `closeCamera()` own detector cleanup

**Approach:** Extend `closeCamera()` to also clear detector interval and busy flags.

**Pros:**
- Small refactor with limited call-site changes.

**Cons:**
- Mixes media stream concerns with detector scheduling concerns.

**Effort:** Small

**Risk:** Medium

---

### Option 3: Extract detector controller module

**Approach:** Move detection loop start/stop into a separate controller with explicit lifecycle API.

**Pros:**
- Better long-term architecture and testability.

**Cons:**
- Larger refactor than needed for immediate fix.

**Effort:** Large

**Risk:** Medium

## Recommended Action

Adopt Option 1. Create one idempotent teardown path that always stops detector polling, timer/countdown intervals, and camera stream together. Replace direct interruption handlers to call this unified teardown before mode switches and visibility transitions.

## Technical Details

**Affected files:**
- [web/src/App.svelte](web/src/App.svelte#L129)

**Related components:**
- Session lifecycle handlers
- Camera permission/fallback modal flows
- Mobile visibility lifecycle handling

**Database changes (if any):**
- No

## Resources

- [docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md](docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md)
- [todos/002-complete-p1-mobile-lifecycle-camera-cleanup.md](todos/002-complete-p1-mobile-lifecycle-camera-cleanup.md)

## Acceptance Criteria

- [ ] All camera-close paths also stop detector polling work.
- [ ] No detector polling continues while app is backgrounded and camera is closed.
- [ ] Manual fallback path does not leave detector interval active.
- [ ] Regression checks cover revoke, background, and manual fallback transitions.

## Work Log

### 2026-04-14 - Initial Discovery

**By:** GitHub Copilot

**Actions:**
- Reviewed lifecycle and detector teardown paths in [web/src/App.svelte](web/src/App.svelte#L129).
- Cross-checked against prior lifecycle cleanup todo and plan commitments.
- Drafted remediation options by implementation scope.

**Learnings:**
- Lifecycle behavior is mostly correct at UX level, but cleanup ownership is fragmented.

### 2026-04-14 - Approved for Work

**By:** Claude Triage System

**Actions:**
- Issue approved during triage session.
- Status changed from pending to ready.
- Recommended action set to unified teardown strategy.

**Learnings:**
- Lifecycle-critical loops need single ownership to avoid hidden background work.

### 2026-04-14 - Resolved

**By:** GitHub Copilot

**Actions:**
- Added detector-loop teardown ownership in camera close paths.
- Ensured lifecycle interruptions stop polling work consistently.
- Verified with test, check, and build runs.

**Learnings:**
- Camera teardown and detector teardown must share one close-path contract.
## Notes

- This is merge-blocking because it can cause hidden runtime work after camera shutdown on mobile.
