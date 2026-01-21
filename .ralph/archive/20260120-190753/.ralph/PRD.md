# Knowledge Reorganization PRD

**Project:** xKit Knowledge Base Author-Centric Reorganization
**Spec:** `.spec/tech-spec-2026-01-20-knowledge-reorganization.md`
**Status:** In Progress

## Overview

Reorganize the knowledge base from category-first to author-first structure with enhanced filenames. Migration includes atomic operations, automated rollback, degraded mode support, and full observability.

## Tasks

### Phase 1: Core Types & Cache
- [ ] Define TypeScript types in `src/bookmark-organization/types.ts`
  - KnowledgePath, FilenameComponents, MigrationState, RealNameCache
- [ ] Implement RealNameCache load/save functions
  - getRealName(), setRealName(), loadRealNameCache(), saveRealNameCache()
- [ ] Implement `sanitizeAuthorName()` with ASCII-only validation
  - Control chars, Unicode normalization, reserved Windows names
- [ ] Implement `sanitizeSlug()` with path traversal detection
  - Pre-check for ../, then slugify
- [ ] Add unit tests for sanitization edge cases

### Phase 2: Filename Generation
- [ ] Implement `generateEnhancedFilename()` with mandatory ID suffix
  - Format: {date}-{handle}-{category}-{title}-{short_id}.md
- [ ] Implement `validatePathLength()` function
  - Max 240 chars, fail fast if exceeded
- [ ] Update `MarkdownWriter` to use new filename format
  - Modify src/bookmark-markdown/writer.ts
- [ ] Add tests for filename generation

### Phase 3: Migration Script Core
- [ ] Create `scripts/migrate-to-author-first.mjs`
  - CLI with dry-run, resume, verify flags
- [ ] Implement getDirectorySize() for disk calculation
- [ ] Implement checkDiskSpace() with 2.5x safety margin
  - Use statvfs, fallback for Windows
- [ ] Add preFlightChecks() function
  - Disk space, file counts, validation

### Phase 4: Migration Reliability
- [ ] Implement checkpoint system with `.migration-state.json`
  - Write every 100 files, resume capability
- [ ] Implement progress indicator with rate calculation
  - [=====>] 45% (382/847) | 234 files/sec
- [ ] Add comprehensive logging to `migration.log`
  - Structured entries with timestamp, level, phase, message
- [ ] Implement moveFileWithTimeout() with 5 second default
  - Promise.race with timeout
- [ ] Implement degraded mode markers
  - markMigrationFailed(), isDegradedMode(), clearDegradedMode()
  - Fallback to knowledge_degraded/ directory

### Phase 5: Verification & Rollback
- [ ] Implement checksum verification (SHA-256)
  - checksum(), verifyBackup() functions
- [ ] Create `scripts/rollback-migration.mjs`
  - Single-command rollback with verification
- [ ] Add backup verification (file counts + checksums)
- [ ] Add post-migration verification command
  --verify flag

### Phase 6: Concurrency & Locking
- [ ] Implement `.migration-lock` file handling
  - createMigrationLock(), checkMigrationLock(), clearMigrationLock()
- [ ] Update archiving code to check for lock
  - Pause with warning if migration in progress
- [ ] Add clear messaging when migration in progress

### Phase 7: Integration & Testing
- [ ] Test migration on sample dataset
- [ ] Test rollback on sample dataset
- [ ] Test resume after interruption
- [ ] Test concurrent write behavior
- [ ] Test degraded mode activation and recovery
- [ ] Update package.json with convenience scripts
  - migrate-knowledge, migrate-knowledge:dry-run, rollback-knowledge
- [ ] Document migration process in README

## Acceptance Criteria

- [ ] All existing files migrated without data loss
- [ ] New bookmarks use author-first structure with enhanced filenames
- [ ] Build succeeds with no broken links
- [ ] Migration script has dry-run mode with detailed output
- [ ] Real name lookup with fallback to handle-only
- [ ] Automated rollback script tested and documented
- [ ] Comprehensive path sanitization implemented (ASCII-only handles)
- [ ] Checksum verification before/after migration
- [ ] Checkpoint/resume capability functional
- [ ] CLI interface with all specified flags
- [ ] Confirmation flow (dry-run → prompt → execute)
- [ ] Migration logging to migration.log
- [ ] Progress indicator during migration
- [ ] Concurrency handling (pause with lock file)
- [ ] Path length validation (fail fast if >240 chars)
- [ ] ID suffix mandatory in filename generation
- [ ] TypeScript types defined for all new structures
- [ ] Real name cache format defined
- [ ] Disk space check implemented
- [ ] Per-file timeout implemented (5 second default)
- [ ] Degraded mode functional (fallback to knowledge_degraded/)
