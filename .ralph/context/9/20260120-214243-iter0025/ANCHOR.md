# Ralph Gold Anchor

Task: 9 - Add `checkDiskSpace()` to `scripts/migration/lib/disk.ts`

Acceptance criteria:
- Use `statvfs` to get available space (Unix)
- Require 2.5x directory size (original + backup + margin)
- Throw error if insufficient with GB amounts
- Fallback for Windows (skip check with warning)
- Test: Manual verify with small directory

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
.ralph/PRD.md      | 2 +-
 .ralph/progress.md | 3 +++
 2 files changed, 4 insertions(+), 1 deletion(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

