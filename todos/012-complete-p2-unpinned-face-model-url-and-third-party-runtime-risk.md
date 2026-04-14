---
status: complete
priority: p2
issue_id: "012"
tags: [code-review, security, privacy, reliability, ml]
dependencies: []

# P2: Face model URL uses mutable latest alias and third-party runtime fetches

## Problem Statement

Detector assets are fetched from third-party hosts and model path uses a mutable `latest` alias. This reduces deterministic behavior and introduces operational and privacy dependency risk.

## Findings

- WASM runtime is loaded from jsDelivr in [web/src/lib/faceDetector.ts](web/src/lib/faceDetector.ts#L5).
- Model asset URL includes `latest` alias in [web/src/lib/faceDetector.ts](web/src/lib/faceDetector.ts#L7).
- Detector creation consumes this mutable model path in [web/src/lib/faceDetector.ts](web/src/lib/faceDetector.ts#L93).
- Known Pattern: local processing/privacy guarantees were emphasized in [todos/004-complete-p1-privacy-local-processing-enforcement.md](todos/004-complete-p1-privacy-local-processing-enforcement.md).

## Proposed Solutions

### Option 1: Pin immutable model version and self-host assets (recommended)

**Approach:** Replace `latest` alias with immutable version path and serve model/wasm assets from app-controlled origin.

**Pros:**
- Deterministic model behavior across releases.
- Better control for offline caching and privacy posture.

**Cons:**
- Requires asset hosting and release management.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Keep third-party hosting but pin immutable URL versions

**Approach:** Keep external hosts, remove mutable alias usage.

**Pros:**
- Smaller infra change.

**Cons:**
- Still depends on external host availability/policies.

**Effort:** Small

**Risk:** Medium

---

### Option 3: Add runtime integrity and fallback chain

**Approach:** Add robust load fallback from primary to backup mirror with checksum/version checks.

**Pros:**
- Better resilience under CDN failures.

**Cons:**
- Higher implementation complexity.

**Effort:** Large

**Risk:** Medium

## Recommended Action

Adopt Option 1. Pin model URLs to immutable version paths and migrate runtime/model asset hosting to an app-controlled origin where feasible, with documented cache/version rollout behavior.

## Technical Details

**Affected files:**
- [web/src/lib/faceDetector.ts](web/src/lib/faceDetector.ts#L5)
- [web/vite.config.ts](web/vite.config.ts#L38)

**Related components:**
- Detector bootstrap path
- Runtime caching for model/wasm assets

**Database changes (if any):**
- No

## Resources

- [todos/004-complete-p1-privacy-local-processing-enforcement.md](todos/004-complete-p1-privacy-local-processing-enforcement.md)
- [web/src/lib/faceDetector.ts](web/src/lib/faceDetector.ts#L7)

## Acceptance Criteria

- [ ] Model URL is version-pinned and immutable.
- [ ] Runtime/model asset hosting strategy is documented and controlled.
- [ ] Offline behavior for model/wasm assets is deterministic across app versions.

## Work Log

### 2026-04-14 - Initial Discovery

### 2026-04-14 - Resolved

**By:** GitHub Copilot

**Actions:**
- Pinned detector model URL to immutable version path.
- Added GPU-to-CPU detector initialization fallback and retry-safe promise reset.
- Verified with test, check, and build runs.

**Learnings:**
- Immutable model references and fallback delegates reduce runtime fragility.
**By:** GitHub Copilot

**Actions:**
- Inspected detector asset URLs and bootstrap options.
- Cross-checked runtime caching strategy for external hosts.
- Drafted migration options from low-effort to robust.

**Learnings:**
- Mutable model aliases are convenient but undermine reproducibility.

### 2026-04-14 - Approved for Work

**By:** Claude Triage System

**Actions:**
- Issue approved during triage session.
- Status changed from pending to ready.
- Recommended action set to immutable version pinning and controlled hosting.

**Learnings:**
- Reproducible ML behavior requires immutable asset references across releases.

## Notes

- Best-practices research marks this as partially aligned only when immutable pinning is missing.
