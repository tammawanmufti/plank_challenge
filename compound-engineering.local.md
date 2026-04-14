---
review_agents: [kieran-typescript-reviewer, security-sentinel, performance-oracle, architecture-strategist, best-practices-researcher]
plan_review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer]
---

# Review Context

- Prioritize review depth on web/ (Svelte + TypeScript + Vite PWA).
- Validate that all critical states are visible in the UI (camera permission, detection lifecycle, offline behavior, errors).
- Enforce privacy constraints for on-device face processing and local-only storage.
- Check mobile lifecycle safety (camera teardown, resume behavior, cleanup on mode transitions).
- Flag regressions against current docs/plans and existing todo priorities.
