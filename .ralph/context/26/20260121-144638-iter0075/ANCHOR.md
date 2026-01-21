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
?? .ralph/context/25/
?? .ralph/logs/prompt-iter0072.txt
?? .ralph/logs/prompt-iter0073.txt
?? .ralph/logs/prompt-iter0074.txt
?? .ralph/receipts/25/
```
- git diff --stat:
```
.ralph/PRD.md      |   2 +-
 .ralph/progress.md |   4 ++
 .ralph/state.json  | 179 ++++++++++++++++++++++++++++++++++++++++++++++++++++-
 3 files changed, 182 insertions(+), 3 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

