# PRD: xKit CLI + Bookmark Archiving (Incorporating Bird Lessons)

**Owner:** Jamie Craik
**Status:** Draft - Incorporating Upstream Learnings
**Last updated:** 2026-01-21
**Stakeholders:** Solo dev (primary), future OSS contributors (secondary)
**Links:** Repo: /Users/jamiecraik/dev/xKit | Docs: README.md | Upstream: steipete/bird
**Evidence source:** /Users/jamiecraik/dev/recon-workbench/runs/bird-20260121/derived/findings.json
**Previous spec:** .specs/spec-2026-01-15-xkit-prd.md

> **Note:** This document updates the original xKit PRD by incorporating architectural lessons learned from the upstream bird project (steipete/bird), from which xKit was originally derived.

---

## Executive Summary

xKit provides a developer-first X/Twitter CLI that extends the minimal bird foundation with comprehensive bookmark archiving, AI-powered enrichment, and knowledge-base organization. While bird achieves exceptional minimalism (4 production deps, 54.8% test coverage), xKit differentiates through advanced bookmark processing, local LLM integration, and daemon-mode archiving.

This specification incorporates critical lessons from bird's architecture:
1. **Testing patterns** — Live API integration tests with environment flag gating
2. **Minimalism** — Audit and justify each dependency against bird's 4-dep baseline
3. **GraphQL resilience** — Query ID rotation, fallback IDs, auto-recovery patterns
4. **Code organization** — Target 200-250 LOC per file vs. current 600+ in timeline modules

**Success will be measured** by early adoption signals from Codex and Swift communities (downloads, stars, testimonials) and by operational reliability (low error rate, stable outputs).

**Evidence:** Recon-workbench analysis of bird (steipete/bird) dated 2026-01-21, file: `/Users/jamiecraik/dev/recon-workbench/runs/bird-20260121/derived/findings.json`

---

## 0) One-screen summary

- **One-liner:** A best-in-class X/Twitter CLI with unique bookmark archiving, AI enrichment, and knowledge management capabilities.
- **Why now:** xKit has Phase 1 complete but can benefit from incorporating bird's architectural patterns for testing, minimalism, and resilience.
- **Expected outcome:** A more maintainable, better-tested codebase that preserves xKit's unique features while adopting upstream best practices.

**Evidence gap:** User adoption metrics from Phase 1 release are not yet collected. Evidence plan in Section 6 remains overdue.

---

## 1) Problem / Opportunity (with evidence)

### Problem Statement
- **Primary problem:** xKit evolved significantly from its bird origins, adding 60+ dependencies for bookmark archiving, AI integration, and advanced features. This creates maintenance burden and potential technical debt compared to bird's focused approach.
- **Secondary problem:** While xKit has unique value (bookmark archiving, AI, daemon mode), it lacks bird's disciplined testing patterns and code organization standards.

### Who feels it most
- **Solo Developer (maintainer):** Managing 60+ dependencies vs. bird's 4 increases cognitive load and security surface area.
- **Users:** Benefit from xKit's advanced features but inherit potential instability from increased complexity.

### Current workaround
- Manual maintenance of xKit's expanded feature set
- Ad-hoc testing without structured live API integration tests

### Evidence
| Evidence Item | Source | Status |
|---|---|---|
| bird dependency count: 4 (4 prod, 8 dev) | recon-workbench findings.json:91-95 | ✅ Verified |
| xKit dependency count: 60+ (from package.json) | xKit package.json | ✅ Verified |
| bird test coverage: 54.8% (13K test lines / 24K LOC) | recon-workbench findings.json:80-84 | ✅ Verified |
| bird longest file: 636 LOC (twitter-client-timelines.ts) | recon-workbench findings.json:111-116 | ✅ Verified |
| xKit timeline modules: similar or larger | xKit source tree | ⚠️ Needs verification |
| bird uses live API tests (BIRD_LIVE=1 flag) | bird package.json:17-18 | ✅ Verified |
| GraphQL query ID auto-recovery on 404 | bird README (inferred) | ⚠️ Needs xKit verification |

### Evidence gaps
- [ ] xKit's actual test coverage percentage (not yet measured)
- [ ] xKit's longest module file LOC counts
- [ ] xKit's current GraphQL query ID recovery implementation
- [ ] User adoption metrics from Phase 1 release

---

## 2) Target Users / Personas

