# ADR-005: User Research Before Skills/Learning Materials

**Status:** Accepted
**Date:** 2026-01-20
**Owner:** @jamiecraik
**Deciders:** @jamiecraik
**Consulted:** Product Management Community, UX Researchers
**Informed:** xKit Users
**Related:** PRD (Section: Phase 1A: User Research), Adversarial Review

---

## Context

### Problem Statement
The original AI Knowledge Transformation plan included 4 major features:
1. **Enhanced Summarization** (5 length levels, 7 personas, 7 content types)
2. **Skill Generation** (extract reusable patterns from bookmarks)
3. **Learning Materials** (study guides, flashcards, quizzes)
4. **Custom Templates** (domain-specific prompt templates)

**The Assumption:** Users want all 4 features.

**The Risk:** Build features nobody uses (wasted effort, opportunity cost).

### Constraints
- **Time:** 3 days allocated for "Phase 1A: User Research"
- **Resources:** Can interview n=10-15 users
- **Budget:** Zero budget (users are volunteers, community members)
- **Timeline:** Research must complete before Phase 2 (Skills) and Phase 3 (Learning Materials)

### Evidence from Adversarial Review

[Adversarial review](/Users/jamiecraik/.claude/plans/adversarial-review-output.md) identified:

**PM Finding 1: No Measurable Success Criteria**
- **Issue:** No evidence users want Skills or learning materials
- **Impact:** Risk building features nobody uses
- **Required:** Conduct user interviews (n=10-15) to validate demand

**PM Finding 4: Unrealistic Timeline**
- **Issue:** 11 days for 4 major features with no validation
- **Impact:** High risk of burnout, abandoned work
- **Required:** Re-estimate with research buffer (+3 days)

**PM Finding 5: Missing Feature Prioritization**
- **Issue:** Plan treats all 4 phases as equal priority
- **Impact:** Might build low-value features first
- **Required:** Define go/no-go criteria for each phase

**Key Question:** Do users actually want Skills and learning materials, or should we focus only on enhanced summarization?

---

## Decision

**Add Phase 1A (User Research, 3 days) before building Phases 2-3, with go/no-go criteria.**

### Implementation

**Phase 1A: User Research (Days 4-6)**

**Day 1: Interview Guide Development**
```typescript
// Interview Questions (structured)

// Section 1: Current Workflow (5 min)
"Walk me through your current bookmark workflow on Twitter/X."
"How often do you revisit saved bookmarks?"
"What tools do you use to manage bookmarks (xKit, Notion, Raindrop, etc.)?"

// Section 2: Pain Points (5 min)
"What frustrates you about your current bookmark workflow?"
"Have you ever forgotten why you saved a bookmark?"
"Do you feel like you're getting value from your bookmarks?"

// Section 3: Enhanced Summarization (10 min)
[Show mockup of enhanced summary with persona/length options]
"Would this be useful to you? Why or why not?"
"Which persona interests you most (curious-learner, technical-researcher, etc.)?"
"Which length would you use most often (short, medium, long, etc.)?"
"How would this change your bookmark workflow?"

// Section 4: Skill Generation (10 min)
[Show mockup of generated Skill from GitHub repo]
"Would this be useful to you? Why or why not?"
"How often would you extract Skills from bookmarks?"
"Would you trust auto-generated Skills? What would make you trust them more?"
"Would you review Skills before using them, or expect them to be perfect?"

// Section 5: Learning Materials (10 min)
[Show mockup of study guide/flashcards from tutorial]
"Would this be useful to you? Why or why not?"
"Do you use study guides or flashcards currently?"
"How would this change your learning workflow?"
"Would you pay for this feature? (If it required paid APIs)"

// Section 6: Prioritization (5 min)
"Rank these features from most to least valuable:
 1. Enhanced Summarization
 2. Skill Generation
 3. Learning Materials
 4. Custom Templates
"
"What's the minimum viable set of features you'd use?"

// Section 7: Demographics (2 min)
"Role: (engineer, PM, student, etc.)"
"Years of experience: (0-2, 3-5, 6-10, 10+)"
"How many bookmarks do you save per week? (0-10, 10-50, 50+)"
```

**Day 2-3: User Interviews**

**Recruitment:**
- **Target:** 10-15 users
- **Sources:** GitHub issues, Discord community, Twitter/X followers
- **Incentive:** Early access to features, shoutout in credits

