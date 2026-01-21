# Ralph Gold Anchor

Task: 10 - Add `preFlightChecks()` to `scripts/migration/lib/check.ts`

Acceptance criteria:
- Call `getDirectorySize()` and `checkDiskSpace()`
- Count files to migrate
- Log summary and throw if checks fail
- Return `PreflightCheck` result
- Test: Manual verify on `knowledge/` directory

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/progress.md
?? .ralph/archive/20260120-190753/
?? .ralph/attempts/
?? .ralph/context/
?? .ralph/logs/
?? .ralph/permissions.json
?? .ralph/receipts/
?? .ralph/state.json
```
- git diff --stat:
```
.ralph/PRD.md      | 4 ++--
 .ralph/progress.md | 8 ++++++++
 2 files changed, 10 insertions(+), 2 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

