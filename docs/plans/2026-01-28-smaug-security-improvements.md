# Smaug X Article Security Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement security hardening from Smaug project's X article improvements (execFileSync instead of execSync, URL validation, link type detection)

**Architecture:** Replace shell-interpolating execSync calls with safe array-based execFileSync across all scripts; add content extraction utilities with URL protocol validation

**Tech Stack:** Node.js child_process (execFileSync), TypeScript, Vitest

---

## Overview

This plan implements **Phase 1 (HIGH PRIORITY Security Fixes)** from the Smaug X Article Improvements Analysis. The core security issue is that execSync with string commands enables shell interpolation, creating command injection vulnerabilities. The fix uses execFileSync with array arguments, bypassing the shell entirely.

**Why execFileSync prevents command injection:**
- execSync('pnpm run ' + user_input) → Command goes through shell → user_input containing '; rm -rf /' gets executed
- execFileSync('pnpm', ['run', user_input]) → Direct process spawn, no shell → semicolons treated literally, not executed

---

## Task 1: Fix scripts/export-improved.mjs

**Files:**
- Modify: scripts/export-improved.mjs:3 (import)
- Modify: scripts/export-improved.mjs:191 (execSync call)

**Step 1: Update import statement**

Replace line 3:
```javascript
// BEFORE:
import { execSync } from 'node:child_process';

// AFTER:
import { execFileSync } from 'node:child_process';
```

**Step 2: Update command execution**

Replace lines 191-195:
```javascript
// BEFORE:
const output = execSync('pnpm run xkit bookmarks --all --json', {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
});

// AFTER:
const output = execFileSync('pnpm', ['run', 'xkit', 'bookmarks', '--all', '--json'], {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
});
```

**Step 3: Test the script manually**

Run: `node scripts/export-improved.mjs`
Expected: Script executes without errors, produces export files

**Step 4: Commit**

```bash
git add scripts/export-improved.mjs
git commit -m "security: use execFileSync in export-improved.mjs

Replace execSync with execFileSync to prevent command injection
via shell interpolation. Array args bypass shell entirely.

Ref: docs/external/SMAUG_X_ARTICLE_IMPROVMENTS_ANALYSIS.md"
```

---

## Task 2: Fix scripts/export-bookmarks-by-year.mjs

**Files:**
- Modify: scripts/export-bookmarks-by-year.mjs:18 (import)
- Modify: scripts/export-bookmarks-by-year.mjs:87 (execSync call)

**Step 1: Update import statement**

Replace line 18:
```javascript
// BEFORE:
import { execSync } from 'node:child_process';

// AFTER:
import { execFileSync } from 'node:child_process';
```

**Step 2: Update command execution**

Replace lines 87-91:
```javascript
// BEFORE:
const output = execSync('pnpm run xkit bookmarks --all --json', {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
});

// AFTER:
const output = execFileSync('pnpm', ['run', 'xkit', 'bookmarks', '--all', '--json'], {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
});
```

**Step 3: Test the script manually**

Run: `node scripts/export-bookmarks-by-year.mjs --years 2024`
Expected: Script executes and exports 2024 bookmarks

**Step 4: Commit**

```bash
git add scripts/export-bookmarks-by-year.mjs
git commit -m "security: use execFileSync in export-bookmarks-by-year.mjs

Replace execSync with execFileSync to prevent command injection
via shell interpolation. Array args bypass shell entirely.

Ref: docs/external/SMAUG_X_ARTICLE_IMPROVMENTS_ANALYSIS.md"
```

---

## Task 3: Fix scripts/export-enhanced.mjs

**Files:**
- Modify: scripts/export-enhanced.mjs:3 (import)
- Modify: scripts/export-enhanced.mjs:73 (execSync call)

**Step 1: Update import statement**

Replace line 3:
```javascript
// BEFORE:
import { execSync } from 'node:child_process';

// AFTER:
import { execFileSync } from 'node:child_process';
```

**Step 2: Update command execution**

Replace lines 73-77:
```javascript
// BEFORE:
const output = execSync('pnpm run xkit bookmarks --all --json', {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
});

// AFTER:
const output = execFileSync('pnpm', ['run', 'xkit', 'bookmarks', '--all', '--json'], {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
});
```