**Interview Format:**
- **Duration:** 30-45 minutes
- **Format:** Video call (Zoom, Google Meet) or async (Typeform, Google Form)
- **Recording:** Ask permission (for reference, not public sharing)

**Data Collection:**
```typescript
interface UserInterview {
  id: string;
  date: string;
  participant: {
    role: string;
    experience: string;
    bookmarksPerWeek: string;
  };
  responses: {
    currentWorkflow: string;
    painPoints: string[];
    enhancedSummarization: {
      interest: number; // 1-5 scale
      personas: string[];
      lengths: string[];
      wouldUse: boolean;
      why: string;
    };
    skillGeneration: {
      interest: number; // 1-5 scale
      wouldUse: boolean;
      wouldReview: boolean; // manual approval
      trustConcerns: string[];
      why: string;
    };
    learningMaterials: {
      interest: number; // 1-5 scale
      wouldUse: boolean;
      currentValue: string; // current study habits
      why: string;
    };
    prioritization: {
      ranked: string[]; // ranked features
      mvp: string[]; // minimum viable set
    };
  };
}
```

**Day 3: Analysis and Go/No-Go Decisions**

**Data Analysis:**
```typescript
// Calculate metrics
const enhancedSummarizationInterest = interviews
  .map(i => i.responses.enhancedSummarization.interest)
  .reduce((a, b) => a + b, 0) / interviews.length;

const skillGenerationInterest = interviews
  .map(i => i.responses.skillGeneration.interest)
  .reduce((a, b) => a + b, 0) / interviews.length;

const learningMaterialsInterest = interviews
  .map(i => i.responses.learningMaterials.interest)
  .reduce((a, b) => a + b, 0) / interviews.length;

// Count wouldUse responses
const enhancedSummarizationWouldUse = interviews
  .filter(i => i.responses.enhancedSummarization.wouldUse).length;
const skillGenerationWouldUse = interviews
  .filter(i => i.responses.skillGeneration.wouldUse).length;
const learningMaterialsWouldUse = interviews
  .filter(i => i.responses.learningMaterials.wouldUse).length;
```

**Go/No-Go Criteria:**
```typescript
// Enhanced Summarization (Phase 1B)
const enhancedSummarizationGo =
  enhancedSummarizationInterest >= 3.5 && // Average interest ≥ 3.5/5.0
  enhancedSummarizationWouldUse >= interviews.length * 0.7; // ≥ 70% would use

// Skill Generation (Phase 2)
const skillGenerationGo =
  skillGenerationInterest >= 3.0 && // Average interest ≥ 3.0/5.0
  skillGenerationWouldUse >= interviews.length * 0.5; // ≥ 50% would use

// Learning Materials (Phase 3)
const learningMaterialsGo =
  learningMaterialsInterest >= 3.0 && // Average interest ≥ 3.0/5.0
  learningMaterialsWouldUse >= interviews.length * 0.5; // ≥ 50% would use

// Decision
if (!enhancedSummarizationGo) {
  console.error('❌ Enhanced summarization not validated. Aborting.');
  process.exit(1);
}

if (!skillGenerationGo) {
  console.warn('⚠️  Skill generation not validated. Skipping Phase 2.');
}

if (!learningMaterialsGo) {
  console.warn('⚠️  Learning materials not validated. Skipping Phase 3.');
}
```

**Revised Timeline (Based on Research):**
```bash
# If all features validated
Phase 0: Foundation (3 days)
Phase 1A: User Research (3 days) ← This decision
Phase 1B: Enhanced Summarization (4 days)
Phase 2: Skill Generation (6 days)
Phase 3: Learning Materials (4 days)
Phase 4: Integration (3 days)
Total: 23 days

# If Skills/Learning Materials NOT validated
Phase 0: Foundation (3 days)
Phase 1A: User Research (3 days)
Phase 1B: Enhanced Summarization (4 days)
Phase 4: Integration (3 days) ← Skip Phases 2-3
Total: 13 days (saved 10 days)
```

---

## Rationale

### Why User Research First?

**1. Risk Mitigation**
- **Risk:** Build features nobody uses (wasted 10+ days of work)
- **Mitigation:** 3 days of research to validate demand before building
- **ROI:** 3 days investment vs 10+ days saved if features unwanted

**2. Evidence-Based Decisions**
- **Current state:** No evidence users want Skills or learning materials
- **Needed:** User interviews, surveys, mockup testing
- **Outcome:** Data-driven go/no-go decisions

