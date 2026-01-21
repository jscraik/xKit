# Ralph Gold Anchor

Task: 12 - Add dry-run mode to `scripts/migrate-to-author-first.mjs`

Acceptance criteria:
- Scan all files in `knowledge/`
- Calculate new paths for all files
- Print summary: file counts, new structure example, backup location
- Prompt for confirmation: "Continue? [y/N]"
- Exit if not 'y'
- Test: `node scripts/migrate-to-author-first.mjs --dry-run` shows plan

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
.ralph/PRD.md      |  8 ++++----
 .ralph/progress.md | 20 ++++++++++++++++++++
 2 files changed, 24 insertions(+), 4 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

