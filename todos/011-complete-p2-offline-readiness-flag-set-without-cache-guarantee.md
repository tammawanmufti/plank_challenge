---
status: complete
priority: p2
issue_id: "011"
tags: [code-review, pwa, offline, reliability]
dependencies: []

# P2: Offline readiness flag can be set without verified cache readiness

## Problem Statement

Offline gating is based on a local key that is set in multiple paths, including generic online events. This can report readiness before service-worker caching is truly ready, causing fragile first-offline behavior.

## Findings

- Intended readiness signal exists in `onOfflineReady()` in [web/src/App.svelte](web/src/App.svelte#L75).
- The same key is also set when online state is true in [web/src/App.svelte](web/src/App.svelte#L627) and on online events in [web/src/App.svelte](web/src/App.svelte#L633).
- Offline first-open gating reads this key in [web/src/App.svelte](web/src/App.svelte#L623), so online presence can bypass cache-readiness semantics.
- Known Pattern: offline strategy requirement previously documented in [todos/006-complete-p2-offline-cache-update-strategy.md](todos/006-complete-p2-offline-cache-update-strategy.md).

## Proposed Solutions

### Option 1: Key only set from verified offline-ready signal (recommended)

**Approach:** Restrict `FIRST_LOAD_KEY` writes to service-worker offline-ready callback and remove online-event writes.

**Pros:**
- Aligns readiness state with real cache capability.

**Cons:**
- Might require additional UI copy for "online but not yet cache-ready" state.

**Effort:** Small

**Risk:** Low

---

### Option 2: Split keys for connectivity and cache readiness

**Approach:** Keep separate flags for `was-online` and `offline-ready` and gate logic only on the latter.

**Pros:**
- Better diagnostics and explicit state semantics.

**Cons:**
- Slightly higher complexity.

**Effort:** Medium

**Risk:** Low

---

### Option 3: Runtime cache probe before enabling offline flow

**Approach:** Verify required assets are cached before lifting first-open-offline gate.

**Pros:**
- Strong runtime guarantee.

**Cons:**
- More moving parts and potential probe overhead.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Adopt Option 1. Restrict readiness-key writes to verified service-worker offline-ready events and remove generic online-event writes so first-open offline behavior reflects real cache readiness.

## Technical Details

**Affected files:**
- [web/src/App.svelte](web/src/App.svelte#L75)

**Related components:**
- PWA offline readiness messaging
- First-open offline gating path

**Database changes (if any):**
- No

## Resources

- [todos/006-complete-p2-offline-cache-update-strategy.md](todos/006-complete-p2-offline-cache-update-strategy.md)
- [docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md](docs/plans/2026-04-14-001-feat-svelte-pwa-plank-challenge-plan.md)

## Acceptance Criteria

- [ ] First-open offline gate depends on cache readiness, not online status.
- [ ] `FIRST_LOAD_KEY` semantics are single-purpose and documented.
- [ ] UI messaging distinguishes connectivity from offline capability.

## Work Log

### 2026-04-14 - Initial Discovery

**By:** GitHub Copilot

### 2026-04-14 - Resolved

**By:** GitHub Copilot

**Actions:**
- Switched offline readiness key semantics to verified offline-ready paths only.
- Removed online-event writes to readiness key and added pending-cache UI state.
- Verified with test, check, and build runs.

**Learnings:**
- Connectivity should not be used as a proxy for offline capability readiness.
**Actions:**
- Audited offline-ready and online event handlers in app mount lifecycle.
- Mapped key-write locations and gate read locations.
- Drafted solutions balancing simplicity and correctness.

**Learnings:**
- Connectivity and cache-readiness should not share one readiness flag.

### 2026-04-14 - Approved for Work

**By:** Claude Triage System

**Actions:**
- Issue approved during triage session.
- Status changed from pending to ready.
- Recommended action set to cache-readiness-only key semantics.

**Learnings:**
- Offline UX reliability depends on cache state, not connectivity hints.

## Notes

- Best-practices research flags this as not aligned with robust PWA offline gating.
