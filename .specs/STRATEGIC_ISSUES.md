# Strategic Issues Tracker

**Project:** xKit CLI + Bookmark Archiving
**Owner:** Jamie Craik
**Status:** ✅ Complete - All issues documented with resolution paths
**Last Updated:** 2026-01-19
**Source:** Third-Pass Adversarial Review (2026-01-19)

---

## Executive Summary

The third-pass adversarial review identified 10 significant issues, 6 of which were immediately fixed. This document tracks the 4 remaining issues that require broader strategic decisions and provides clear resolution paths for each.

**Status Summary:**
- ✅ 1 issue RESOLVED (Governance paradox - see GOVERNANCE.md)
- ⚠️ 1 issue PARTIALLY RESOLVED (Success metrics not actionable)
- ✅ 2 issues ACCEPTED (Diagram simplification, Non-goals categorization)
- ⏳ 1 issue IN PROGRESS (Evidence plan realism)

---

## Issue #1: Governance Paradox

**Status:** ✅ **RESOLVED**

**Source:** Third-Pass Review, Issue #8

**The Problem:**

The pause criteria state: "If after 30 days WAU < 10... pause and reassess"

**The Paradox:**
- Phase 1 proceeded WITHOUT user validation (9 features added beyond MVP)
- NOW we're saying Phase 2 must wait for validation
- This is **inconsistent governance**

**Severity:** CRITICAL

---

### Resolution

**Decision:** Option A - Acknowledge Phase 1 violated evidence-first principle

**Rationale:**
- Phase 1 governance failed
- Evidence-first principle was not followed
- Must acknowledge this to restore governance consistency

**Action Taken:**
- ✅ Created [GOVERNANCE.md](GOVERNANCE.md) documenting:
  - Governance evolution from build-first to evidence-first
  - Official position on Phase 1 governance gap
  - Current governance policy with clear rules
  - Decision-making framework (Type A/B/C decisions)
  - Accountability mechanisms

**Outcome:**
- Governance paradox resolved through explicit acknowledgment
- Future governance rules codified
- Phase 2 blocked until evidence validates demand
- Inconsiciency eliminated

**Reference:** [GOVERNANCE.md](GOVERNANCE.md) - Complete governance framework

---

## Issue #2: Success Metrics Not Actionable

**Status:** ⚠️ **PARTIALLY RESOLVED**

**Source:** Third-Pass Review, Additional Issue

**The Problem:**

Success metrics require "30 days post-public-release" but:
- Public release is 2026-02-01
- Measurement window starts then
- Earliest evaluation: 2026-03-03

**The Question:**

If metrics can't be evaluated for 6+ weeks, are they the right metrics?

**Severity:** MEDIUM-HIGH

---

### Partial Resolution

**Action Taken:**
- ✅ Added clarifying language to PRD Section 6:
  - "Measurement window has NOT started yet"
  - "Pause criteria requiring '30 days WAU' are not currently actionerable until after 2026-02-01 + 30 days = 2026-03-03"
  - "Success metrics cannot be evaluated until after public release"

**Remaining Gap:**

We have success criteria that cannot currently be used for decision-making.

---

### Proposed Resolution Path

**Option A: Add Pre-Release Success Criteria**

Add Phase 1 specific success criteria that CAN be evaluated now:

| Criterion | Target | Measurement Method |
|-----------|--------|-------------------|
| All acceptance criteria met | 100% | Checkbox review |
| Security review complete | PASS | [Security Assessment](SECURITY_ASSESSMENT-2026-01-19.md) |
| Performance benchmarks met | p95 <= 2s | Run performance tests |
| Test coverage maintained | >80% | Test suite |
| Documentation complete | All sections | Documentation review |

**Pros:**
- Provides actionable criteria for current phase
- Separates pre-release technical completion from post-release adoption metrics

**Cons:**
- Doesn't address adoption metrics
- Could create two-tier success definition

**Recommendation:** IMPLEMENT - Add "Pre-Release Success Criteria" section to PRD

---

**Option B: Shift Metrics Timeline**

Move 30-day measurement window to start from evidence plan execution (2026-01-21), not public release (2026-02-01).

**Pros:**
- Makes metrics actionable sooner
- Aligns with evidence validation timeline

**Cons:**
- Public release hasn't happened yet - measuring what?
- Could confuse "public" vs "private" usage

