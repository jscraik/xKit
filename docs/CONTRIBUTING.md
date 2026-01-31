# Contributing to xKit

Thank you for your interest in contributing to xKit! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Linting & Formatting](#linting--formatting)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Release Process](#release-process)

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

- **Node.js** >= 22 (use [mise](https://mise.jdx.dev/) or [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 10+ (`npm install -g pnpm`)
- **Bun** (optional, for binary builds)

### Fork & Clone

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/xKit.git
cd xKit

# Add upstream remote
git remote add upstream https://github.com/jscraik/xKit.git
```

### Install Dependencies

```bash
pnpm install
```

### Verify Setup

```bash
# Build should succeed
pnpm run build:dist

# Tests should pass
pnpm test

# Linting should pass
pnpm run lint
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

**Code Organization:**

- **One main concept per file** (split at ~300 LOC)
- **Functions at ~30 LOC** (split longer functions)
- **Prefer stdlib/native** over new dependencies
- **TypeScript strict mode** enforced

**Key Directories:**

| Directory | Purpose |
|-----------|---------|
| `src/cli.ts` | CLI entrypoint (binary) |
| `src/index.ts` | Library entrypoint (npm package) |
| `src/commands/` | CLI command implementations |
| `src/lib/` | Core Twitter client |
| `src/bookmark-*/` | Feature modules (enrichment, categorization, etc.) |
| `tests/` | Test files (mirrors `src/` structure) |

### 3. Build & Test

```bash
# Build for development
pnpm run build:dist

# Run CLI locally
pnpm run dev tweet "Test"
pnpm run dev -- --plain check

# Run tests
pnpm test

# Run specific test file
pnpm test tests/bookmark-enrichment
```

### 4. Lint & Format

```bash
# Check linting
pnpm run lint

# Auto-fix issues
pnpm run lint:fix

# Format code
pnpm run format
```

---

## Testing

### Test Structure

```
tests/
├── unit/                    # Unit tests (fast, isolated)
├── property/                # Property-based tests (fast-check)
├── integration/             # Integration tests (module interactions)
├── live/                    # Live API tests (requires XKIT_LIVE=1)
└── smoke/                   # Smoke tests (CI gating)
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode (development)
pnpm test:watch

# Live API tests (requires cookies)
XKIT_LIVE=1 pnpm test:live

# Specific test file
pnpm test tests/unit/twitter-client.test.ts
```

### Writing Tests

**Unit Test Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { BookmarkCategorizer } from '../src/bookmark-categorization';

describe('BookmarkCategorizer', () => {
  it('should categorize GitHub repos', () => {
    const categorizer = new BookmarkCategorizer();
    const result = categorizer.categorize({
      url: 'https://github.com/user/repo',
      text: 'Great repo!'
    });
    expect(result.category).toBe('github');
  });
});
```

**Property-Based Test Example:**

```typescript
import { describe, it } from 'vitest';
import { fc } from 'fast-check';
import { StateManager } from '../src/bookmark-state';

describe('StateManager', () => {
  it('should never lose processed IDs', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (ids) => {
        const manager = new StateManager();
        manager.markBatchProcessed(ids);
        return ids.every(id => manager.isProcessed(id));
      })
    );
  });
});
```

### Coverage Thresholds

- Statements: >= 90%
- Branches: >= 80%
- Functions: >= 90%
- Lines: >= 90%

---

## Linting & Formatting

xKit uses two linters for comprehensive coverage:

### Biome

Fast linter and formatter (default):

```bash
# Check
pnpm run lint:biome

# Auto-fix
pnpm run lint:biome:fix

# Format
pnpm run format
```

### oxlint

Type-aware linter with additional rules:

```bash
# Check
pnpm run lint:oxlint