**3. Feature Prioritization**
- **Current plan:** Treats all 4 phases as equal priority
- **Reality:** Users may only want 1-2 features
- **Benefit:** Focus on high-value features, skip low-value

**4. User-Centered Design**
- **Current approach:** Build what we think users want
- **Better approach:** Build what users actually want
- **Benefit:** Higher adoption, better satisfaction, less churn

### Key Tradeoffs

**Tradeoff 1: Time to Market vs Validation**
- **Choice:** 3 days research vs immediate feature building
- **Benefit:** Validate demand before investing 10+ days
- **Mitigation:** 3 days is acceptable (13% of 23-day timeline)

**Tradeoff 2: Scope vs Focus**
- **Choice:** May cut Skills/learning materials if users don't want them
- **Benefit:** Focus on high-value features (enhanced summarization)
- **Mitigation:** Go/no-go criteria make decisions explicit

**Tradeoff 3: Sample Size vs Confidence**
- **Choice:** n=10-15 interviews vs larger sample (n=100+)
- **Benefit:** Qualitative insights (why, not just what)
- **Mitigation:** Follow up with quantitative survey (n=100+) if needed

---

## Alternatives Considered

### Alternative A: Build All Features, Iterate Later
**Description:** Implement all 4 features, gather usage data, iterate based on feedback.

**Pros:**
- Faster time to market (users get features sooner)
- Learn from real usage (not hypothetical feedback)
- Avoid overthinking (build, measure, learn)

**Cons:**
- **High risk:** 10+ days wasted on unwanted features
- **Technical debt:** Rewriting or removing features is expensive
- **Opportunity cost:** Time spent on low-value features could be spent on high-value features
- **User frustration:** Users may feel "spammed" with unwanted features

**Why Not Chosen:** The adversarial review was clear: no evidence users want Skills or learning materials. Building without validation is irresponsible use of time.

### Alternative B: Survey Only (No Interviews)
**Description:** Send quantitative survey (Google Form, Typeform) to gauge interest.

**Pros:**
- Faster than interviews (automated, async)
- Larger sample size (n=100+)
- Easier to analyze (quantitative data)

**Cons:**
- **Shallow insights:** Surveys tell you "what" but not "why"
- **Bias:** Response bias (only enthusiastic users respond)
- **No iteration:** Can't ask follow-up questions or probe deeper
- **No mockup testing:** Users can't see features to judge interest