**Recommendation:** REJECT - Doesn't make logical sense

---

**Option C: Accept as Designed**

Document this as a known limitation and proceed.

**Rationale:**
- Pre-release is about technical completion
- Post-release is about adoption validation
- It's okay to have different success criteria for different phases

**Pros:**
- Honest about current state
- No false metrics

**Cons:**
- Leaves a gap where success can't be measured

**Recommendation:** ACCEPT with Option A - Add pre-release criteria, keep post-release metrics as-is

---

**Status:** Awaiting decision on Option A

**Owner:** Jamie Craik
**Due:** 2026-01-25 (before go/no-go decision)

---

## Issue #3: Diagram Simplification

**Status:** ✅ **ACCEPTED**

**Source:** Third-Pass Review, Issue #9

**The Problem:**

User journey diagram doesn't show Phase 1 components (ArticleExtractor, OllamaClient).

**Severity:** LOW

---

### Resolution

**Decision:** Accept as intentional simplification

**Rationale:**
- Diagrams showing every component become unreadable
- Current diagram shows user-visible flow, not internal implementation
- Tech Spec has detailed architecture diagrams with all components
- User journey diagrams should remain simple and focused on user experience

**Action Taken:**
- ✅ Add note to PRD Section 11: "This diagram shows the user-visible flow. Phase 1 added ArticleExtractor and OllamaClient components (see Tech Spec Section 3 for detailed architecture)."

**Outcome:**
- Clarified that diagram is intentionally simplified
- Cross-reference to Tech Spec for detailed architecture
- No changes needed to diagrams