| Persona | Role | Context | Goals | Pain points |
|---|---|---|---|---|
| "Solo Dev" | Builder/Learner | Personal projects, terminal-first workflow | Learn by shipping, grow profile, automate X | Low visibility, brittle scripts, no API key |
| "Researcher/Writer" | Analyst/Writer | Collects and curates links | Durable bookmark archive with AI summaries | Bookmarks feel ephemeral, hard to organize |
| "Knowledge Worker" | Information professional | Builds personal knowledge bases | Semantic search, categorization, retrieval | Manual organization doesn't scale |

**Primary:** Solo Dev
**Secondary:** Researcher/Writer, Knowledge Worker

**Evidence:** Persona definitions from original xKit PRD (spec-2026-01-15-xkit-prd.md:55-64)

---

## 3) Lessons Learned from Bird (NEW SECTION)

### 3.1 Testing Patterns

**Bird's approach (54.8% coverage):**
- Live API integration tests gated by `BIRD_LIVE=1` environment variable
- Separate test files for live testing (`tests/live/live.test.ts`, `tests/live/live-all.test.ts`)
- Vitest with v8 coverage (`@vitest/coverage-v8`)
- Test scripts: `test`, `test:watch`, `test:live`, `test:live:all`
- `--no-file-parallelism` flag for live tests to avoid rate limits

**Evidence:** recon-workbench findings.json:101-106; bird package.json:16-18

**Adoption plan for xKit:**
1. Implement `XKIT_LIVE=1` gated live API tests
2. Create `tests/live/` directory with integration test suites
3. Target 50%+ test coverage (bird standard)
4. Add coverage reporting to CI

**User story for testing:**
- **[STORY-BIRD-001]:** As a maintainer, I want live API tests so that I can detect X API changes before users do.
  - Acceptance criteria:
    - [ ] `XKIT_LIVE=1 pnpm test:live` runs integration tests against live X endpoints
    - [ ] Tests cover critical paths: read, search, bookmarks, thread expansion
    - [ ] Rate limit protection with `--no-file-parallelism`
    - [ ] Coverage report shows >= 50% coverage

### 3.2 Minimalism & Dependency Discipline

**Bird's approach (4 production dependencies):**
```
@steipete/sweet-cookie (cookie extraction)
commander (CLI framework)
json5 (config)
kleur (colors)
```

**Evidence:** recon-workbench findings.json:89-95; bird package.json:42-45

**xKit's current state (60+ dependencies):**
- Core CLI: similar to bird
- Bookmark archiving: +20 deps (turndown, linkedom, @mozilla/readability, etc.)
- LLM integration: +10 deps (ollama, fast-check, ajv, ajv-formats)
- Webhook notifications: +5 deps
- Daemon mode: +5 deps
- Dev tooling: +20 deps (Biome, Vitest, oxlint, etc.)

**Evidence:** xKit package.json:43-74

**Adoption plan:**
1. **Audit:** Map each dependency to specific feature requirement
2. **Consolidate:** Identify opportunities to use built-in Node APIs vs. external deps
3. **Document:** Create dependency justification matrix
4. **Monitor:** Add automated alerts for dependency bloat in PR reviews

**Dependency audit template:**