# Auto-fix
pnpm run lint:oxlint:fix
```

### Documentation Linting

```bash
# Check docs
pnpm run lint:docs
```

Uses:
- **Vale** - Prose linting (style guide compliance)
- **markdownlint-cli2** - Markdown structure checks

---

## Commit Conventions

xKit uses [Changesets](https://github.com/changesets/changesets) for version management.

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Build process or dependencies

**Examples:**

```bash
feat(bookmark-export): add resumable export with state file

fix(llm-categorizer): handle timeout errors gracefully

docs(llm-integration): add troubleshooting section

refactor(twitter-client): extract cookie resolution to separate module
```

### Adding Changesets

For user-visible changes, create a changeset:

```bash
pnpm changeset
```

Follow prompts to:
1. Select change type (major/minor/patch)
2. Write a summary (user-facing)
3. Commit the `.changeset/*.md` file

**Example changeset:**

```markdown
---
"xkit": "minor"
---

Add LLM-powered bookmark categorization with OpenAI, Anthropic, and Ollama support.
```

---

## Pull Request Process

### 1. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 2. Create Pull Request

1. Go to https://github.com/jscraik/xKit/pulls
2. Click "New Pull Request"
3. Fill in the PR template (see `.github/PULL_REQUEST_TEMPLATE.md`)

### 3. PR Template Sections

- **Summary** - What does this PR do (1-3 sentences)?
- **Motivation / Context** - Why is this change needed?
- **What changed?** - Bullet list of key changes
- **How to test** - Exact commands + expected outcomes
- **Risk & rollout** - Risk level + rollback plan
- **Security / privacy** - Check if applicable
- **AI assistance** - Disclose AI use if applicable
- **Checklist** - Verify all items
- **Release notes** - User-facing note

### 4. CI Checks

Your PR must pass:
- ✅ **Smoke tests** - Basic functionality
- ✅ **Test suite** - Full test coverage
- ✅ **Doc linting** - Vale + markdownlint
- ✅ **Security audit** - No high/critical vulnerabilities

### 5. Code Review

- Address review feedback
- Keep commits clean (squash if needed)
- Request re-review when ready

### 6. Merge

- Maintainer will merge after approval
- Changeset will be applied in next release

---

## Documentation

### When to Update Docs

Update documentation when:
- Adding new commands or CLI flags
- Changing public API surface
- Modifying configuration options
- Fixing user-facing bugs
- Adding new features

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | User-facing overview and quickstart |
| `docs/llm-integration.md` | LLM provider setup and usage |
| `docs/api-reference.md` | Library API reference |
| `docs/configuration.md` | Configuration reference |
| `docs/troubleshooting.md` | Common issues and solutions |
| `docs/CUSTOM_TEMPLATES.md` | Custom template guide |
| `CLAUDE.md` | Project-specific instructions for AI |
| `CONTRIBUTING.md` | This file |

### Documentation Linting

```bash
# Check docs
pnpm run lint:docs

# Auto-fix (markdownlint only)
markdownlint-cli2 --fix "**/*.md"
```

### Writing Style

- **Be concise** - Prefer shorter, clearer explanations
- **Show examples** - Code examples for every feature
- **Link internally** - Cross-reference related docs
- **Date stamps** - Update "Last updated" fields
- **Use Vale** - Follow prose style guide

---

## Release Process

### Maintainers Only

Releases are automated via GitHub Actions when a changeset is merged to `main`.

### Manual Release (if needed)

```bash
# 1. Ensure all changesets are present
ls .changeset/*.md

# 2. Version packages (consumes changesets)
pnpm changeset version

# 3. Commit and push
git add package.json pnpm-lock.yaml CHANGELOG.md
git commit -m "version: release xkit@0.x.0"
git push

# 4. Publish (via CI or manually)
pnpm release
```

### Post-Release

1. Tag release in GitHub
2. Update `README.md` "Last updated" date
3. Create GitHub Release with changelog
4. Build Homebrew bottle (if applicable)

---

## Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and ideas
- **Existing Docs** - Check `docs/` first

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Last updated:** 2026-01-20
