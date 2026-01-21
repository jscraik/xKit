# Ralph Gold Anchor

Task: 15 - Add SIGINT handler to `scripts/migrate-to-author-first.mjs`

Acceptance criteria:
- Catch Ctrl+C, write checkpoint, exit gracefully
- Print message: "Migration paused. Run with --resume to continue."
- Test: Manual Ctrl+C during migration

Repo reality:
- branch: main
- git status --porcelain:
```
M .ralph/PRD.md
 M .ralph/progress.md
 M .ralph/ralph.toml
 D .ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md
?? .ralph/archive/20260120-190753/
?? .ralph/attempts/
?? .ralph/context/
?? .ralph/logs/
?? .ralph/permissions.json
?? .ralph/receipts/
?? .ralph/state.json
?? scripts/migration/
```
- git diff --stat:
```
.ralph/PRD.md                                      |   14 +-
 .ralph/progress.md                                 |   43 +
 .ralph/ralph.toml                                  |   13 +-
 ...ech-spec-2026-01-20-knowledge-reorganization.md | 1157 --------------------
 4 files changed, 61 insertions(+), 1166 deletions(-)
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