**Step 3: Test the script manually**

Run: `node scripts/export-enhanced.mjs`
Expected: Script executes and creates enhanced export

**Step 4: Commit**

```bash
git add scripts/export-enhanced.mjs
git commit -m "security: use execFileSync in export-enhanced.mjs

Replace execSync with execFileSync to prevent command injection
via shell interpolation. Array args bypass shell entirely.

Ref: docs/external/SMAUG_X_ARTICLE_IMPROVMENTS_ANALYSIS.md"
```

---

## Task 4: Fix scripts/archive-user-profile.mjs

**Files:**
- Modify: scripts/archive-user-profile.mjs:12 (import)
- Modify: scripts/archive-user-profile.mjs:91 (execSync call)

**Step 1: Update import statement**

Replace line 12:
```javascript
// BEFORE:
import { execSync } from 'node:child_process';

// AFTER:
import { execFileSync } from 'node:child_process';
```

**Step 2: Update command execution (TRICKY - dynamic username)**

Replace lines 84-95. This is more complex because username comes from user input:

```javascript
// BEFORE:
const xkitCmd = format === 'json'
    ? `pnpm xkit user-timeline "${username}" --count ${effectiveLimit} --json`
    : `pnpm xkit user-timeline "${username}" --count ${effectiveLimit}`;

console.log(`Running: ${xkitCmd}\n`);

const output = execSync(xkitCmd, {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
});

// AFTER:
const args = ['xkit', 'user-timeline', username, '--count', effectiveLimit];
if (format === 'json') {
    args.push('--json');
}

console.log(`Running: pnpm ${args.join(' ')}\n`);

const output = execFileSync('pnpm', args, {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
});
```

**Step 3: Test the script manually**

Run: `node scripts/archive-user-profile.mjs @elonmusk --limit 10`
Expected: Script fetches 10 tweets without shell injection risk

**Step 4: Commit**

```bash
git add scripts/archive-user-profile.mjs
git commit -m "security: use execFileSync in archive-user-profile.mjs

Replace execSync with execFileSync to prevent command injection
via shell interpolation. Array args bypass shell entirely.

This is critical because username comes from CLI argument.

Ref: docs/external/SMAUG_X_ARTICLE_IMPROVMENTS_ANALYSIS.md"
```

---

## Task 5: Fix scripts/archive-user-daemon.mjs

**Files:**
- Modify: scripts/archive-user-daemon.mjs:12 (import)
- Modify: scripts/archive-user-daemon.mjs:110 (execSync call)

**Step 1: Update import statement**

Replace line 12:
```javascript
// BEFORE:
import { execSync } from 'node:child_process';

// AFTER:
import { execFileSync } from 'node:child_process';
```

**Step 2: Update command execution (TRICKY - dynamic query and count)**

Replace lines 107-114:

```javascript
// BEFORE:
const query = `from:${username}`;
const xkitCmd = `pnpm xkit search "${query}" --count ${config.limit} --json`;

const output = execSync(xkitCmd, {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 10 * 1024 * 1024,
});

// AFTER:
const query = `from:${username}`;
const args = ['xkit', 'search', query, '--count', String(config.limit), '--json'];

const output = execFileSync('pnpm', args, {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 10 * 1024 * 1024,
});
```

**Step 3: Test the script manually (daemon runs continuously, use timeout)**

Run: `timeout 5 node scripts/archive-user-daemon.mjs --users @elonmusk --interval 1`
Expected: Daemon starts, fetches tweets, stops after 5 seconds

**Step 4: Commit**

```bash
git add scripts/archive-user-daemon.mjs
git commit -m "security: use execFileSync in archive-user-daemon.mjs

Replace execSync with execFileSync to prevent command injection
via shell interpolation. Array args bypass shell entirely.

Critical because username and count come from config/CLI.

Ref: docs/external/SMAUG_X_ARTICLE_IMPROVMENTS_ANALYSIS.md"
```

---

## Task 6: Add URL validation utilities to src/security/sanitizer.ts

**Files:**
- Modify: src/security/sanitizer.ts (add new functions)
- Create: tests/security/url-validation.test.ts

**Step 1: Add URL validation functions**

Add to the end of src/security/sanitizer.ts:

