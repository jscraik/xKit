---
inclusion: always
---

# Tech Stack

## Runtime & Language

- Node.js 22+ (required)
- TypeScript 5.9+ with strict mode
- ESM modules (type: "module")
- Bun for optional binary compilation

## Build System

- TypeScript compiler (tsc) for transpilation
- Bun for binary builds
- pnpm for package management (workspace support)
- Changesets for versioning and releases

## Key Dependencies

- `commander` - CLI framework
- `twitter-api-v2` - Twitter API client
- `@steipete/sweet-cookie` - Browser cookie extraction
- `ajv` + `ajv-formats` - JSON schema validation
- `fast-check` - Property-based testing
- `kleur` - Terminal colors
- `dotenv` - Environment variable loading

## Testing

- Vitest for unit and integration tests
- fast-check for property-based tests
- Coverage thresholds: 90% statements, 80% branches, 90% functions, 90% lines
- Live tests available via `pnpm test:live` (requires auth)

## Linting & Formatting

- Biome for formatting and linting (primary)
- oxlint for type-aware linting (secondary)
- Vale for documentation prose linting
- markdownlint-cli2 for markdown linting

## Code Style

- 2-space indentation
- Single quotes for strings
- Semicolons required
- 120 character line width
- Explicit file extensions required (.js imports)
- No `any` types allowed
- No non-null assertions
- No `forEach` (use for-of loops)
- Template literals preferred over concatenation

## Common Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm run dev              # Run CLI in dev mode
pnpm run build            # Build dist + binary
pnpm run build:dist       # Build dist only
pnpm run build:binary     # Build Bun binary only

# Testing
pnpm test                 # Run all tests
pnpm test:watch           # Run tests in watch mode
pnpm test:live            # Run live API tests (requires auth)

# Linting & Formatting
pnpm run lint             # Run all linters
pnpm run lint:fix         # Auto-fix linting issues
pnpm run format           # Format code with Biome
pnpm run lint:docs        # Lint documentation

# Releases
pnpm changeset            # Create a changeset
pnpm version              # Bump versions
pnpm release              # Publish to npm

# Utilities
pnpm run graphql:update   # Update query IDs baseline
```

## Architecture Patterns

- Mixin pattern for TwitterClient composition (withBookmarks, withSearch, etc.)
- Command pattern for CLI commands (src/commands/)
- Modular feature organization (src/bookmark-*/index.ts exports)
- Stateless client design with cookie-based auth
- Query ID caching with auto-refresh on 404
- Deterministic markdown output for archiving

## Configuration

- Global config: `~/.config/xkit/config.json5`
- Project config: `./.xkitrc.json5`
- Environment variables: `AUTH_TOKEN`, `CT0`, `XKIT_*` prefixed vars
- Precedence: CLI flags > env vars > project config > global config

## Error Handling

- Structured error taxonomy: validation | auth | rate_limit | dependency | timeout | unknown
- User-facing errors include actionable next steps
- No automatic retries for write operations
- Graceful degradation for enrichment failures
- Cookie redaction in error messages
