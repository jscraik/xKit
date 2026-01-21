# Ralph Gold Anchor

Task: 28 - Run full migration test on backup

Acceptance criteria:
- Copy `knowledge/` to test location
- Run full migration
- Verify all files moved correctly
- Verify checksums match
- Test rollback restores correctly
- Test: Manual end-to-end validation

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
?? .ralph/logs/prompt-iter0079.txt
?? .ralph/logs/prompt-iter0080.txt
?? .ralph/receipts/25/
?? .ralph/receipts/26/
?? .ralph/receipts/27/
```
- git diff --stat:
```
.ralph/PRD.md      |   6 +-
 .ralph/progress.md |  12 ++
 .ralph/state.json  | 529 ++++++++++++++++++++++++++++++++++++++++++++++++++++-
 3 files changed, 542 insertions(+), 5 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