| Dependency | Purpose | Feature | Can remove? | Alternative |
|---|---|---|---|---|
| @steipete/sweet-cookie | Cookie extraction | Auth core | No | None |
| commander | CLI framework | CLI core | No | None |
| turndown | HTML→MD conversion | Archive | No | Manual parsing (more complex) |
| linkedom | HTML parsing | Archive | Maybe | Node built-in DOM? |
| ollama | Local LLM | AI summaries | No | Only for AI feature |
| fast-check | Property testing | Tests | Maybe | Vitest built-in |
| [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |

**User story for minimalism:**
- **[STORY-BIRD-002]:** As a maintainer, I want a dependency audit so that I can reduce security surface and maintenance burden.
  - Acceptance criteria:
    - [ ] Dependency map created with feature justifications
    - [ ] At least 5 non-essential dependencies identified for removal
    - [ ] Documentation added for each remaining dependency
    - [ ] PR review template includes dependency impact check

### 3.3 GraphQL Resilience Patterns

**Bird's approach:**
- Ships with baseline `query-ids.json`
- Runtime refresh by scraping X web client bundles
- Auto-recovery on 404 with fallback IDs
- 24h TTL on query ID cache
- `graphql:update` script for manual refresh

**Evidence:** bird README (query ID section); recon-workbench findings.json:60-64

**xKit's current implementation:**
- Has `src/lib/runtime-query-ids.ts` (needs verification of parity with bird)
- Has `src/lib/query-ids.json` baseline

**Evidence gap:** Need to verify if xKit has all of bird's resilience patterns:
- [ ] Auto-recovery on 404 with fallback IDs
- [ ] Query ID rotation through known fallback set
- [ ] Runtime refresh capability
- [ ] 24h cache TTL

**User story for GraphQL resilience:**
- **[STORY-BIRD-003]:** As a user, I want automatic recovery from X API changes so that the tool continues working without manual intervention.
  - Acceptance criteria:
    - [ ] 404 responses trigger automatic query ID refresh
    - [ ] Fallback ID pool is cycled when primary IDs fail
    - [ ] User receives clear message about auto-recovery
    - [ ] `xkit query-ids --fresh` manually refreshes cache

### 3.4 Code Organization Patterns

**Bird's approach:**
- Average file length: 217.9 lines
- Longest file: 636 LOC (`twitter-client-timelines.ts`)
- 109 total TypeScript files
- Modular structure by feature (timelines, search, users, etc.)

**Evidence:** recon-workbench findings.json:80-84, 111-116

**xKit's current state (needs verification):**
- Likely has longer files due to added features
- Archive pipeline modules may exceed 600 LOC
- Some modules may benefit from splitting

**Adoption plan:**
1. **Audit:** Measure xKit file lengths and identify >300 LOC files
2. **Refactor:** Split large modules into focused sub-modules
3. **Target:** Max 300 LOC per file, average ~200 LOC

**User story for code organization:**
- **[STORY-BIRD-004]:** As a maintainer, I want modules under 300 LOC so that code remains navigable and testable.
  - Acceptance criteria:
    - [ ] Code audit identifies all files >300 LOC
    - [ ] Refactoring plan created for large modules
    - [ ] Timeline modules split into focused sub-400 LOC files
    - [ ] Average file length reduced to ~200 LOC

---

## 4) User Stories

### Core Stories (from original PRD)

1) **[STORY-001]:** As a Solo Dev, I want to read a tweet/thread by ID or URL so that I can quickly capture context for scripts.
   - Acceptance criteria:
     - [x] Given a tweet ID or URL, the CLI prints the text content in a single command.
     - [x] The command supports `--json` output with a stable schema.
   **Priority:** Must
   **Status:** ✅ Complete

2) **[STORY-002]:** As a Researcher/Writer, I want to archive bookmarks to markdown so that I can build a personal knowledge base.
   - Acceptance criteria:
     - [x] Running `xkit archive` creates or updates a markdown archive file.
     - [x] Each archived entry includes URL, author, and timestamp.
   **Priority:** Must
   **Status:** ✅ Complete

3) **[STORY-003]:** As a Solo Dev, I want to refresh query IDs so that I can recover from API changes without rebuilding the tool.
   - Acceptance criteria:
     - [x] `xkit query-ids --fresh` refreshes cached IDs and reports success or error.
     - [ ] Errors include actionable messaging.
   **Priority:** Should
   **Status:** ⚠️ Partial (needs bird-style auto-recovery)

4) **[STORY-004]:** As a Researcher/Writer, I want categorization of bookmark outputs so that I can keep my archive organized by content type.
   - Acceptance criteria:
     - [x] Write archives into category folders when categorization runs.
     - [x] Apply a default category mapping without extra configuration.
   **Priority:** Should
   **Status:** ✅ Complete

5) **[STORY-005]:** As a CLI user, I want a plain output mode so that I can use the tool in scripts or accessibility tools without ANSI noise.
   - Acceptance criteria:
     - [x] `--plain` produces output with no emoji and no ANSI styling.
     - [x] Plain output stays readable and stable across commands.
   **Priority:** Should
   **Status:** ✅ Complete

6) **[STORY-006]:** As a Solo Dev, I want a guided first-run setup so that I can configure cookies and outputs quickly.
   - Acceptance criteria:
     - [x] `xkit setup` completes with a success message and next-step command.
     - [x] Setup errors include a specific fix (e.g., missing cookies, permissions).
   **Priority:** Should
   **Status:** ✅ Complete

### New Stories (from bird lessons)

