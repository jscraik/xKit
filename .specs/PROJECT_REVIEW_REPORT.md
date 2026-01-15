# Project Review Report: xKit

**Owner:** Jamie Craik  
**Date:** 2026-01-15  
**Repo:** /Users/jamiecraik/dev/xKit  
**Audience:** solo dev  
**Inputs reviewed:** README | package.json | docs/bookmark-archiving.md | docs/bookmark-export-analysis.md | docs/testing.md | src/cli.ts | src/cli/program.ts

---

## 1) Executive Summary
- **Recommendation:** Continue with refocus
- **Why:**
  - Solid, functional CLI with clear command surface and working docs
  - Strong wedge in bookmark archiving + enrichment
  - Scope fits a solo dev learning/portfolio goal
- **Biggest missing pieces:**
  - No explicit PRD or tech spec documenting vision, scope, or contracts
  - No success metrics or evidence plan
  - No operational plan for X GraphQL volatility
- **Next 14 days:**
  1. Draft PRD for CLI + bookmark archiving (Owner: you) — Done when: PRD includes personas, stories, scope, metrics
  2. Draft tech spec for auth, query IDs, bookmark pipeline — Done when: APIs, data models, error taxonomy, security documented
  3. Define success metrics + lightweight evidence plan — Done when: metrics table + data sources (even manual) documented
  4. Write ops runbook for breakage — Done when: query ID refresh + rollback steps documented
  5. Add ADRs for key decisions (cookie auth, GraphQL approach) — Done when: ADRs in docs/adr/ and referenced

---

## 2) Original Vision (Reconstructed)
- **Vision statement (then):** Fast CLI to read, post, and manage X/Twitter content via GraphQL cookie auth.
- **Problem statement:** Power users and developers want command-line access to X without official API friction.
- **Target users/personas:** CLI power users, developers, researchers, automators.
- **Hypothesis:** If X access is fast and scriptable, users will integrate it into automation workflows.
- **Success metrics (intended):** Adoption (installs), reliability (low breakage), usefulness (bookmark export/archiving).

Sources:
- README, CLI help, docs

---

## 3) Current State (Reality Check)
- **What exists today:** CLI commands for read/search/thread/mentions/news/bookmarks/lists/tweet/reply; bookmark archiving with enrichment/categorization; docs and tests.
- **Who is actually using it (if anyone):** Not yet known.
- **Architecture snapshot:** Node CLI (commander), GraphQL cookie auth, modular bookmark pipeline, docs site and binary build.
- **Known constraints/debt:**
  - Undocumented X GraphQL endpoints and query IDs can change without notice.
  - Cookie extraction is OS/browser-dependent and sensitive to account challenges.

---

## 4) Evidence of Usefulness / Demand
- **User feedback:** None collected yet.
- **Behavioral signals:** None collected yet.
- **Competitive landscape:** Alternatives include official API SDKs, scrapers, and smaller CLIs; xKit differentiates via cookie auth + bookmark archiving workflow.

If evidence is missing:
- Define a small evidence plan: track installs, run a short user survey, capture 3-5 real user testimonials.

---

## 5) Gap Analysis (What’s missing)
### 5.1 Product gaps
- Missing persona clarity (solo dev goal is known, but primary user segment is not formalized)
- Missing core user stories and edge cases
- Missing success metrics and measurement plan

### 5.2 Engineering gaps
- Missing API/schema definitions for GraphQL response shapes
- Missing data model constraints and versioning for archive outputs
- Missing security requirements and cookie handling boundaries
- Missing error taxonomy and retry policy
- Missing performance targets

### 5.3 Operational readiness gaps
- Missing dashboards/alerts (even minimal)
- Missing rollback and breakage runbook
- Missing SLOs/error budget policy

---

## 6) Viability Assessment
- **Problem severity:** Medium (high for automation users; low for mainstream users)
- **Differentiation / wedge:** Bookmark archiving + enrichment + knowledge base output
- **Feasibility:** High, but reliability risk is elevated due to undocumented endpoints
- **Go-to-market path (even small):** GitHub/CLI communities, Homebrew, personal brand building
- **Biggest assumptions:**
  1. Users accept cookie-based auth friction
  2. X GraphQL endpoints remain stable enough for CLI usage
  3. Bookmark archiving is compelling enough to drive adoption
- **Kill criteria:** Sustained API breakage or no meaningful adoption after a defined trial window

---

## 7) Realignment Plan
### Updated vision statement (now)
Provide a reliable, developer-first CLI for X workflows, with a best-in-class bookmark archiving pipeline, while explicitly managing API volatility risk and keeping scope suitable for a solo dev learning project.

### Updated scope
- In:
  - CLI read/search/thread/mentions/news/bookmarks/lists
  - Bookmark archiving + enrichment + categorization
  - Query ID refresh tooling
  - Cookie-based login (current approach)
- Out:
  - Official API support
  - Complex LLM integrations (skip for now)
  - Parallel processing (skip for now)
  - Token tracking (skip for now)

### Updated success metrics
| Metric | Target | Window | Source |
|---|---:|---|---|
| Weekly active users | 50 | 30d | npm downloads + manual feedback |
| Archive completion rate | 80% | 30d | local logs / manual tracking |
| Command failure rate | <2% | 30d | error logging |
| Query ID refresh success | >95% | 30d | command telemetry |

---

## 8) Recommended Plan (Actionable)
### Top priorities (next 14 days)
1. Create PRD for core CLI + bookmark archiving (Owner: you) — Done when: PRD with personas, stories, scope, metrics
2. Create tech spec for auth, query IDs, bookmark pipeline — Done when: APIs, data models, errors, security documented
3. Define a minimal evidence plan — Done when: plan lists 3-5 signals and how you’ll capture them
4. Draft ops runbook — Done when: breakage response + refresh/rollback steps documented
5. Create ADRs for cookie auth + GraphQL approach — Done when: ADRs stored under docs/adr/

### Follow-up deliverables
- [ ] Create PRD
- [ ] Create Tech Spec
- [ ] Add ADR(s) for key decisions
- [ ] Add instrumentation + dashboards (lightweight)
- [ ] Complete ORR checklist before production launch

---

## 9) Appendix
- Key files/docs reviewed: README.md, docs/bookmark-archiving.md, docs/bookmark-export-analysis.md, docs/testing.md, src/cli.ts, src/cli/program.ts, package.json
- Commands run: ls, rg, sed, cat
- Notes: No existing PRD/Tech Spec found. Project is WIP. Keep current cookie-based login.
