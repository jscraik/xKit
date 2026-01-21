# Ralph Gold Anchor

Task: 19 - Create `scripts/rollback-migration.mjs`

Acceptance criteria:
- Parse --backup-dir and --verify flags
- Validate backup exists
- Create backup of current state
- Delete `knowledge/`, copy backup to `knowledge/`
- Revert code changes if needed
- Run build and verify
- Test: Manual rollback after test migration

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/progress.md
 M .ralph/ralph.toml
 D .ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md
 D .spec/spec-2025-01-19-smaug-feature-port.md
 D .spec/spec-2026-01-20-ai-knowledge-transformation.md
 D .spec/spec-2026-01-20-summarize-feature-analysis.md
 D .spec/tech-spec-2026-01-20-knowledge-reorganization.md
?? .ralph/archive/20260120-190753/
?? .ralph/attempts/
?? .ralph/context/
?? .ralph/logs/
?? .ralph/permissions.json
?? .ralph/receipts/
?? .ralph/state.json
?? .spec/archive/
?? scripts/migration/
```
- git diff --stat:
```
.ralph/PRD.md                                      |   22 +-
 .ralph/progress.md                                 |   68 +
 .ralph/ralph.toml                                  |   13 +-
 ...ech-spec-2026-01-20-knowledge-reorganization.md | 1157 --------------
 .spec/spec-2025-01-19-smaug-feature-port.md        | 1613 -------------------
 .../spec-2026-01-20-ai-knowledge-transformation.md | 1667 --------------------
 .../spec-2026-01-20-summarize-feature-analysis.md  |  624 --------
 ...ech-spec-2026-01-20-knowledge-reorganization.md | 1157 --------------
 8 files changed, 90 insertions(+), 6231 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

