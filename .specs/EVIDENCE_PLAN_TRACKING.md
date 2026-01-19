# Evidence Plan Tracking

**Project:** xKit CLI + Bookmark Archiving
**Owner:** Jamie Craik
**Status:** ⚠️ **OVERDUE** - Recovery Timeline Active
**Original Due Date:** 2026-01-18
**Current Date:** 2026-01-19
**Recovery Target:** Complete all evidence actions by 2026-01-25

---

## Executive Summary

The evidence plan was scheduled to execute on 2026-01-18 but was not started. This document tracks the recovery timeline and progress toward validating demand before Phase 2 development.

**Why This Matters:**
- Phase 1 added 3 features without user validation (violates evidence-first principle)
- Phase 2 is blocked until demand is validated
- Governance framework now requires evidence BEFORE implementation

**Recovery Plan:**
- Shift target dates by 3 days
- Execute all evidence actions by 2026-01-25
- Make go/no-go decision on 2026-01-26

---

## Evidence Actions Matrix

| Action | Channel | Original Target | Recovery Target | Status | Success Signal |
|--------|---------|-----------------|-----------------|--------|----------------|
| Codex feed post + demo clip | Codex Feed | 2026-01-18 | 2026-01-21 | ⏳ Not Started | >= 5 replies OR >= 3 GitHub stars |
| Swift feed post + demo clip | Swift Feed | 2026-01-20 | 2026-01-23 | ⏳ Not Started | >= 5 replies OR >= 3 GitHub stars |
| GitHub Discussions tester recruitment | GitHub Discussions | 2026-01-22 | 2026-01-25 | ⏳ Not Started | >= 3 testers commit |
| Testimonial collection | GitHub Issues/Discussions | 2026-01-25 | 2026-01-28 | ⏳ Not Started | >= 3 usable quotes |

### Action Details

#### Action 1: Codex Feed Post

**Goal:** Announce xKit v0.7.0 to Codex community and gather feedback.

**Target Audience:** Solo developers interested in CLI tools and automation.

**Content Requirements:**
- Brief description of xKit's value proposition
- Demo clip showing bookmark archiving workflow
- Call to action: try the tool, leave feedback
- Link to GitHub repository

**Success Signals:**
- Primary: >= 5 replies with substance (questions, feedback, interest)
- Secondary: >= 3 GitHub stars from Codex community members
- Tertiary: Any bug reports or feature requests (indicates usage)

**Recovery Date:** 2026-01-21

**Status:** ⏳ Not Started

---

#### Action 2: Swift Feed Post

**Goal:** Announce xKit v0.7.0 to Swift community and gather feedback.

**Target Audience:** Swift developers interested in developer tools.

**Content Requirements:**
- Same as Codex post, adapted for Swift context
- Emphasize CLI development patterns

**Success Signals:**
- Primary: >= 5 replies with substance
- Secondary: >= 3 GitHub stars from Swift community members
- Tertiary: Any bug reports or feature requests

**Recovery Date:** 2026-01-23

**Status:** ⏳ Not Started

---

#### Action 3: GitHub Discussions Tester Recruitment

**Goal:** Recruit 3 active testers for hands-on feedback.

**Target Audience:** Users interested in bookmark management and knowledge base workflows.

**Content Requirements:**
- Clear call for testers
- Description of testing commitment (minimal)
- Link to issues/discussions for feedback
- Incentive: shape product direction

**Success Signals:**
- Primary: >= 3 users commit to testing
- Secondary: Testers provide actionable feedback
- Tertiary: Testers become ongoing contributors

**Recovery Date:** 2026-01-25

**Status:** ⏳ Not Started

---

#### Action 4: Testimonial Collection

**Goal:** Collect 3+ user testimonials for social proof.

**Target Audience:** Users who have tried xKit (from Actions 1-3).

