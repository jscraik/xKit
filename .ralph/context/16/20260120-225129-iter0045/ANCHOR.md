# Ralph Gold Anchor

Task: 16 - Add main migration logic to `scripts/migrate-to-author-first.mjs`

Acceptance criteria:
- For each file: calculate new path, create author folder, create category folder
- Call `moveFileWithTimeout()` for each file
- Write checkpoint every 100 files
- Show progress: `[=====>] 45% (382/847) | 234 files/sec`
- Log each move to `migration.log`
- Track errors (recoverable) and continue
- Test: `node scripts/migrate-to-author-first.mjs --dry-run` on sample data

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/progress.md
 M .ralph/ralph.toml
 D .ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md
?? .ralph/archive/20260120-190753/
?? .ralph/attempts/
?? .ralph/context/
?? .ralph/logs/
?? .ralph/permissions.json
?? .ralph/receipts/
?? .ralph/state.json
?? scripts/migration/
```
- git diff --stat:
```
.ralph/PRD.md                                      |   16 +-
 .ralph/progress.md                                 |   47 +
 .ralph/ralph.toml                                  |   13 +-
 ...ech-spec-2026-01-20-knowledge-reorganization.md | 1157 --------------------
 4 files changed, 66 insertions(+), 1167 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

