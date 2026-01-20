# Architecture Decision Records (ADRs)

**Repository:** xKit
**Status:** Active
**Last Updated:** 2026-01-20

---

## Overview

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions for the xKit Enhanced Knowledge Transformation System. ADRs provide historical context, rationale, and consequences for decisions, preventing "architecture by accretion" and repeated debates.

**What is an ADR?**
An ADR is a short document that describes an architectural decision, its context, rationale, and consequences. Unlike design docs, ADRs are:
- **Historical:** Record decisions as they are made
- **Immutable:** Once accepted, decisions are not edited (use new ADR for reversions)
- **Concise:** Focus on single decisions (not entire architectures)

**Why ADRs Matter:**
- **Onboarding:** New contributors understand *why* the system is built this way
- **Consistency:** Prevent revisiting settled decisions repeatedly
- **Accountability:** Clear record of who decided what and when
- **Learning:** Document tradeoffs and lessons learned

---

## ADR Index

| ID | Title | Status | Date | Topic |
|----|-------|--------|------|-------|
| [ADR-001](ADR-001-tagged-prompt-structure.md) | Use Tagged Prompt Structure from Summarize | Accepted | 2026-01-20 | Prompt Engineering |
| [ADR-002](ADR-002-local-ollama-default.md) | Default to Local Ollama vs Paid APIs | Accepted | 2026-01-20 | Infrastructure |
| [ADR-003](ADR-003-manual-skills-approval.md) | Manual Approval Required for Generated Skills | Accepted | 2026-01-20 | Security, UX |
| [ADR-004](ADR-004-sqlite-caching-foundation.md) | SQLite Caching Before Features | Accepted | 2026-01-20 | Performance, Reliability |
| [ADR-005](ADR-005-user-research-before-features.md) | User Research Before Skills/Learning Materials | Accepted | 2026-01-20 | Product Strategy |

---

## ADR Summaries

### ADR-001: Use Tagged Prompt Structure from Summarize

**Decision:** Adopt Summarize's XML-style tagged prompts (`<instructions>`, `<context>`, `<content>`) for all LLM interactions in xKit.

**Rationale:**
- Production-validated pattern (Summarize has 200+ tests)
- Clear separation of concerns enables flexible composition
- Supports 245+ combinations (5 lengths × 7 personas × 7 content types)
- Easy to extend for future features (Skills, learning materials)

**Security Protection:**
- Implements `escapeXmlTags()` function to sanitize malicious content
- Prevents prompt injection attacks via XML tag manipulation

**Consequences:**
- ✅ Maintainable: Clear structure, easy to update personas/lengths/content-types
- ✅ Extensible: Supports custom templates, future features
- ✅ Quality: Structured prompts reduce LLM ambiguity
- ⚠️ Verbosity: More verbose than simple prompts (acceptable tradeoff)
- ⚠️ Complexity: More moving parts (mitigated by CLI UX)

**Impact:** Critical for all LLM-based features (enhanced summarization, Skills, learning materials).

---

### ADR-002: Default to Local Ollama vs Paid APIs

**Decision:** Default to local Ollama with `nomic-embed-text`, support paid APIs via `--model` flag.

**Rationale:**
- **Zero cost:** Local models are free (Ollama is open-source)
- **Privacy-first:** Data never leaves user's machine
- **No rate limits:** Process 100+ bookmarks without throttling
- **Aligned with xKit:** Existing infrastructure already uses Ollama

**Cost Model:**
- **Local Ollama:** $0 (hardware amortization)
- **Paid APIs:** ~$0.001 per bookmark = $1 per 1,000 bookmarks
- **With Skills/Learning:** ~$5-10 per 1,000 bookmarks (3-5× more tokens)
- **Guardrails:** `--max-llm-spend` with confirmation, cost estimates before running

**Consequences:**
- ✅ Zero default cost (users can run for free)
- ✅ Privacy (no data sent to external APIs)
- ✅ Flexibility (power users can opt-in to paid APIs)
- ⚠️ Slower performance (5-30s local vs 1-5s paid API)
- ⚠️ Hardware requirements (8GB RAM minimum)

**Impact:** Enables all LLM-based features without cost barrier for most users.

---

### ADR-003: Manual Approval Required for Generated Skills

**Decision:** Two-stage workflow: generate to `.claude/skills-review/`, manual approval before `.claude/skills/`.

**Rationale:**
- **Safety first:** Prevents unsafe code from being used in production
- **User trust:** Reviewed Skills are more trusted
- **Legal protection:** Disclaimer demonstrates due diligence
- **Quality control:** Manual review catches what LLM misses

**Workflow:**
```bash
# Stage 1: Generate
xkit generate-skills --category github --min-confidence 0.7
# → .claude/skills-review/

# Stage 2: Review & Approve
mv .claude/skills-review/good-skill.md .claude/skills/
rm .claude/skills-review/bad-skill.md
```

**Consequences:**
- ✅ Safety (vulnerable code caught before production)
- ✅ Trust (users trust reviewed Skills more)
- ✅ Quality (≥ 80% precision target via manual audit)
- ⚠️ Friction (extra step reduces usage)
- ⚠️ Time investment (5-10 min review per Skill)

**Impact:** Critical for Skill Generation feature (Phase 2), prevents security incidents.

---

### ADR-004: SQLite Caching Before Features

**Decision:** Implement Phase 0 (Foundation) with SQLite caching, observability, and security before adding features.