**Content Requirements:**
- Reach out to testers via GitHub issues
- Ask specific questions: What worked well? What needs improvement?
- Request permission to quote in README/docs

**Success Signals:**
- Primary: >= 3 usable testimonials
- Secondary: Testimonials cover different use cases
- Tertiary: Any constructive criticism (useful for roadmap)

**Recovery Date:** 2026-01-28

**Status:** ⏳ Not Started

---

## Success Signal Definitions

### Feed Post Success (Codex/Swift)

**What Counts as Success:**

| Signal | Threshold | Why It Matters |
|--------|-----------|----------------|
| Replies with substance | >= 5 | Indicates genuine interest, not just views |
| GitHub stars | >= 3 | Demonstrates intent to use/follow |
| Bug reports | Any | Shows someone actually installed and tried it |
| Feature requests | Any | Validates demand and guides roadmap |

**What Does NOT Count as Success:**
- Emoji reactions without replies (low signal)
- "Looks cool" with no follow-up (polite, low intent)
- Views without engagement (cannot measure accurately)

### Tester Recruitment Success

**What Counts as Success:**

| Signal | Threshold | Why It Matters |
|--------|-----------|----------------|
| Tester commits | >= 3 | Need diverse feedback |
| Testers provide feedback | >= 2 | Some may test but not report |
| Testers find bugs | Any | Real-world usage uncovers issues |

**What Does NOT Count as Success:**
- "I'll try it later" without commitment
- Single-word affirmations without testing
- Testers who never report back

### Testimonial Success

**What Counts as Success:**

| Signal | Threshold | Why It Matters |
|--------|-----------|----------------|
| Usable testimonials | >= 3 | Social proof for README |
| Different use cases | >= 2 | Shows broad applicability |
| Constructive criticism | Any | Improves product |

**What Does NOT Count as Success:**
- Vague praise without specifics
- Testimonials that don't mention what they liked
- Feedback that's just bug reports (not testimonials)

---

## Metrics Dashboard

### Current Metrics (All Pre-Release)

| Metric | Target | Current | Source | Status |
|--------|--------|---------|--------|--------|
| Weekly Active Users (WAU) | 25 | UNKNOWN | Not yet measurable | ⏳ Pre-release |
| Archive Completion Rate | 70% | UNKNOWN | Not yet measurable | ⏳ Pre-release |
| Command Error Rate | <3% | UNKNOWN | Not yet measurable | ⏳ Pre-release |
| GitHub Stars | +50 | Baseline not set | GitHub | ⏳ Pre-release |
| Feed Post Replies | >= 5 per post | 0 | Codex/Swift feeds | ❌ Not started |
| Tester Commitments | >= 3 | 0 | GitHub Discussions | ❌ Not started |
| Testimonials Collected | >= 3 | 0 | GitHub Issues | ❌ Not started |

### Metrics Timeline

**Week 1 (Jan 19-25):**
- Execute evidence actions (feed posts, discussions)
- Begin collecting metrics

**Week 2 (Jan 26 - Feb 1):**
- Collect testimonials
- Evaluate early signals
- Make go/no-go decision for release

**Post-Release (Feb 1 - Mar 3):**
- Track WAU, completion rate, error rate
- Evaluate against success metrics
- Pause criteria become evaluable 2026-03-03

---

## Daily Update Template

Use this template to track daily progress. Copy and add new entries at the top.

### 2026-01-DD

**Evidence Actions Progress:**
- [ ] Codex feed post (Target: 2026-01-21)
- [ ] Swift feed post (Target: 2026-01-23)
- [ ] GitHub Discussions tester recruitment (Target: 2026-01-25)
- [ ] Testimonial collection (Target: 2026-01-28)

**Metrics Collected:**
- Feed post views/replies: _
- GitHub stars: _
- Tester commitments: _
- Testimonials: _

**Blockers:**
- None / [Describe]

**Tomorrow's Priority:**
- [Next action]

---