7) **[STORY-BIRD-001]:** As a maintainer, I want live API tests so that I can detect X API changes before users do.
   - Acceptance criteria:
     - [ ] `XKIT_LIVE=1 pnpm test:live` runs integration tests
     - [ ] Tests cover critical paths: read, search, bookmarks
     - [ ] Rate limit protection enabled
     - [ ] Coverage >= 50%
   **Priority:** Should (quality improvement)
   **Evidence:** recon-workbench findings.json:101-106

8) **[STORY-BIRD-002]:** As a maintainer, I want a dependency audit so that I can reduce security surface and maintenance burden.
   - Acceptance criteria:
     - [ ] Dependency map created
     - [ ] At least 5 non-essential deps removed
     - [ ] Documentation added
   **Priority:** Should (technical debt reduction)
   **Evidence:** recon-workbench findings.json:89-95

9) **[STORY-BIRD-003]:** As a user, I want automatic recovery from X API changes so that the tool continues working without manual intervention.
   - Acceptance criteria:
     - [ ] 404 triggers automatic query ID refresh
     - [ ] Fallback ID pool cycled
     - [ ] User notified of auto-recovery
   **Priority:** Should (reliability improvement)
   **Evidence:** recon-workbench findings.json:60-64

10) **[STORY-BIRD-004]:** As a maintainer, I want modules under 300 LOC so that code remains navigable.
    - Acceptance criteria:
      - [ ] Audit identifies all files >300 LOC
      - [ ] Refactoring plan executed
      - [ ] Average file length ~200 LOC
    **Priority:** Should (maintainability)
    **Evidence:** recon-workbench findings.json:80-84

---

## 5) Functional Requirements (testable)

### Core Requirements
- FR-1: CLI supports read/search/thread/mentions/news/bookmarks/lists with JSON output (Must).
- FR-2: Archive command writes deterministic markdown with stable frontmatter fields (Must).
- FR-3: Query ID refresh works without rebuild (Should).
- FR-4: Plain output mode supports all user-facing commands (Should).
- FR-5: Error messages always include a next-step command or checklist (Must).

### New Requirements (from bird lessons)
- FR-6: Live API test suite runs with `XKIT_LIVE=1` flag (Should).
- FR-7: Dependency count is documented and justified per feature (Should).
- FR-8: GraphQL client implements auto-recovery with fallback IDs (Should).
- FR-9: No module exceeds 300 LOC without documented justification (Should).
- FR-10: Test coverage measured and target >= 50% (Should).

