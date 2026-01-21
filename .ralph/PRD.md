# Knowledge Reorganization PRD

## Overview

Reorganize the xKit knowledge base from category-first (`year/month/category/@handle/file.md`) to author-first structure (`year/month/@handle (real name)/category/file.md`) with enhanced filenames including date, handle, category, title, and short ID. Includes comprehensive migration tooling with atomic operations, automated rollback, degraded mode support, and full observability.

**Tech Spec:** `.spec/tech-spec-2026-01-20-knowledge-reorganization.md`

## Task Breakdown Guidelines

**CRITICAL:** Tasks must be atomic (5-15 minutes each) with specific acceptance criteria and test commands.

## Tasks

### Phase 1: Core Types

- [-] Create `src/bookmark-organization/types.ts` file
  - Add `AuthorFolder`, `KnowledgePath`, `FilenameComponents` interfaces
  - Add `RealNameCache`, `MigrationState`, `MigrationError` interfaces
  - Add `MigrationFailureMarker`, `PreflightCheck` interfaces
  - Export all types
  - Test: `pnpm test -- src/bookmark-organization/types.test.ts` passes

- [x] Add `sanitizeAuthorName()` to `src/bookmark-organization/sanitize.ts`
  - ASCII-only handle validation (`/^[A-Za-z0-9_]+$/`)
  - Reserved Windows filename check (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  - Real name sanitization (control chars, Unicode NFC, dangerous chars)
  - Limit real name to 100 chars
  - Return `@handle` or `@handle (Real Name)`
  - Test: `pnpm test -- src/bookmark-organization/sanitize.test.ts` passes

- [x] Add `sanitizeSlug()` to `src/bookmark-organization/sanitize.ts`
  - Pre-check for path traversal (`/\.\.[\/\\]/`)
  - Remove control characters, normalize Unicode to NFC
  - Replace non-alphanumerics with hyphens
  - Limit to 80 chars
  - Test: `pnpm test -- src/bookmark-organization/sanitize.test.ts` passes

### Phase 2: Real Name Cache

- [x] Add real name cache functions to `src/bookmark-organization/cache.ts`
  - `loadRealNameCache()`: load from `.real-name-cache.json` or create new
  - `saveRealNameCache()`: write cache with timestamp
  - `getRealName()`: lookup handle in cache
  - `setRealName()`: add or update cache entry
  - Test: `pnpm test -- src/bookmark-organization/cache.test.ts` passes

### Phase 3: Filename Generation

- [x] Add `generateEnhancedFilename()` to `src/bookmark-markdown/filename.ts`
  - Format: `{date}-{handle}-{category}-{title}-{short_id}.md`
  - Use linked content title or tweet text excerpt
  - Mandatory short ID (last 6 chars of tweet ID)
  - Limit total filename to 255 chars
  - Test: `pnpm test -- src/bookmark-markdown/filename.test.ts` passes

- [x] Add `validatePathLength()` to `src/bookmark-markdown/filename.ts`
  - Check path length ≤ 240 chars (Windows safe)
  - Throw error with path preview if exceeded
  - Test: `pnpm test -- src/bookmark-markdown/filename.test.ts` passes

- [x] Update `MarkdownWriter.generateFilename()` in `src/bookmark-markdown/writer.ts`
  - Call `generateEnhancedFilename()` instead of old method
  - Note: writer.test.ts does not exist yet; filename.test.ts passes

### Phase 4: Disk Space & Pre-flight

- [x] Add `getDirectorySize()` to `scripts/migration/lib/disk.ts`
  - Recursively scan directory and sum file sizes
  - Return total bytes
  - Test: Manual verify with known test directory

- [x] Add `checkDiskSpace()` to `scripts/migration/lib/disk.ts`
  - Use `statvfs` to get available space (Unix)
  - Require 2.5x directory size (original + backup + margin)
  - Throw error if insufficient with GB amounts
  - Fallback for Windows (skip check with warning)
  - Test: Manual verify with small directory

- [x] Add `preFlightChecks()` to `scripts/migration/lib/check.ts`
  - Call `getDirectorySize()` and `checkDiskSpace()`
  - Count files to migrate
  - Log summary and throw if checks fail
  - Return `PreflightCheck` result
  - Test: Manual verify on `knowledge/` directory

### Phase 5: Migration Script Core

- [-] Create `scripts/migrate-to-author-first.mjs` CLI scaffold
  - Parse arguments: --dry-run, --backup-dir, --resume, --verify, --verbose, --force, --help
  - Set up logging to `migration.log`
  - Exit codes: 0=success, 1=errors, 2=validation failed, 3=cancelled
  - Test: `node scripts/migrate-to-author-first.mjs --help` shows usage

- [-] Add dry-run mode to `scripts/migrate-to-author-first.mjs`
  - Scan all files in `knowledge/`
  - Calculate new paths for all files
  - Print summary: file counts, new structure example, backup location
  - Prompt for confirmation: "Continue? [y/N]"
  - Exit if not 'y'
  - Test: `node scripts/migrate-to-author-first.mjs --dry-run` shows plan

### Phase 6: File Operations with Timeout

- [-] Add `moveFileWithTimeout()` to `scripts/migration/lib/files.ts`
  - Use `Promise.race()` with 5 second timeout
  - Copy file first, verify size matches, then delete source
  - Throw timeout error if stuck
  - Test: Manual verify with test files

### Phase 7: Checkpoint & Recovery

- [-] Add checkpoint system to `scripts/migration/lib/checkpoint.ts`
  - `writeCheckpoint()`: write state to `.migration-state.json` every 100 files
  - `resumeFromCheckpoint()`: load checkpoint state
  - Track: migrationId, timestamps, files processed, processed files list
  - Test: Manual interrupt and resume

- [-] Add SIGINT handler to `scripts/migrate-to-author-first.mjs`
  - Catch Ctrl+C, write checkpoint, exit gracefully
  - Print message: "Migration paused. Run with --resume to continue."
  - Test: Manual Ctrl+C during migration

### Phase 8: Migration Execution

- [-] Add main migration logic to `scripts/migrate-to-author-first.mjs`
  - For each file: calculate new path, create author folder, create category folder
  - Call `moveFileWithTimeout()` for each file
  - Write checkpoint every 100 files
  - Show progress: `[=====>] 45% (382/847) | 234 files/sec`
  - Log each move to `migration.log`
  - Track errors (recoverable) and continue
  - Test: `node scripts/migrate-to-author-first.mjs --dry-run` on sample data

### Phase 9: Checksum Verification

- [-] Add checksum functions to `scripts/migration/lib/checksum.ts`
  - `checksum()`: compute SHA-256 hash of file
  - `verifyBackup()`: compare all files between original and backup
  - Return summary with mismatches list
  - Test: Manual verify with test directory

### Phase 10: Backup & Rollback

- [-] Add backup creation to `scripts/migrate-to-author-first.mjs`
  - Copy entire `knowledge/` to `knowledge_backup_<timestamp>/`
  - Run `verifyBackup()` after copy
  - Throw if verification fails
  - Test: `node scripts/migrate-to-author-first.mjs --dry-run` creates backup

- [-] Create `scripts/rollback-migration.mjs`
  - Parse --backup-dir and --verify flags
  - Validate backup exists
  - Create backup of current state
  - Delete `knowledge/`, copy backup to `knowledge/`
  - Revert code changes if needed
  - Run build and verify
  - Test: Manual rollback after test migration

### Phase 11: Concurrency Locking

- [-] Add lock file functions to `src/bookmark-markdown/lock.ts`
  - `createMigrationLock()`: write `.migration-lock` with migration ID and timestamp
  - `checkMigrationLock()`: return true if lock exists
  - `clearMigrationLock()`: remove lock file
  - Test: `pnpm test -- src/bookmark-markdown/lock.test.ts` passes

- [-] Update bookmark archiving to check for migration lock
  - In archiving entry point, call `checkMigrationLock()`
  - If locked, print warning and exit (pause archiving)
  - Test: Manual verify lock pauses archiving

### Phase 12: Degraded Mode

- [x] Add degraded mode functions to `scripts/migration/lib/degraded.ts`
  - `markMigrationFailed()`: write `.migration-failed` marker with error
  - `isDegradedMode()`: check if marker exists
  - `getOutputDirectory()`: return `knowledge_degraded/` if failed
  - `clearDegradedMode()`: remove marker
  - Test: Manual verify degraded mode activation

- [-] Update `MarkdownWriter` constructor to use degraded output
  - Call `isDegradedMode()` on init
  - If degraded, set `outputDir` to `knowledge_degraded/`
  - Print warning message
  - Test: Manual verify degraded mode writes to fallback

- [-] Add degraded mode handling to `scripts/migrate-to-author-first.mjs`
  - On any error, call `markMigrationFailed()`
  - Exit with error code 1
  - On success, call `clearDegradedMode()`
  - Test: Manual error triggers degraded mode

### Phase 13: Package Scripts & Docs

- [ ] Add npm scripts to `package.json`
  - `"migrate-knowledge": "node scripts/migrate-to-author-first.mjs"`
  - `"migrate-knowledge:dry-run": "node scripts/migrate-to-author-first.mjs --dry-run"`
  - `"rollback-knowledge": "node scripts/rollback-migration.mjs"`
  - Test: `pnpm migrate-knowledge --help` works

- [ ] Add migration documentation to `docs/KNOWLEDGE_MIGRATION.md`
  - Overview of new structure
  - Migration instructions
  - Rollback instructions
  - Troubleshooting guide
  - Test: Documentation is clear and complete

### Phase 14: Testing & Validation

- [ ] Add migration tests to `tests/migration.test.ts`
  - Test dry-run on sample data
  - Test checkpoint creation and resume
  - Test degraded mode activation
  - Test lock file handling
  - Test: `pnpm test -- tests/migration.test.ts` passes

- [ ] Run full migration test on backup
  - Copy `knowledge/` to test location
  - Run full migration
  - Verify all files moved correctly
  - Verify checksums match
  - Test rollback restores correctly
  - Test: Manual end-to-end validation

## Acceptance Criteria

- [ ] All existing files migrated without data loss
- [ ] New bookmarks use author-first structure with enhanced filenames
- [ ] Build succeeds with no broken links (`pnpm build`)
- [ ] Migration script has dry-run mode with detailed output
- [ ] Automated rollback script tested and documented
- [ ] Comprehensive path sanitization implemented (ASCII-only handles)
- [ ] Checksum verification before/after migration
- [ ] Checkpoint/resume capability functional
- [ ] CLI interface with all specified flags
- [ ] Confirmation flow (dry-run → prompt → execute)
- [ ] Migration logging to `migration.log`
- [ ] Progress indicator during migration
- [ ] Concurrency handling (pause with lock file)
- [ ] Path length validation (fail fast if >240 chars)
- [ ] ID suffix mandatory in filename generation
- [ ] TypeScript types defined for all new structures
- [ ] Real name cache format defined
- [ ] Disk space check implemented
- [ ] Per-file timeout implemented (5 second default)
- [ ] Degraded mode functional (fallback to `knowledge_degraded/`)

## Notes

- Mark done: - [x]
- Mark blocked: - [-]
- Dependencies: add acceptance bullet like "- Depends on: 1, 2"
