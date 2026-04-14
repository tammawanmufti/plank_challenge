---
name: linear-driven-dev
description: "Ticket-driven development workflow aligned with Linear. Use when: picking a ticket to work on, starting implementation from a Linear issue, checking for blockers before coding, updating ticket status during work, posting progress to Linear, completing a ticket with a Done Report. Keywords: linear, ticket, issue, sprint, backlog, pick ticket, start work, blockers, progress."
argument-hint: "Paste a Linear issue ID (e.g., SYN-42) or say 'pick next ticket'"
---

# Linear-Driven Development

Disciplined workflow that aligns every implementation task with a Linear ticket. Ensures visibility, catches blockers early, and tracks progress from start to finish.

## When to Use
- Picking a ticket from the backlog to work on next
- Starting implementation on a specific Linear issue
- Checking for blockers or dependencies before coding
- Updating progress mid-implementation
- Completing a ticket and posting the Done Report

## Workflow Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. PICK    │ →  │  2. ANALYZE │ →  │  3. EXECUTE │ →  │  4. CLOSE   │
│  Select     │    │  Blockers & │    │  Implement  │    │  Done Report│
│  ticket     │    │  deps check │    │  + track    │    │  + status   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Phase 1 — Pick Ticket

**Goal:** Select the right ticket to work on next, based on priority and readiness.

### If user provides a ticket ID:
1. Fetch the issue: `mcp_linear_get_issue` with `includeRelations: true`
2. Read: title, description, acceptance criteria, labels, priority, current status
3. Present a summary to the user

### If user says "pick next ticket":
1. Fetch backlog: `mcp_linear_list_issues` filtered by `state: "Todo"` or `state: "Backlog"`, sorted by priority
2. For the top 3-5 candidates, check relations (`includeRelations: true`)
3. Present a ranked list with:
   - Title, priority, labels
   - Blocker status (blocked by unfinished issues?)
   - Estimated complexity (from labels or estimate field)
4. Recommend the best candidate — highest priority that is NOT blocked

---

## Phase 2 — Analyze Before Starting

**Goal:** Identify every potential blocker BEFORE writing code. Never start blind.

### 2.1 Dependency Scan
1. Check `blockedBy` relations — are all blocking issues Done/Closed?
2. Check parent issue — is there a parent with incomplete prerequisites?
3. Check sub-issues — does this ticket have children that should be done first?
4. If blocked: **STOP** — report to user with the blocking issue IDs and their statuses

### 2.2 Codebase Readiness Check
Map ticket requirements to codebase dependencies:

| Requirement | Check |
|---|---|
| Needs a Drizzle schema | Does the table exist in `libs/clinic/[domain]/data/`? |
| Needs a DTO | Does the interface exist in `libs/dtos/`? |
| Needs an API endpoint | Does the controller/service exist in `libs/clinic/[domain]/api/`? |
| Needs a UI component | Does it exist in `libs/ui-v3/` or `libs/clinic/[domain]/ui/`? |
| Needs another domain's data | Is cross-domain event already set up? |

For each missing dependency:
- If it can be created as part of this ticket → add to task breakdown
- If it belongs to another ticket → **report as blocker**, link via `blockedBy`

### 2.3 Task Breakdown
Following the project's leveled sequencing:
1. **Level 1 (Foundation):** Schema + DTOs + shared UI atoms
2. **Level 2 (Backend):** Services + Controllers
3. **Level 3 (Frontend):** Pages + Components

Use the `pm` agent rules for task decomposition. Post the breakdown as a comment on the Linear issue.

### 2.4 Move to In Progress
Once analysis passes with no blockers:
1. Update issue status: `mcp_linear_save_issue` → `state: "In Progress"`
2. Assign to self if unassigned: `assignee: "me"`
3. Post analysis comment to the issue:
```markdown
## 🔍 Pre-Work Analysis
**Blockers:** None found ✅
**Dependencies identified:**
- [list what exists and what needs to be created]
**Task breakdown:**
- [ ] Level 1: [items]
- [ ] Level 2: [items]
- [ ] Level 3: [items]
**Starting implementation.**
```

---

## Phase 3 — Execute with Tracking

**Goal:** Implement while keeping Linear updated at every meaningful checkpoint.

### 3.1 Implementation
Delegate to the `developer` agent (or follow its rules). The developer agent handles:
- Pre-flight checks (imports, routes, references)
- Code implementation with tests
- Post-flight checks (build, lint, smoke test)

### 3.2 Progress Comments
Post a Linear comment at each level completion:
```markdown
## ✅ Level [N] Complete
**What was done:** [brief summary]
**Files changed:** [list]
**Build:** PASS | **Lint:** PASS
**Next:** Starting Level [N+1]
```

Use: `mcp_linear_save_comment` with `issueId` and the markdown body.

### 3.3 Blocker Discovery Mid-Work
If a blocker surfaces during implementation:
1. Post a comment explaining the blocker
2. If it's another ticket: add `blockedBy` relation via `mcp_linear_save_issue`
3. If the ticket can't proceed: move status back to `state: "Blocked"` or `state: "Todo"`
4. **STOP** and report to user with options:
   - Resolve the blocker first (switch tickets)
   - Work around it with mocks (if frontend-only)
   - Escalate

---

## Phase 4 — Close the Loop

**Goal:** Complete the ticket with evidence and move status.

### 4.1 Done Report
After the developer agent's post-flight checks pass, compile the Done Report per `anti-flaw-guardrails.instructions.md`.

### 4.2 QA Gate
Run the Pre-PR QA Gate (mandatory):
1. Invoke `qa` agent for test cases
2. Run unit tests
3. Execute manual test cases via browser
4. Gate decision: APPROVED or BLOCKED

### 4.3 Post Completion to Linear
Post the full Done Report + QA Gate Report as a comment:
```markdown
## ✅ Implementation Complete

### Done Report
**Files Changed:** [list]
**Build:** PASS | **Lint:** PASS
**How to Test:** [browser steps]
**Known Limitations:** [if any]

### QA Gate Report
**Unit Tests:** PASS ([x]/[total])
**Manual Test Cases:** [x]/[total] PASS
**Failed Cases:** none
**Gate Decision:** APPROVED
```

### 4.4 Update Status
- If QA APPROVED: `mcp_linear_save_issue` → `state: "Done"`
- If QA BLOCKED: keep `state: "In Progress"`, post failure details, fix and re-run

---

## Quick Reference — Linear MCP Tools Used

| Action | Tool |
|---|---|
| Fetch issue details + relations | `mcp_linear_get_issue` (includeRelations: true) |
| List backlog/todo issues | `mcp_linear_list_issues` (state filter) |
| Update issue status/assignee | `mcp_linear_save_issue` |
| Post progress comment | `mcp_linear_save_comment` |
| Add blocker relation | `mcp_linear_save_issue` (blockedBy: [...]) |
| Check sub-issues | `mcp_linear_list_issues` (parentId filter) |

## Hard Stops
- **Never start coding on a blocked ticket** — resolve or switch first
- **Never skip the analysis phase** — even for "simple" tickets
- **Never close a ticket without a Done Report** posted to Linear
- **Never create a PR without QA Gate APPROVED** status
