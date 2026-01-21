# Ralph Gold Anchor

Task: 6 - Add `validatePathLength()` to `src/bookmark-markdown/filename.ts`

Acceptance criteria:
- Check path length ≤ 240 chars (Windows safe)
- Throw error with path preview if exceeded
- Test: `pnpm test -- src/bookmark-markdown/filename.test.ts` passes

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/PROMPT.md
 M .ralph/PROMPT_build.md
 M .ralph/progress.md
 M .ralph/ralph.toml
 M biome.json
 M package.json
 M src/bookmark-analysis/analysis-engine.ts
 M src/bookmark-analysis/bookmark-embedder.ts
 M src/bookmark-analysis/circuit-breaker.ts
 M src/bookmark-analysis/llm-categorizer.ts
 M src/bookmark-analysis/model-config.ts
 M src/bookmark-analysis/model-router.ts
 M src/bookmark-analysis/pricing.ts
 M src/bookmark-analysis/retry-strategy.ts
 M src/bookmark-analysis/schema-validator.ts
 M src/bookmark-analysis/token-tracker.ts
 M src/bookmark-analysis/usefulness-scorer.ts
 M src/bookmark-analysis/vector-store.ts
 M src/bookmark-analysis/worker-handler.ts
 M src/bookmark-analysis/worker-pool.ts
 M src/bookmark-daemon/daemon.ts
 M src/bookmark-enrichment/article-extractor.ts
 M src/bookmark-enrichment/cached-content-extractor.ts
 M src/bookmark-enrichment/content-extractor.ts
 M src/bookmark-enrichment/enricher.ts
 M src/bookmark-enrichment/index.ts
 M src/bookmark-enrichment/ollama-client.ts
 M src/bookmark-export/rate-limiter.ts
 M src/bookmark-export/schema-validator.ts
 M src/bookmark-folders/folder-manager.ts
 M src/bookmark-markdown/writer.ts
 M src/bookmark-prompts/content-types.ts
 M src/bookmark-prompts/custom-templates.ts
 M src/bookmark-prompts/index.ts
 M src/bookmark-prompts/personas.ts
 M src/bookmark-prompts/summary-templates.ts
 M src/bookmark-prompts/tagged-prompts.ts
 M src/cache/cache-manager.ts
 M src/cli/program.ts
 M src/cli/shared.ts
 M src/commands/bookmark-analysis.ts
 M src/commands/bookmark-export.ts
 M src/commands/bookmarks-archive.ts
 M src/commands/cache.ts
 M src/commands/daemon.ts
 M src/commands/generate-skills.ts
 M src/commands/learn.ts
 M src/commands/metrics.ts
 M src/commands/recap.ts
 M src/commands/summarize.ts
 M src/commands/templates.ts
 M src/learning/generators.ts
 M src/learning/index.ts
 M src/learning/recap.ts
 M src/llm/index.ts
 M src/llm/llm-clients.ts
 M src/metrics/metrics-collector.ts
 M src/observability/metrics.ts
 M src/security/sanitizer.ts
 M src/skill-generator/extractor.ts
 M src/skill-generator/index.ts
 M src/skill-generator/templates.ts
 M src/skill-generator/types.ts
 M src/skill-generator/writer.ts
 M tests/bookmark-analysis/analysis-engine-error-handling.property.test.ts
 M tests/bookmark-analysis/analysis-engine-error-handling.test.ts
 M tests/bookmark-analysis/analysis-engine.property.test.ts
 M tests/bookmark-analysis/analysis-engine.test.ts
 M tests/bookmark-analysis/analysis-integration.test.ts
 M tests/bookmark-analysis/llm-categorizer.test.ts
 M tests/bookmark-analysis/script-runner.test.ts
 M tests/bookmark-analysis/token-tracker.test.ts
 M tests/bookmark-analysis/usefulness-scorer.test.ts
 M tests/bookmark-analysis/vector-store.test.ts
 M tests/bookmark-analysis/worker-pool.test.ts
 M tests/bookmark-export/error-handling.test.ts
 M tests/bookmark-export/export-integration.test.ts
 M tests/bookmark-export/export-state.test.ts
 M tests/bookmark-export/progress-reporter.test.ts
 M tests/bookmark-export/xapi-client.test.ts
 M tests/bookmark-prompts/custom-templates.test.ts
 M tests/performance/benchmark.test.ts
 M tests/security/malicious-html.test.ts
 M tests/security/memory-profiling.test.ts
 M tests/security/prompt-injection.test.ts
 M tests/security/resource-limits.test.ts
 M tests/security/sanitizer.test.ts
 M tests/smoke/cli-smoke.test.ts
