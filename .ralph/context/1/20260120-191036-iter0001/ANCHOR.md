# Ralph Gold Anchor

Task: 1 - Create `src/bookmark-organization/types.ts` file

Acceptance criteria:
- Add `AuthorFolder`, `KnowledgePath`, `FilenameComponents` interfaces
- Add `RealNameCache`, `MigrationState`, `MigrationError` interfaces
- Add `MigrationFailureMarker`, `PreflightCheck` interfaces
- Export all types
- Test: `pnpm test -- src/bookmark-organization/types.test.ts` passes

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/PROMPT.md
 M .ralph/PROMPT_build.md
 M .ralph/ralph.toml
 M tests/bookmark-analysis/analysis-engine.test.ts
 M tests/bookmark-analysis/analysis-integration.test.ts
 M tests/bookmark-analysis/usefulness-scorer.test.ts
?? .ralph/archive/20260120-190753/
?? .ralph/permissions.json
?? .ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md
?? .spec/tech-spec-2026-01-20-knowledge-reorganization.md
```
- git diff --stat:
```
.ralph/PRD.md                                      | 296 +++++++++++++++++----
 .ralph/PROMPT.md                                   |  14 +
 .ralph/PROMPT_build.md                             |  77 +++++-
 .ralph/ralph.toml                                  |  36 +--
 tests/bookmark-analysis/analysis-engine.test.ts    |  13 +-
 .../bookmark-analysis/analysis-integration.test.ts |  11 +-
 tests/bookmark-analysis/usefulness-scorer.test.ts  |  18 +-
 7 files changed, 374 insertions(+), 91 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