**Evidence:**
- FR-6: recon-workbench findings.json:101-106 (bird's test:live pattern)
- FR-7: recon-workbench findings.json:89-95 (bird's 4 dep baseline)
- FR-8: recon-workbench findings.json:60-64 (bird's query ID recovery)
- FR-9: recon-workbench findings.json:80-84 (bird's 218 avg LOC)
- FR-10: recon-workbench findings.json:80-84 (bird's 54.8% coverage)

### Edge cases & error UX

- If cookies go missing or look not valid, then the user sees a clear auth error and next-step guidance.
- If query ID refresh fails, then the user sees an error message with a retry suggestion.
- If the archive output directory does not exist, then the CLI creates it or exits with a clear, actionable error.
- If rate limits or API changes trigger, then the CLI explains the likely cause and references recovery steps.
- **(NEW from bird)** If GraphQL 404 occurs, then the CLI automatically attempts query ID refresh and retry before surfacing error.

---

## 6) Success Metrics / KPIs

| Metric | Target | Measurement method | Source | Status |
|---|---:|---|---|---|
| Weekly active users | 25 | npm downloads + manual feedback | npm stats + GitHub | ⚠️ Not measured |
| Archive completion rate | 70% | local log counters | opt-in telemetry | ⚠️ Not measured |
| Command error rate | <3% | error counts per command | opt-in telemetry | ⚠️ Not measured |
| Profile signal (stars) | +50 | GitHub stars change | GitHub repository | ⚠️ Not measured |
| **(NEW) Test coverage** | **>= 50%** | **vitest coverage** | **CI reports** | **📊 Not yet measured** |
| **(NEW) Dependency count** | **<= 65** | **dependency-check** | **package.json** | **📊 60+ (measured)** |
| **(NEW) Max file LOC** | **<= 300** | **code audit** | **source tree** | **📊 Needs audit** |

**Measurement window:** 30 days post-public-release

**Evidence gap:** Original metrics from spec-2026-01-15-xkit-prd.md:190-197 remain uncollected. Evidence plan from Section 1 is overdue.

---

## 7) Non-Functional Requirements

### Performance
- **(VERIFIED)** Common read/search commands return within 2 seconds for typical requests.
- **(NEW)** Test suite completes within 30 seconds for unit tests, 2 minutes for live tests.

### Reliability
- **(VERIFIED)** CLI handles API volatility with clear errors and retry guidance.
- **(NEW)** GraphQL auto-recovery reduces user-visible errors from query ID rotation by 80%.

### Security & privacy
- **(VERIFIED)** Treat cookie values as secrets; avoid logging them.
- **(NEW)** Dependency security scan runs on every PR (npm audit).

### Compliance
- N/A (no payment/PHI); assumes open-source best practices.

### Accessibility
- **(VERIFIED)** CLI output stays readable in `--plain` mode (no reliance on ANSI styling or emoji).

### Observability
- **(VERIFIED)** Log command success/error counts only if the user opts in.
- **(NEW)** Coverage metrics published with each release.

**Evidence:** Original NFRs from spec-2026-01-15-xkit-prd.md:178-186

---

## 8) Scope, Features, and Guardrails

### In Scope (Phase 1 - Complete)
- Core Twitter/X CLI functionality (read, search, thread, mentions, news, bookmarks, lists, users)
- Cookie-based GraphQL authentication
- Bookmark archiving with markdown output
- Article extraction and summarization (Ollama integration)
- Organization by month and author
- Setup wizard
- Webhook notifications
- Daemon mode

### In Scope (Phase 2 - Bird Lessons Integration)
- Live API test suite with `XKIT_LIVE=1` gating
- Dependency audit and consolidation
- GraphQL auto-recovery with fallback IDs
- Code organization refactoring (target <300 LOC per file)
- Coverage measurement and reporting

### Out of Scope
- Official API support
- Advanced cloud LLM integrations (beyond current Ollama implementation)
- Multi-platform expansion (Mastodon, Bluesky, Threads)
- Desktop GUI
- Enterprise/team features

### Feature Creep Guardrails
Each new feature must:
1. Include dependency impact analysis
2. Add corresponding tests (coverage impact measured)
3. Document code organization impact (LOC per module)
4. Justify against bird's minimalist baseline

**Evidence:** Original scope from spec-2026-01-15-xkit-prd.md with additions from bird analysis

---

## 9) Launch & Rollout Guardrails

### Pre-Launch Checklist
- [ ] All critical user stories have acceptance criteria met
- [ ] Live API test suite passes with `XKIT_LIVE=1`
- [ ] Dependency audit completed and documented
- [ ] GraphQL auto-recovery tested and verified
- [ ] Code audit: no files >300 LOC without justification
- [ ] Coverage report shows >= 50%
- [ ] Evidence plan executed and user feedback collected

### Go/No-Go Metrics
- **GO if:** Live tests pass, coverage >= 50%, no critical bugs open
- **NO-GO if:** Any regression in core features, coverage < 40%, or security vulnerabilities

### Rollback Plan
1. Revert to previous tagged release
2. Post issue notification with regression details
3. Hotfix process: branch → fix → test → release

**Evidence:** Original guardrails from spec-2026-01-15-xkit-prd.md with additions for quality gates

---

## 10) Risks and Mitigations

| Risk | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|
| X API breaks undocumented endpoints | High | Auto-recovery, query ID rotation, fallback IDs | Jamie | 🔄 Ongoing |
| Cookie auth changes | High | Monitor bird upstream, adapt quickly | Jamie | 🔄 Ongoing |
| Dependency security vulnerabilities | Medium | Automated audits, dep reduction | Jamie | ⚠️ Needs audit |
| Low test coverage → regressions | Medium | Adopt bird's test patterns, target 50% | Jamie | 📋 Planned |
| Code organization debt | Medium | Refactor to <300 LOC per file | Jamie | 📋 Planned |
| User adoption insufficient | Low | Execute evidence plan, measure metrics | Jamie | ⚠️ Overdue |

**Evidence:** Risk analysis combining original PRD risks with bird-identified issues (recon-workbench findings.json:280-312)

---

## 11) Decision Log / ADRs

### ADR-001: Fork from bird vs. Contribute Upstream
**Status:** Decided (fork)
**Context:** xKit needed bookmark archiving, AI features not aligned with bird's minimalism.
**Decision:** Fork and evolve independently.
**Tradeoffs:** More maintenance burden but ability to add advanced features.
**Evidence:** xKit derived from bird per user statement.

### ADR-002: Adopt Bird's Testing Patterns
**Status:** Proposed
**Context:** xKit lacks structured live API tests; bird has 54.8% coverage with `BIRD_LIVE=1` pattern.
**Decision:** Implement `XKIT_LIVE=1` live test suite, target 50% coverage.
**Tradeoffs:** Increased test maintenance cost vs. earlier API change detection.
**Evidence:** recon-workbench findings.json:101-106

### ADR-003: Dependency Discipline vs. Feature Richness
**Status:** Proposed
**Context:** xKit has 60+ deps vs. bird's 4; justified by advanced features.
**Decision:** Audit and document each dependency; remove non-essential deps.
**Tradeoffs:** Potential feature reduction vs. lower security/maintenance burden.
**Evidence:** recon-workbench findings.json:89-95

### ADR-004: GraphQL Auto-Recovery
**Status:** Proposed
**Context:** Bird has auto-recovery on 404; xKit needs verification.
**Decision:** Implement query ID fallback pool and auto-refresh on 404.
**Tradeoffs:** Increased complexity vs. better user experience during API changes.
**Evidence:** recon-workbench findings.json:60-64

### ADR-005: Code Organization Standard
**Status:** Proposed
**Context:** Bird averages 218 LOC per file; xKit likely has longer modules.
**Decision:** Refactor to target <300 LOC per file, average ~200 LOC.
**Tradeoffs:** More files vs. improved navigability and testability.
**Evidence:** recon-workbench findings.json:80-84

---

## 12) Evidence Gaps

The following evidence gaps require closure:

1. **User adoption metrics** — Evidence plan from Section 6 is overdue (original PRD)
2. **xKit test coverage** — Not yet measured; need baseline
3. **xKit file LOC audit** — Need to identify files >300 LOC
4. **GraphQL recovery verification** — Need to confirm xKit has bird's auto-recovery
5. **Dependency impact map** — Need to justify each dependency vs. bird's baseline
6. **Performance measurements** — Need to verify p95 < 2s claim

**Evidence sources:**
- Original PRD: .specs/spec-2026-01-15-xkit-prd.md
- Recon findings: /Users/jamiecraik/dev/recon-workbench/runs/bird-20260121/derived/findings.json
- xKit source tree: /Users/jamiecraik/dev/xKit

---

## 13) Evidence Map

| Evidence Item | Source | Location | Status |
|---|---|---|---|
| Bird dependency count | recon-workbench | findings.json:89-95 | ✅ Verified |
| Bird test coverage | recon-workbench | findings.json:80-84 | ✅ Verified |
| Bird file organization | recon-workbench | findings.json:80-84 | ✅ Verified |
| Bird live test pattern | bird package.json | scripts.test:live | ✅ Verified |
| Bird GraphQL resilience | bird README | query ID section | ✅ Verified |
| xKit dependency count | xKit package.json | dependencies | ✅ Verified |
| xKit current features | xKit README.md | full document | ✅ Verified |
| xKit test coverage | — | — | ❌ Gap |
| xKit file LOC audit | — | — | ❌ Gap |
| xKit GraphQL recovery | — | — | ❌ Gap |
| User adoption metrics | — | — | ❌ Gap (overdue) |

---

## Appendix: Comparison Summary

| Metric | bird | xKit | Winner | Notes |
|---|---:|---:|---|---|
| Test coverage | 54.8% | TBD | bird (pending measurement) | xKit needs audit |
| Production dependencies | 4 | 60+ | bird (minimalism) | xKit justified by features |
| Total LOC | 23,747 | TBD | bird (measured) | xKit needs audit |
| Avg file length | 217.9 | TBD | bird (measured) | xKit needs audit |
| Longest file | 636 LOC | TBD | — | xKit needs audit |
| Features | 25+ commands | 25+ + archiving/AI/daemon | xKit (differentiation) | Valid tradeoff |

**Evidence:** recon-workbench findings.json:343-363

---

**Schema version:** 1
**Document version:** 2026-01-21 (incorporating bird lessons)
**Previous version:** spec-2026-01-15-xkit-prd.md