**Reference:** [PRD Section 11: Diagrams](spec-2026-01-15-xkit-prd.md#11-diagrams-recommended)

---

## Issue #4: Non-Goals Categorization

**Status:** ✅ **ACCEPTED**

**Source:** Third-Pass Review, Issue #10

**The Problem:**

Tech Spec lists "Advanced cloud LLM integrations" in Non-Goals, but local LLM is already implemented.

**Severity:** LOW

---

### Resolution

**Decision:** Accept as stylistically valid

**Rationale:**
- Non-Goals can include:
  - Things we won't do (cloud LLMs)
  - Things we did do in a specific way (local LLM only, not cloud)
- The distinction between local and cloud LLMs is clear
- Current text is accurate: "local AI (Ollama) implemented in Phase 1, but cloud integrations remain out of scope"

**Action Taken:**
- ✅ No changes needed - current language is clear

**Outcome:**
- Non-Goals categorization validated as acceptable
- Local vs cloud distinction is clear
- No ambiguity remains

**Reference:** [Tech Spec Section 2: Non-Goals](tech-spec-2026-01-15-xkit.md#2-goals-and-non-goals)

---

## Issue #5: Evidence Plan Realism

**Status:** ⏳ **IN PROGRESS**

**Source:** Third-Pass Review, Remaining Concern #3

**The Problem:**

The evidence plan targets (Codex feed posts, etc.) seem like they should have been done BEFORE Phase 1 implementation.

**The Question:**

Is it realistic to think we can get user feedback on features we haven't released?

**Severity:** MEDIUM

---

### Analysis

**The Contradiction:**
- Evidence plan targets: Get feedback on Phase 1 features
- Challenge: Features aren't publicly released yet
- Question: How do we get feedback on unreleased features?

**Possible Approaches:**

1. **Alpha/Beta Testing Approach**
   - Recruit private beta testers
   - Provide early access to Phase 1 features
   - Collect feedback in controlled environment
   - Use feedback to validate before public release

2. **Cold Announcement Approach**
   - Announce features publicly before release
   - Ask for interest/feedback based on descriptions
   - Use engagement as proxy for demand
   - Risk: Feedback may not be based on actual usage

3. **Release-First Approach**
   - Release publicly first
   - Collect feedback from actual users
   - Validate post-release
   - Risk: Violates evidence-first principle

---

### Resolution Path

**Decision:** Shift to Alpha/Beta Testing Approach

**Rationale:**
- Allows feedback based on actual usage
- Validates features before public release
- Maintains evidence-first principle
- More realistic than cold announcements

**Action Plan:**

1. **Revise Evidence Plan** (2026-01-20)
   - Add alpha/beta tester recruitment
   - Target: 3-5 beta testers
   - Provide early access via GitHub

2. **Execute Beta Testing** (2026-01-21 - 2026-01-25)
   - Onboard 3-5 beta testers
   - Provide installation instructions
   - Collect feedback via GitHub issues

3. **Evaluate Evidence** (2026-01-26 - 2026-01-28)
   - Review beta tester feedback
   - Make go/no-go decision for public release
   - Document findings

4. **Public Release** (2026-02-01, conditional)
   - Only if beta feedback is positive
   - Incorporate beta feedback into release
   - Acknowledge beta testers in release notes

**Success Signals (Revised):**
- >= 3 beta testers onboarded
- >= 2 testers provide substantive feedback
- No critical bugs found
- At least 1 testimonial from beta tester

---

### Status Updates

**2026-01-19:** Issue documented, alpha/beta approach decided

**Next Update:** 2026-01-20 after evidence plan revised

**Owner:** Jamie Craik

**Due:** 2026-01-28 (beta feedback evaluation)

---

## Issue Status Summary

| Issue | Status | Severity | Resolution | Owner |
|-------|--------|----------|------------|-------|
| #1: Governance paradox | ✅ RESOLVED | CRITICAL | See GOVERNANCE.md | Jamie |
| #2: Success metrics not actionable | ⚠️ PARTIALLY | MEDIUM-HIGH | Awaiting decision on Option A | Jamie |
| #3: Diagram simplification | ✅ ACCEPTED | LOW | Intentional simplification | N/A |
| #4: Non-goals categorization | ✅ ACCEPTED | LOW | Stylistically valid | N/A |
| #5: Evidence plan realism | ⏳ IN PROGRESS | MEDIUM | Alpha/beta testing approach | Jamie |

---

## Decision Log

| Date | Issue | Decision | Rationale |
|------|-------|----------|-----------|
| 2026-01-19 | #1 | Governance paradox resolved via GOVERNANCE.md | Acknowledge Phase 1 failure, establish evidence-first for future |
| 2026-01-19 | #3 | Accept diagram simplification | User-visible flow vs internal implementation distinction |
| 2026-01-19 | #4 | Accept non-goals categorization | Local vs cloud LLM distinction is clear |
| 2026-01-19 | #5 | Shift to alpha/beta testing | More realistic than cold announcements |
| TBD | #2 | TBD | Awaiting decision on pre-release success criteria |

---

## Dependencies

**Issue #2 blocks:**
- Go/no-go decision for 2026-02-01 release
- Clear definition of "success" for Phase 1

**Issue #5 blocks:**
- Evidence plan execution
- Beta tester recruitment
- Public release decision

**Issues #1, #3, #4:**
- Resolved, no blocking effect

---

## Next Steps

### Immediate (This Week - 2026-01-19 to 2026-01-25)

1. **Issue #5: Evidence Plan**
   - [ ] Revise evidence plan to include alpha/beta testing
   - [ ] Recruit 3-5 beta testers via GitHub Discussions
   - [ ] Onboard testers and collect feedback

2. **Issue #2: Success Metrics**
   - [ ] Decide on Option A (add pre-release criteria)
   - [ ] Update PRD with pre-release success criteria
   - [ ] Define clear "technical completion" metrics

### Short-term (Next Week - 2026-01-26 to 2026-02-01)

3. **Evaluate Evidence**
   - [ ] Review beta tester feedback
   - [ ] Make go/no-go decision for public release
   - [ ] Update all tracking documents

### Pre-Release (2026-02-01)

4. **Release Decision**
   - [ ] Confirm all success criteria met
   - [ ] Address any remaining issues
   - [ ] Publish release notes

---

## Related Documents

- [Third-Pass Review Summary](THIRD_PASS_SUMMARY-2026-01-19.md) - Source of all issues
- [Governance Framework](GOVERNANCE.md) - Resolution for Issue #1
- [Evidence Plan Tracking](EVIDENCE_PLAN_TRACKING.md) - Execution for Issue #5
- [PRD Section 6: Success Metrics](spec-2026-01-15-xkit-prd.md#6-success-metrics--kpis) - Issue #2 context

---

**Last Updated:** 2026-01-19
**Next Review:** 2026-01-25 (after evidence plan execution)
**Status:** ✅ All issues documented with resolution paths
