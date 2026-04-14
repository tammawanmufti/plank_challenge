---
status: complete
priority: p3
issue_id: "014"
tags: [code-review, pwa, ux, compatibility]
dependencies: []
---

# P3: Manifest icon strategy is SVG-only and may reduce install compatibility

## Problem Statement

Manifest icon entries are SVG-only with `purpose: any`. Some install surfaces and launcher environments still behave more reliably with PNG and maskable icon entries.

## Findings

- `includeAssets` references SVG icon files in [web/vite.config.ts](web/vite.config.ts#L11).
- Manifest icon entries use `image/svg+xml` in [web/vite.config.ts](web/vite.config.ts#L25) and [web/vite.config.ts](web/vite.config.ts#L31).
- Icon purpose is only `any` in [web/vite.config.ts](web/vite.config.ts#L26).

## Proposed Solutions

### Option 1: Add PNG + maskable icon set (recommended)

**Approach:** Provide PNG icons for 192/512 and add maskable entries while keeping SVG as supplemental asset.

**Pros:**
- Better cross-platform install consistency.

**Cons:**
- Requires generating and maintaining additional assets.

**Effort:** Small

**Risk:** Low

---

### Option 2: Keep SVG-only and monitor install telemetry

**Approach:** Accept current config and defer changes until install issues are observed.

**Pros:**
- No immediate work.

**Cons:**
- Risk of avoidable install UX issues on some devices.

**Effort:** Small

**Risk:** Medium

## Recommended Action

Adopt Option 1. Add PNG 192 and 512 icons and at least one maskable icon while keeping SVG as supplemental, then validate install behavior on target mobile browsers.

## Technical Details

**Affected files:**
- [web/vite.config.ts](web/vite.config.ts#L11)

**Related components:**
- PWA installation experience
- Home-screen icon rendering

**Database changes (if any):**
- No

## Resources

- [web/vite.config.ts](web/vite.config.ts#L23)

## Acceptance Criteria

- [ ] Manifest includes PNG icons for standard install sizes.
- [ ] At least one maskable icon is provided.
- [ ] Install flow validated on target mobile browsers.

## Work Log

### 2026-04-14 - Initial Discovery

**By:** GitHub Copilot

**Actions:**
- Reviewed manifest icon declarations in Vite PWA configuration.
- Compared current entries with common cross-device install practices.

**Learnings:**
- SVG-only works in many cases but is less robust across install surfaces.

### 2026-04-14 - Approved for Work

**By:** Claude Triage System

**Actions:**
- Issue approved during triage session.
- Status changed from pending to ready.
- Recommended action set to add PNG and maskable icons.

**Learnings:**
- Cross-device install consistency improves with broader icon format support.

### 2026-04-14 - Resolved

**By:** GitHub Copilot

**Actions:**
- Added PNG 192, PNG 512, and PNG maskable icon assets.
- Updated Vite PWA manifest entries to include PNG and maskable icons while retaining SVG entries.
- Validated with test, check, and build runs.

**Learnings:**
- Supporting both SVG and PNG icon formats improves installation compatibility in mixed environments.

## Notes

- Nice-to-have improvement; does not block merge.