**Why Not Chosen:** Surveys are useful but insufficient. Need qualitative insights (why, not just what) and mockup testing (show, don't just tell).

### Alternative C: A/B Test in Production
**Description:** Ship features to small subset of users, measure engagement, decide based on data.

**Pros:**
- Real usage data (not hypothetical)
- No upfront research time
- Learn from actual behavior

**Cons:**
- **High risk:** Shipping unvalidated features to production
- **Complexity:** Need feature flags, analytics, A/B testing infrastructure
- **Time:** Still need to build features before knowing if they're wanted
- **Ethical concerns:** Testing features on users without validation

**Why Not Chosen:** A/B testing is useful for optimization, not for validation. Need to validate demand before building, not after.

### Alternative D: Skip Research, Use Industry Benchmarks
**Description:** Assume Skills/learning materials are valuable (other tools have them), build without validation.

**Pros:**
- No research time (faster to build)
- Industry precedent (Readwise has highlighting, Notion has templates)

**Cons:**
- **Context matters:** xKit users ≠ Readwise users
- **No evidence:** Don't know if xKit users want these features
- **Risk:** Building features that work for others, not for xKit users

**Why Not Chosen:** Industry benchmarks are useful but insufficient. xKit's unique value prop (Twitter/X bookmarks) may attract different users with different needs.

---

## Consequences

### Positive

**1. Risk Reduction**
- Avoid building 10+ days of unwanted features
- Focus on high-value features (enhanced summarization)
- Higher adoption (users actually want features)

**2. Better Product-Market Fit**
- Features aligned with user needs
- Higher satisfaction (features solve real pain points)
- Lower churn (users stick around)

**3. Data-Driven Decisions**
- Go/no-go criteria are objective (not gut feel)
- Prioritization based on user feedback
- Clear success metrics (measurable)

**4. User Engagement**
- Users feel heard (interviewed, included)
- Early feedback loop (users shape product)
- Word-of-mouth marketing (users tell friends)

**5. Resource Efficiency**
- 3 days research vs 10+ days building unwanted features
- Reallocate time to high-value features
- Faster time to value for features users actually want

### Negative

**1. 3-Day Delay**
- Features delayed by 3 days
- Users don't see immediate value
- Mitigation: 3 days is acceptable (13% of timeline)

**2. Effort Required**
- Need to recruit participants (Twitter, Discord, GitHub)
- Need to conduct interviews (time-consuming)
- Need to analyze data (synthesis, patterns)

**3. Risk of Wrong Conclusions**
- Small sample size (n=10-15) may not be representative
- Interview bias (enthusiastic users may overrepresent)
- Mitigation: Follow up with quantitative survey (n=100+) if needed

**4. Managing Expectations**
- Users interviewed may expect features to be built soon
- Need to communicate timeline clearly
- Mitigation: Be explicit about "research, not commitment to build"

**5. Potential Disappointment**
- If Skills/learning materials are cut, interviewed users may be disappointed
- Need to explain why (data-driven decision, not arbitrary)
- Mitigation: Share findings, be transparent, offer alternative features

### Follow-ups / Action items

- [ ] Create interview guide with structured questions (Owner: @jamiecraik, Due: Phase 1A Day 1)
- [ ] Design mockups for all 4 features (Owner: @jamiecraik, Due: Phase 1A Day 1)
- [ ] Create recruitment message (GitHub, Discord, Twitter) (Owner: @jamiecraik, Due: Phase 1A Day 1)
- [ ] Conduct 10-15 user interviews (Owner: @jamiecraik, Due: Phase 1A Day 2-3)
- [ ] Analyze interview data (calculate interest, wouldUse metrics) (Owner: @jamiecraik, Due: Phase 1A Day 3)
- [ ] Make go/no-go decisions for all phases (Owner: @jamiecraik, Due: Phase 1A Day 3)
- [ ] Update timeline based on research findings (Owner: @jamiecraik, Due: Phase 1A Day 3)
- [ ] Share findings with community (transparency) (Owner: @jamiecraik, Due: Phase 1A Day 3)
- [ ] If Skills/learning materials cut, create issue for future consideration (Owner: @jamiecraik, Due: Phase 1A Day 3)

---

## Notes

### Interview Recruitment Script

**GitHub Issue:**
```markdown
📢 **Help Shape xKit's Future: User Research Interviews**

Hi xKit community! 👋

I'm planning xKit's next major release: **Enhanced Knowledge Transformation** (better summaries, Skills, learning materials). Before building, I want to hear from you!

**What:** 30-45 minute interview (video or async)
**When:** Week of Jan 27-31, 2026
**Incentive:** Early access to features + shoutout in credits
**Who I'm looking for:**
- Active xKit users (any experience level)
- Twitter/X bookmarkers (any volume)
- Interested in AI-powered knowledge tools

**Sign up:** [Google Form](https://forms.gle/xxx)

Your feedback will directly shape what gets built (and what doesn't). Thanks for helping! 🙏
```

**Discord Message:**
```
📢 **xKit User Research: Help Shape the Future**

Hey folks! I'm working on enhanced summarization, Skills, and learning materials for xKit. Before I build, I want to hear from you!

**Quick chat (30 min) about:**
- Your current bookmark workflow
- Pain points with xKit
- Feature ideas (summaries, Skills, study guides)

**Incentive:** Early access + credits shoutout

**Sign up:** [DM me or fill out this form]

Even if you're a casual xKit user, I'd love to hear from you! 🎯
```

### Mockup Designs

**Enhanced Summarization Mockup:**
```bash
$ xkit archive --summarize --persona technical-researcher --length long

🔍 Processing 1 bookmark...

✅ Summary generated (technical-researcher, long)

### Core Concepts: Type-Level Programming
TypeScript's type system extends beyond simple runtime type checking...
[Full summary displayed]

💾 Saved to: ./knowledge/2026/01-20/github/username/type-level-programming.md

📊 Stats:
   Tokens: 2,345 (input) + 567 (output) = 2,912 total
   Cost: $0.00 (local Ollama)
   Latency: 12.3s

💡 Try different persona/length:
   xkit archive --summarize --persona educator --length medium
```

**Skill Generation Mockup:**
```bash
$ xkit generate-skills --category github --min-confidence 0.8

🔍 Analyzing 25 GitHub bookmarks...

✅ Generated 5 Skills (confidence ≥ 0.80)

📂 Review directory: .claude/skills-review/

Top Skills:
1. ⭐ Implement Type-Safe API Validation (confidence: 0.92)
   → mv .claude/skills-review/type-safe-api.md .claude/skills/

2. ⭐ Build Custom SwiftUI Async Button (confidence: 0.89)
   → mv .claude/skills-review/swiftui-async-button.md .claude/skills/

3. ⭐ Use Combine for Data Binding (confidence: 0.85)
   → mv .claude/skills-review/combine-data-binding.md .claude/skills/

📋 Next steps:
   1. Review: ls .claude/skills-review/
   2. Approve: mv .claude/skills-review/skill.md .claude/skills/
   3. Reject: rm .claude/skills-review/bad-skill.md
   4. Re-run: xkit generate-skills --min-confidence 0.9
```

**Learning Materials Mockup:**
```bash
$ xkit learn --generate study-guide,flashcards --from "SwiftUI animations"

🔍 Analyzing 10 bookmarks matching "SwiftUI animations"...

✅ Generated 2 study guides, 20 flashcards

📂 Learning directory: ~/.xkit/learning/

Study Guide: SwiftUI Animations - Advanced Techniques
→ ~/.xkit/learning/2026/01/swiftui-animations-study-guide.md

Flashcards: SwiftUI Animations (20 cards)
→ ~/.xkit/learning/2026/01/swiftui-animations-flashcards.md

💡 Test yourself:
   xkit learn --quiz --from "SwiftUI animations"
```

### Data Analysis Template

```typescript
// User Interview Analysis
interface AnalysisReport {
  participants: number;
  enhancedSummarization: {
    averageInterest: number; // 1-5 scale
    wouldUseCount: number;
    wouldUsePercent: number;
    topPersonas: string[];
    topLengths: string[];
    commonPainPoints: string[];
    goNoGo: boolean;
  };
  skillGeneration: {
    averageInterest: number;
    wouldUseCount: number;
    wouldUsePercent: number;
    trustConcerns: string[];
    manualApprovalAcceptance: boolean;
    goNoGo: boolean;
  };
  learningMaterials: {
    averageInterest: number;
    wouldUseCount: number;
    wouldUsePercent: number;
    currentValue: string; // current study habits
    goNoGo: boolean;
  };
  prioritization: {
    rankedFeatures: string[]; // average ranking
    mvp: string[]; // minimum viable set
  };
  recommendations: {
    build: string[]; // features to build
    skip: string[]; // features to skip
    defer: string[]; // features to defer
  };
}
```

### Go/No-Go Decision Examples

**Example 1: All Features Validated**
```
✅ Enhanced Summarization: GO
   Interest: 4.2/5.0 (target: ≥ 3.5)
   Would use: 85% (target: ≥ 70%)

✅ Skill Generation: GO
   Interest: 3.8/5.0 (target: ≥ 3.0)
   Would use: 65% (target: ≥ 50%)

✅ Learning Materials: GO
   Interest: 3.5/5.0 (target: ≥ 3.0)
   Would use: 55% (target: ≥ 50%)

📅 Revised Timeline: 23 days (all phases)
```

**Example 2: Skills Cut, Learning Materials Cut**
```
✅ Enhanced Summarization: GO
   Interest: 4.5/5.0
   Would use: 90%

❌ Skill Generation: NO-GO
   Interest: 2.3/5.0 (target: ≥ 3.0)
   Would use: 35% (target: ≥ 50%)
   Feedback: "Don't trust auto-generated code", "Rather write Skills manually"

❌ Learning Materials: NO-GO
   Interest: 2.1/5.0 (target: ≥ 3.0)
   Would use: 25% (target: ≥ 50%)
   Feedback: "Don't have time for study guides", "Prefer watching tutorials"

📅 Revised Timeline: 13 days (skip Phases 2-3)
   Focus: Enhanced summarization + custom templates
   Defer: Skills/learning materials to v2.0+ (if demand emerges)
```

### References
- [Adversarial Review: PM Findings](/Users/jamiecraik/.claude/plans/adversarial-review-output.md#pm-review)
- [User Interview Guide](https://www.nngroup.com/articles/user-interviews/)
- [Go/No-Go Decision Framework](https://www.productplan.com/learn/go-no-go-decisions)
- [xKit Enhanced Summarization PRD](.spec/spec-2026-01-20-ai-knowledge-transformation.md)

---

**End of ADR-005**