### 2026-01-19 (Day 1 - Recovery Plan Initiated)

**Evidence Actions Progress:**
- [x] Recovery plan documented
- [x] Target dates shifted (+3 days)
- [x] Tracking document created
- [ ] Codex feed post drafted
- [ ] Swift feed post drafted

**Metrics Collected:**
- Feed post views/replies: 0 (not started)
- GitHub stars: 0 (baseline not set)
- Tester commitments: 0
- Testimonials: 0

**Blockers:**
- None - execution bottleneck

**Tomorrow's Priority:**
- Draft feed posts for Codex and Swift
- Prepare demo clip for posts
- Schedule post times

---

## Community Engagement Log

Use this section to track all community interactions and feedback.

### Feed Posts

| Date | Channel | Post Link | Replies | Stars | Notes |
|------|---------|-----------|---------|-------|-------|
| - | - | - | - | - | None yet |

### Testers

| Date | GitHub Handle | Commitment | Feedback Provided | Status |
|------|---------------|------------|-------------------|--------|
| - | - | - | - | None yet |

### Testimonials

| Date | Source | Quote | Permission | Used In |
|------|--------|-------|------------|---------|
| - | - | - | - | None yet |

---

## Go/No-Go Decision Framework

After evidence actions complete (2026-01-28), make decision based on:

### Green Light (Proceed to Release)

**Criteria:**
- At least 2 feed posts meet success signal thresholds
- At least 2 testers commit and provide feedback
- At least 1 testimonial collected (even if only 3 total)
- No critical bugs discovered that block release

**Action:** Proceed with 2026-02-01 release

---

### Yellow Light (Proceed with Caution)

**Criteria:**
- Only 1 feed post meets success signals
- Only 1 tester commits
- No testimonials yet
- Minor bugs discovered that can be documented

**Action:** Proceed with release but:
- Add "Alpha" or "Beta" designation
- Document known limitations prominently
- Continue evidence collection post-release
- Re-evaluate after 30 days

---

### Red Light (Pause and Reassess)

**Criteria:**
- No feed posts meet success signals
- No testers commit
- Critical bugs discovered
- Overwhelming negative feedback

**Action:**
- Do NOT proceed with public release
- Address feedback and bugs
- Consider pivoting direction or pausing project
- Revisit pause criteria

---

## Recovery Timeline Summary

**Day 1 (2026-01-19):** ✅ Complete
- Create tracking document
- Establish recovery timeline

**Day 2-3 (2026-01-20-21):**
- Draft feed posts
- Prepare demo clip
- Post to Codex feed (2026-01-21)

**Day 4-5 (2026-01-22-23):**
- Post to Swift feed (2026-01-23)
- Monitor engagement
- Prepare GitHub Discussions post

**Day 6-7 (2026-01-24-25):**
- Post to GitHub Discussions (2026-01-25)
- Begin tester outreach
- Collect early feedback

**Day 8-10 (2026-01-26-28):**
- Collect testimonials
- Evaluate all evidence
- Make go/no-go decision

**Day 11 (2026-01-29):**
- Final decision communicated
- Either proceed with release or pause and reassess

---

## Accountability

**Owner:** Jamie Craik
**Daily Updates Required:** Yes (see Daily Update Template above)
**Transparency:** All metrics and feedback will be logged in this document
**Decision Date:** 2026-01-28

---

## Related Documents

- [PRD Section 1: Evidence Plan](spec-2026-01-15-xkit-prd.md#1-problem--opportunity-with-evidence) - Original evidence plan
- [Governance Framework](GOVERNANCE.md) - Decision-making rules
- [Strategic Issues](STRATEGIC_ISSUES.md#issue-5-evidence-plan-realism) - Issue #5 details

---

**Last Updated:** 2026-01-19
**Next Update:** 2026-01-20 (end of day)
**Status:** ⚠️ OVERDUE - Recovery timeline active
