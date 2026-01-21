# Ralph Gold Anchor

Task: 11 - Create `scripts/migrate-to-author-first.mjs` CLI scaffold

Acceptance criteria:
- Parse arguments: --dry-run, --backup-dir, --resume, --verify, --verbose, --force, --help
- Set up logging to `migration.log`
- Exit codes: 0=success, 1=errors, 2=validation failed, 3=cancelled
- Test: `node scripts/migrate-to-author-first.mjs --help` shows usage

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
.ralph/PRD.md      |  6 +++---
 .ralph/progress.md | 13 +++++++++++++
 2 files changed, 16 insertions(+), 3 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