```typescript
/**
 * Validate URL protocol for security.
 *
 * Attack Vector:
 * Malicious URL with dangerous protocol like file://, javascript:, data:
 *
 * Mitigation:
 * Only allow http: and https: protocols
 *
 * @param url - URL to validate
 * @returns true if protocol is http or https, false otherwise
 *
 * @example
 * validateUrlProtocol('https://example.com') // → true
 * validateUrlProtocol('file:///etc/passwd') // → false
 * validateUrlProtocol('javascript:alert(1)') // → false
 */
export function validateUrlProtocol(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Validate X (Twitter) article ID format.
 *
 * X article IDs are numeric strings (Snowflake IDs).
 *
 * @param articleId - Article ID to validate
 * @returns true if article ID is numeric, false otherwise
 *
 * @example
 * validateXArticleId('2012310917812502528') // → true
 * validateXArticleId('abc') // → false
 * validateXArticleId('123abc') // → false
 */
export function validateXArticleId(articleId: string): boolean {
  return /^\d+$/.test(String(articleId));
}
```

**Step 2: Add tests for new functions**

Create tests/security/url-validation.test.ts:

```typescript
import { describe, test } from 'vitest';
import assert from 'node:assert';
import { validateUrlProtocol, validateXArticleId } from '../../src/security/sanitizer.js';

describe('validateUrlProtocol', () => {
  test('accepts https URLs', () => {
    assert.strictEqual(validateUrlProtocol('https://example.com'), true);
    assert.strictEqual(validateUrlProtocol('https://x.com/i/article/123'), true);
  });

  test('accepts http URLs', () => {
    assert.strictEqual(validateUrlProtocol('http://example.com'), true);
  });

  test('rejects file:// protocol', () => {
    assert.strictEqual(validateUrlProtocol('file:///etc/passwd'), false);
  });

  test('rejects javascript: protocol', () => {
    assert.strictEqual(validateUrlProtocol('javascript:alert(1)'), false);
  });

  test('rejects data: protocol', () => {
    assert.strictEqual(validateUrlProtocol('data:text/html,<script>'), false);
  });

  test('rejects invalid URLs', () => {
    assert.strictEqual(validateUrlProtocol('not-a-url'), false);
    assert.strictEqual(validateUrlProtocol(''), false);
  });
});

describe('validateXArticleId', () => {
  test('accepts valid numeric article IDs', () => {
    assert.strictEqual(validateXArticleId('2012310917812502528'), true);
    assert.strictEqual(validateXArticleId('123'), true);
    assert.strictEqual(validateXArticleId('0'), true);
  });

  test('rejects non-numeric IDs', () => {
    assert.strictEqual(validateXArticleId('abc'), false);
    assert.strictEqual(validateXArticleId('123abc'), false);
    assert.strictEqual(validateXArticleId('abc123'), false);
  });

  test('rejects special characters', () => {
    assert.strictEqual(validateXArticleId('123-456'), false);
    assert.strictEqual(validateXArticleId('123_456'), false);
    assert.strictEqual(validateXArticleId('123.456'), false);
  });

  test('handles edge cases', () => {
    assert.strictEqual(validateXArticleId(''), false);
    assert.strictEqual(validateXArticleId(' 123 '), false); // whitespace not trimmed
  });
});
```

**Step 3: Run tests**

Run: `pnpm test tests/security/url-validation.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/security/sanitizer.ts tests/security/url-validation.test.ts
git commit -m "security: add URL protocol and X article ID validation

Add validateUrlProtocol() to restrict URLs to http/https only,
preventing file://, javascript:, data: and other dangerous protocols.

Add validateXArticleId() to ensure X article IDs are numeric
Snowflake IDs, preventing injection attacks.

Ref: docs/external/SMAUG_X_ARTICLE_IMPROVMENTS_ANALYSIS.md"
```

---

## Task 7: Create link type detector utility

**Files:**
- Create: src/content-extraction/link-detector.ts
- Create: src/content-extraction/index.ts
- Create: tests/content-extraction/link-detector.test.ts
- Modify: src/lib/index.ts (add export)

**Step 1: Create link-detector.ts**

Create src/content-extraction/link-detector.ts:

```typescript
/**
 * Link type detection for bookmark categorization
 *
 * Detects the type of content a URL points to, enabling proper
 * categorization and extraction logic.
 */

export type LinkType =
  | 'github'
  | 'video'
  | 'x-article'
  | 'media'
  | 'tweet'
  | 'image'
  | 'article';

/**
 * Detect the type of content a URL points to.
 *
 * @param url - URL to analyze
 * @returns Detected link type
 * @throws {Error} If URL protocol is not http/https
 *
 * @example
 * detectLinkType('https://x.com/i/article/2012310917812502528')
 * // → 'x-article'
 *
 * detectLinkType('https://github.com/user/repo')
 * // → 'github'
 */
export function detectLinkType(url: string): LinkType {
  // Security: Validate URL protocol first
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid URL protocol: ${parsed.protocol}`);
  }

  const lower = url.toLowerCase();

  // Check for X articles first (more specific than tweet)
  if (lower.includes('/i/article/')) {
    return 'x-article';
  }

  // GitHub repositories
  if (lower.includes('github.com')) {
    return 'github';
  }

  // Video platforms
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'video';
  }

  // X/Twitter media (photos/videos)
  if (lower.includes('/photo/') || lower.includes('/video/')) {
    return 'media';
  }

  // X/Twitter tweets
  if (lower.includes('x.com') || lower.includes('twitter.com')) {
    return 'tweet';
  }

  // Direct images
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
    return 'image';
  }

  // Default to article
  return 'article';
}

/**
 * Extract X article ID from an X article URL.
 *
 * @param url - X article URL
 * @returns Article ID or null if not found
 *
 * @example
 * extractXArticleId('https://x.com/i/article/2012310917812502528')
 * // → '2012310917812502528'
 *
 * extractXArticleId('https://x.com/user/status/123')
 * // → null
 */
export function extractXArticleId(url: string): string | null {
  const match = url.match(/\/i\/article\/(\d+)/);
  return match ? match[1] : null;
}
```

**Step 2: Create index.ts for exports**

Create src/content-extraction/index.ts:

```typescript
/**
 * Content extraction utilities
 *
 * This module provides utilities for detecting link types and
 * extracting content from various sources.
 */

export * from './link-detector.js';
```

**Step 3: Create tests**

Create tests/content-extraction/link-detector.test.ts with comprehensive tests for:
- detectLinkType: x-article, tweet, github, video, media, image, article detection
- Invalid URL protocol handling
- extractXArticleId: valid IDs, non-article URLs, invalid URLs

**Step 4: Update library exports**

Add to src/lib/index.ts:
```typescript
export * from '../content-extraction/index.js';
```

**Step 5: Run tests and lint**

Run: `pnpm test tests/content-extraction/link-detector.test.ts`
Run: `pnpm lint`
Expected: All tests pass, no linting errors

**Step 6: Commit**

```bash
git add src/content-extraction tests/content-extraction src/lib/index.ts
git commit -m "feat: add link type detector for bookmark categorization

Add detectLinkType() to identify URL types (x-article, github, video,
media, tweet, image, article) with protocol validation.

Add extractXArticleId() to parse X article IDs from URLs.

Ref: docs/external/SMAUG_X_ARTICLE_IMPROVMENTS_ANALYSIS.md"
```

---

## Task 8: Run full test suite and lint

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass including new URL validation and link detector tests

**Step 2: Run linting**

Run: `pnpm lint`
Expected: No linting errors

**Step 3: Run type checking**

Run: `pnpm run build:dist`
Expected: No type errors

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build completes successfully

---

## Task 9: Update documentation

**Files:**
- Create: docs/external/SMAUG_X_INTEGRATION_COMPLETE.md

**Step 1: Create completion summary**

Create docs/external/SMAUG_X_INTEGRATION_COMPLETE.md documenting:
- Phase 1 Security Fixes complete (all 5 scripts)
- URL validation utilities added
- Link type detector created
- Test coverage added
- Remaining phases (2-5) noted for future consideration

**Step 2: Commit documentation**

```bash
git add docs/external/SMAUG_X_INTEGRATION_COMPLETE.md
git commit -m "docs: record Smaug X article security improvements completion

Document completion of Phase 1 security fixes from Smaug project.
All execSync calls replaced with execFileSync, preventing command
injection via shell interpolation."
```

---

**End of Plan**
