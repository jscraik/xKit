# Ralph Gold Anchor

Task: 14 - Add checkpoint system to `scripts/migration/lib/checkpoint.ts`

Acceptance criteria:
- `writeCheckpoint()`: write state to `.migration-state.json` every 100 files
- `resumeFromCheckpoint()`: load checkpoint state
- Track: migrationId, timestamps, files processed, processed files list
- Test: Manual interrupt and resume

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
.ralph/PRD.md                                      |   12 +-
 .ralph/progress.md                                 |   35 +
 .ralph/ralph.toml                                  |   13 +-
 ...ech-spec-2026-01-20-knowledge-reorganization.md | 1157 --------------------
 4 files changed, 52 insertions(+), 1165 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

