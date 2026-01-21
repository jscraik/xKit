# Ralph Gold Anchor

Task: 17 - Add checksum functions to `scripts/migration/lib/checksum.ts`

Acceptance criteria:
- `checksum()`: compute SHA-256 hash of file
- `verifyBackup()`: compare all files between original and backup
- Return summary with mismatches list
- Test: Manual verify with test directory

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
.ralph/PRD.md                                      |   18 +-
 .ralph/progress.md                                 |   55 +
 .ralph/ralph.toml                                  |   13 +-
 ...ech-spec-2026-01-20-knowledge-reorganization.md | 1157 --------------------
 4 files changed, 75 insertions(+), 1168 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

