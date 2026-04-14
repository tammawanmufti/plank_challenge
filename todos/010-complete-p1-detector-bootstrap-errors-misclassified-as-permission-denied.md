---
status: complete
priority: p1
issue_id: "010"
tags: [code-review, ux, camera, error-handling, privacy]
dependencies: []

# P1: Detector bootstrap errors are misclassified as permission denial

## Problem Statement

The startup error path currently maps heterogeneous failures to one permission-denied message. This can mislead users, hide root causes, and leave runtime state inconsistent when detector initialization fails after camera grant.

## Findings

- Detector initialization is awaited before loop setup in [web/src/App.svelte](web/src/App.svelte#L312), via `await getFaceDetector()` in [web/src/App.svelte](web/src/App.svelte#L317).
- Session enters camera path before detector startup with `transition('start-camera')` in [web/src/App.svelte](web/src/App.svelte#L448).
- Any error in `startSession()` maps to permission-denied UI in [web/src/App.svelte](web/src/App.svelte#L454), even when root cause is model/CDN/delegate initialization.
- Known Pattern: permission fallback flow and transparency were previously emphasized in [todos/003-complete-p1-camera-permission-fallback-flow.md](todos/003-complete-p1-camera-permission-fallback-flow.md).

## Proposed Solutions

### Option 1: Error classification by source (recommended)

**Approach:** Distinguish `getUserMedia` errors, detector/model loading errors, and runtime detection errors; map each to user-visible status and actionable fallback.

**Pros:**
- Accurate UX messaging and easier support diagnostics.
- Better alignment with privacy/transparency expectations.

**Cons:**
- Requires additional branching and error-shape handling.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Two-step initialization with explicit rollback

**Approach:** Separate camera grant and detector bootstrap phases, with rollback to idle/paused and guaranteed cleanup if detector init fails.

**Pros:**
- Clear lifecycle state boundaries.

**Cons:**
- More state transition work.

**Effort:** Medium

**Risk:** Medium

---

### Option 3: Auto-switch to manual on detector init failures

**Approach:** Keep current catch shape but change behavior to offer immediate manual continuation for non-permission errors.

**Pros:**
- Fast UX fix for blocked users.

**Cons:**
- Still weak diagnostic fidelity unless paired with classification.

**Effort:** Small

**Risk:** Medium

## Recommended Action

Adopt Option 1. Introduce startup error taxonomy that separates permission errors from detector/model/bootstrap failures, then route each to explicit status copy and deterministic cleanup/reset behavior.

## Technical Details

**Affected files:**
- [web/src/App.svelte](web/src/App.svelte#L312)
- [web/src/lib/faceDetector.ts](web/src/lib/faceDetector.ts#L89)

**Related components:**
- Permission modal flow
- Detector bootstrap path
- Session startup state transitions

**Database changes (if any):**
- No

## Resources

- [todos/003-complete-p1-camera-permission-fallback-flow.md](todos/003-complete-p1-camera-permission-fallback-flow.md)
- [docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md](docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md)

## Acceptance Criteria

- [ ] Permission errors are distinguished from detector/model/bootstrap errors.
- [ ] Non-permission failures show accurate copy and next-step guidance.
- [ ] Camera and detector resources are always cleaned on startup failure.
- [ ] Startup state recovers to deterministic `idle` or `paused` path after failure.

## Work Log

### 2026-04-14 - Resolved

**By:** GitHub Copilot

**Actions:**
- Introduced startup error classification for permission, camera, and detector failures.
- Added explicit startup/resume failure handlers with deterministic cleanup.
- Verified with test, check, and build runs.

**Learnings:**
- Accurate error taxonomy improves both UX clarity and startup reliability.
### 2026-04-14 - Initial Discovery

**By:** GitHub Copilot

**Actions:**
- Traced startup flow from `startSession()` into detector bootstrap.
- Verified catch block collapses all failures into one permission modal path.
- Mapped remediation options with different refactor depth.

**Learnings:**
- UX clarity and runtime correctness need error taxonomy, not generic catch copy.

### 2026-04-14 - Approved for Work

**By:** Claude Triage System

**Actions:**
- Issue approved during triage session.
- Status changed from pending to ready.
- Recommended action set to error classification strategy.

**Learnings:**
- Correct failure categorization is necessary for user trust and recoverable flows.

## Notes

- This blocks merge because it can misrepresent privacy/permission status and degrade recovery behavior.
