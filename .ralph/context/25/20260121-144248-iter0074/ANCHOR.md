# Ralph Gold Anchor

Task: 25 - Add npm scripts to `package.json`

Acceptance criteria:
- `"migrate-knowledge": "node scripts/migrate-to-author-first.mjs"`
- `"migrate-knowledge:dry-run": "node scripts/migrate-to-author-first.mjs --dry-run"`
- `"rollback-knowledge": "node scripts/rollback-migration.mjs"`
- Test: `pnpm migrate-knowledge --help` works

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/progress.md
 M .ralph/state.json
?? .ralph/attempts/25/
?? .ralph/context/25/
?? .ralph/logs/prompt-iter0072.txt
?? .ralph/logs/prompt-iter0073.txt
?? .ralph/receipts/25/
```
- git diff --stat:
```
.ralph/progress.md |   2 +
 .ralph/state.json  | 119 +++++++++++++++++++++++++++++++++++++++++++++++++++--
 2 files changed, 118 insertions(+), 3 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

