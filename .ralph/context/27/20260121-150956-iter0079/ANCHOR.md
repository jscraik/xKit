# Ralph Gold Anchor

Task: 27 - Add migration tests to `tests/migration.test.ts`

Acceptance criteria:
- Test dry-run on sample data
- Test checkpoint creation and resume
- Test degraded mode activation
- Test lock file handling
- Test: `pnpm test -- tests/migration.test.ts` passes

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/progress.md
 M .ralph/state.json
?? .ralph/attempts/25/
?? .ralph/attempts/26/
?? .ralph/attempts/27/
?? .ralph/context/25/
?? .ralph/context/26/
?? .ralph/context/27/
?? .ralph/logs/prompt-iter0072.txt
?? .ralph/logs/prompt-iter0073.txt
?? .ralph/logs/prompt-iter0074.txt
?? .ralph/logs/prompt-iter0075.txt
?? .ralph/logs/prompt-iter0076.txt
?? .ralph/logs/prompt-iter0077.txt
?? .ralph/logs/prompt-iter0078.txt
?? .ralph/receipts/25/
?? .ralph/receipts/26/
?? .ralph/receipts/27/
```
- git diff --stat:
```
.ralph/PRD.md      |   4 +-
 .ralph/progress.md |   9 ++
 .ralph/state.json  | 413 ++++++++++++++++++++++++++++++++++++++++++++++++++++-
 3 files changed, 421 insertions(+), 5 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

