# Ralph Gold Anchor

Task: 13 - Add `moveFileWithTimeout()` to `scripts/migration/lib/files.ts`

Acceptance criteria:
- Use `Promise.race()` with 5 second timeout
- Copy file first, verify size matches, then delete source
- Throw timeout error if stuck
- Test: Manual verify with test files

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
.ralph/PRD.md      | 10 +++++-----
 .ralph/progress.md | 26 ++++++++++++++++++++++++++
 2 files changed, 31 insertions(+), 5 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

