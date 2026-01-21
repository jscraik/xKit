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
<clean>
```
- git diff --stat:
```
<no diff>
```

Constraints:
- Work on exactly ONE task per iteration
- Do not claim completion without passing gates
- Prefer minimal diffs; keep repo clean

