# Ralph Gold Anchor

Task: 26 - Add migration documentation to `docs/KNOWLEDGE_MIGRATION.md`

Acceptance criteria:
- Overview of new structure
- Migration instructions
- Rollback instructions
- Troubleshooting guide
- Test: Documentation is clear and complete

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/progress.md
 M .ralph/state.json
?? .ralph/attempts/25/
?? .ralph/attempts/26/
?? .ralph/context/25/
?? .ralph/context/26/
?? .ralph/logs/prompt-iter0072.txt
?? .ralph/logs/prompt-iter0073.txt
?? .ralph/logs/prompt-iter0074.txt
?? .ralph/logs/prompt-iter0075.txt
?? .ralph/logs/prompt-iter0076.txt
?? .ralph/receipts/25/
?? .ralph/receipts/26/
```
- git diff --stat:
```
.ralph/PRD.md      |   2 +-
 .ralph/progress.md |   6 ++
 .ralph/state.json  | 294 ++++++++++++++++++++++++++++++++++++++++++++++++++++-
 3 files changed, 298 insertions(+), 4 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