?? .oxlintignore
?? .ralph/archive/20260120-190753/
?? .ralph/attempts/
?? .ralph/context/
?? .ralph/logs/
?? .ralph/permissions.json
?? .ralph/receipts/
?? .ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md
?? .ralph/state.json
?? .spec/tech-spec-2026-01-20-knowledge-reorganization.md
?? src/bookmark-markdown/filename.ts
?? src/bookmark-organization/
?? tests/bookmark-markdown/
?? tests/bookmark-organization/
```
- git diff --stat:
```
.ralph/PRD.md                                      | 296 +++++++--
 .ralph/PROMPT.md                                   |  14 +
 .ralph/PROMPT_build.md                             |  77 ++-
 .ralph/progress.md                                 |  18 +
 .ralph/ralph.toml                                  |  38 +-
 biome.json                                         |   8 +
 package.json                                       |   4 +-
 src/bookmark-analysis/analysis-engine.ts           |  10 +-
 src/bookmark-analysis/bookmark-embedder.ts         |  24 +-
 src/bookmark-analysis/circuit-breaker.ts           |   2 +-
 src/bookmark-analysis/llm-categorizer.ts           |  24 +-
 src/bookmark-analysis/model-config.ts              |  14 +-
 src/bookmark-analysis/model-router.ts              |  10 +-
 src/bookmark-analysis/pricing.ts                   |  20 +-
 src/bookmark-analysis/retry-strategy.ts            |  30 +-
 src/bookmark-analysis/schema-validator.ts          |   4 +-
 src/bookmark-analysis/token-tracker.ts             |  34 +-
 src/bookmark-analysis/usefulness-scorer.ts         |  19 +-
 src/bookmark-analysis/vector-store.ts              |  38 +-
 src/bookmark-analysis/worker-handler.ts            |   5 +-
 src/bookmark-analysis/worker-pool.ts               |  17 +-
 src/bookmark-daemon/daemon.ts                      |  83 ++-
 src/bookmark-enrichment/article-extractor.ts       | 438 ++++++-------
 .../cached-content-extractor.ts                    |  10 +-
 src/bookmark-enrichment/content-extractor.ts       |   8 +-
 src/bookmark-enrichment/enricher.ts                |   2 +-
 src/bookmark-enrichment/index.ts                   |   7 +-
 src/bookmark-enrichment/ollama-client.ts           | 701 +++++++++++----------
 src/bookmark-export/rate-limiter.ts                |   2 -
 src/bookmark-export/schema-validator.ts            |   4 +-
 src/bookmark-folders/folder-manager.ts             |  17 +-
 src/bookmark-markdown/writer.ts                    |  27 +-
 src/bookmark-prompts/content-types.ts              |  46 +-
 src/bookmark-prompts/custom-templates.ts           |  24 +-
 src/bookmark-prompts/index.ts                      |  44 +-
 src/bookmark-prompts/personas.ts                   |  19 +-
 src/bookmark-prompts/summary-templates.ts          |   3 +-
 src/bookmark-prompts/tagged-prompts.ts             |   6 +-
 src/cache/cache-manager.ts                         |  53 +-
 src/cli/program.ts                                 |   8 +-
 src/cli/shared.ts                                  |  16 +-
 src/commands/bookmark-analysis.ts                  |  52 +-
 src/commands/bookmark-export.ts                    |   2 +-
 src/commands/bookmarks-archive.ts                  |  37 +-
 src/commands/cache.ts                              |   4 +-
 src/commands/daemon.ts                             |   6 +-
 src/commands/generate-skills.ts                    |  28 +-
 src/commands/learn.ts                              |  31 +-
 src/commands/metrics.ts                            | 136 ++--
 src/commands/recap.ts                              |  10 +-
 src/commands/summarize.ts                          |  22 +-
 src/commands/templates.ts                          |  28 +-
 src/learning/generators.ts                         |  53 +-
 src/learning/index.ts                              |   2 +-
 src/learning/recap.ts                              |  37 +-
 src/llm/index.ts                                   |   2 +-
 src/llm/llm-clients.ts                             |  38 +-
 src/metrics/metrics-collector.ts                   | 343 +++++-----
 src/observability/metrics.ts                       |   8 +-
 src/security/sanitizer.ts                          |  21 +-
 src/skill-generator/extractor.ts                   |  51 +-
 src/skill-generator/index.ts                       |   2 +-
 src/skill-generator/templates.ts                   |  10 +-
 src/skill-generator/types.ts                       |  14 +-
 src/skill-generator/writer.ts                      |   6 +-
 ...analysis-engine-error-handling.property.test.ts |   2 +-
 .../analysis-engine-error-handling.test.ts         |   2 +-
 .../analysis-engine.property.test.ts               |   8 +-
 tests/bookmark-analysis/analysis-engine.test.ts    |  13 +-
 .../bookmark-analysis/analysis-integration.test.ts |  13 +-
 tests/bookmark-analysis/llm-categorizer.test.ts    |   8 +-
 tests/bookmark-analysis/script-runner.test.ts      |  10 +-
 tests/bookmark-analysis/token-tracker.test.ts      |   4 +-
 tests/bookmark-analysis/usefulness-scorer.test.ts  |  18 +-
 tests/bookmark-analysis/vector-store.test.ts       |   4 +-
 tests/bookmark-analysis/worker-pool.test.ts        |   8 +-
 tests/bookmark-export/error-handling.test.ts       |   8 +-
 tests/bookmark-export/export-integration.test.ts   |   2 +-
 tests/bookmark-export/export-state.test.ts         |   2 +-
 tests/bookmark-export/progress-reporter.test.ts    |   8 +-
 tests/bookmark-export/xapi-client.test.ts          |   2 +-
 tests/bookmark-prompts/custom-templates.test.ts    |  57 +-
 tests/performance/benchmark.test.ts                | 440 ++++++-------
 tests/security/malicious-html.test.ts              | 571 ++++++++---------
 tests/security/memory-profiling.test.ts            | 505 ++++++++-------
 tests/security/prompt-injection.test.ts            | 260 ++++----
 tests/security/resource-limits.test.ts             | 232 ++++---
 tests/security/sanitizer.test.ts                   |  48 +-
 tests/smoke/cli-smoke.test.ts                      | 374 +++++------
 89 files changed, 3012 insertions(+), 2754 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