**Rationale:**
- **You can't measure what you can't observe:** Need metrics to validate success
- **Technical debt is expensive:** Fixing 36 ERROR findings after features = 10× more work
- **Evidence from Summarize:** Cache eliminates 60%+ redundant API calls

**Implementation:**
- **SQLite cache:** 512MB cap, 30-day TTL, LRU eviction
- **Observability:** pino logging, metrics collection (latency, error rate, token usage)
- **Security:** `escapeXmlTags()`, template validation, audit logging

**Performance Targets:**
- **Cache hit rate:** ≥ 60% on second run
- **Speedup:** 2.5× faster re-runs (60% fewer LLM calls)
- **Cost savings:** 60% reduction (for paid APIs)

**Consequences:**
- ✅ Measurable success (can track quality, latency, costs)
- ✅ Faster re-runs (cache eliminates redundant API calls)
- ✅ Better debugging (structured logging, metrics)
- ⚠️ 3-day delay (features delayed, but worth it)
- ⚠️ Added complexity (more code to maintain)

**Impact:** Foundation for all features, prerequisite for measuring success criteria.

---

### ADR-005: User Research Before Skills/Learning Materials

**Decision:** Add Phase 1A (User Research, 3 days) with go/no-go criteria before building Phases 2-3.

**Rationale:**
- **Risk mitigation:** 3 days research vs 10+ days wasted on unwanted features
- **Evidence-based:** No current evidence users want Skills or learning materials
- **Feature prioritization:** Focus on high-value features, skip low-value

**Go/No-Go Criteria:**
| Feature | Interest Target | Would-Use Target | Decision |
|---------|----------------|------------------|----------|
| Enhanced Summarization | ≥ 3.5/5.0 | ≥ 70% | Must pass (blocking) |
| Skill Generation | ≥ 3.0/5.0 | ≥ 50% | Optional (can skip) |
| Learning Materials | ≥ 3.0/5.0 | ≥ 50% | Optional (can skip) |

**Consequences:**
- ✅ Risk reduction (avoid building unwanted features)
- ✅ Better product-market fit (features users actually want)
- ✅ Resource efficiency (3 days research vs 10+ days building)
- ⚠️ 3-day delay (features delayed)
- ⚠️ Effort required (recruiting, interviews, analysis)

**Impact:** Determines whether Phase 2 (Skills) and Phase 3 (Learning Materials) are built.

---

## ADR Template

When creating a new ADR, use the [ADR template](../.claude/skills/product-spec/references/ADR_TEMPLATE.md):

```markdown
# ADR-XXX: <Decision Title>

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Owner:** <name>
**Deciders:** <names>
**Consulted:** <names>
**Informed:** <names>
**Related:** PRD | Tech Spec | Issue | RFC | Incident

---

## Context
What problem are we solving? What constraints matter?

---

## Decision
What did we decide? Be specific.

---

## Rationale
Why this choice? Include the key tradeoffs.

---

## Alternatives considered
- Alternative A: <summary> — why not chosen
- Alternative B: <summary> — why not chosen

---

## Consequences
### Positive
- <bullet>

### Negative
- <bullet>

### Follow-ups / Action items
- [ ] <task> (Owner: <name>, Due: YYYY-MM-DD)

---

## Notes
Any implementation notes, links, or diagrams.
```

---

## ADR Lifecycle

**Status Definitions:**
- **Proposed:** Draft ADR under discussion
- **Accepted:** Decision made, implementation in progress
- **Deprecated:** Decision still valid but replaced by better approach
- **Superseded:** Decision replaced by new ADR (reference new ADR)

**Creating a New ADR:**
1. Copy ADR template to `.docs/adr/ADR-XXX-title.md`
2. Fill in all sections (Context, Decision, Rationale, etc.)
3. Link to related PRD/tech spec/issues
4. Get approval from deciders
5. Update this index

**Updating an ADR:**
- **NEVER edit accepted ADRs** (they are historical records)
- If decision changes, create new ADR with `Supersededed: ADR-XXX`
- Update status of old ADR to `Superseded`

**Example Supersession:**
```markdown
# ADR-006: Use Paid APIs as Default

**Status:** Accepted
**Date:** 2026-02-15
**Supersedes:** ADR-002 (Local Ollama Default)

## Context
[...]
```

---

## Related Documentation

**Product Requirements:**
- [Enhanced Knowledge Transformation PRD](../../.spec/spec-2026-01-20-ai-knowledge-transformation.md)

**Feature Analysis:**
- [Summarize Feature Analysis](../../.spec/spec-2026-01-20-summarize-feature-analysis.md)

**Reviews:**
- [Adversarial Review Output](../../.claude/plans/adversarial-review-output.md)

**Implementation Guides:**
- [Phase 0: Foundation](../../.spec/spec-2026-01-20-ai-knowledge-transformation.md#phase-0-foundation-days-1-3---new)
- [Phase 1A: User Research](../../.spec/spec-2026-01-20-ai-knowledge-transformation.md#phase-1a-user-research-days-4-6---new)

---

## Statistics

**Total ADRs:** 5
**Accepted:** 5
**Proposed:** 0
**Deprecated:** 0
**Superseded:** 0

**By Topic:**
- Prompt Engineering: 1 (ADR-001)
- Infrastructure: 1 (ADR-002)
- Security: 1 (ADR-003)
- Performance: 1 (ADR-004)
- Product Strategy: 1 (ADR-005)

---

## Changelog

**2026-01-20:** Created initial ADR index with 5 ADRs from Enhanced Knowledge Transformation system.

---

**Maintained by:** @jamiecraik
**Last Reviewed:** 2026-01-20
