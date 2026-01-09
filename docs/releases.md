# Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## How to Release

### 1. Create a Changeset

When you make changes for release, create a changeset:

```bash
pnpm changeset
```

The prompt asks for:

- Select the change type (major, minor, patch)
- Write a summary of the change

Commit the changeset file with your PR.

### 2. Merge to Main

After your PR merges to `main`, the Release workflow automatically:

- Create or update a "Release PR" that:
  - Bumps version in `package.json`
  - Updates `CHANGELOG.md`
  - Aggregates all pending changesets

### 3. Publish the Release

When you want to publish:

1. Review the Release PR
2. Merge the Release PR
3. The workflow then:
   - Publish to npm
   - Create a GitHub release with the changelog

## Change Types

- **Patch** (`0.6.0` → `0.6.1`): Bug fixes, minor improvements
- **Minor** (`0.6.0` → `0.7.0`): New features, non-breaking changes
- **Major** (`0.6.0` → `1.0.0`): Breaking changes

## Examples

### Adding a new feature

```bash
pnpm changeset
# Select: minor
# Summary: "Add support for direct messages"
```

### Fixing a bug

```bash
pnpm changeset
# Select: patch
# Summary: "Fix authentication error handling"
```

### Breaking change

```bash
pnpm changeset
# Select: major
# Summary: "Change config file format from JSON to YAML"
```

## GitHub Setup

To enable automatic publishing, add your npm token to GitHub secrets:

1. Go to <https://github.com/jscraik/xKit/settings/secrets/actions>
2. Add a new secret:
   - Name: `NPM_TOKEN`
   - Value: Your npm access token (create at <https://www.npmjs.com/settings/YOUR_USERNAME/tokens>)

## Manual Release

For a manual release:

```bash
# 1. Create a changeset
pnpm changeset

# 2. Update version and changelog
pnpm run version

# 3. Commit the changes
git add .
git commit -m "chore: release"

# 4. Publish to npm
pnpm run release

# 5. Create GitHub release
gh release create v$(node -p "require('./package.json').version") --generate-notes
```

## Workflow Files

- `.github/workflows/release.yml` - Automated release workflow
- `.changeset/config.json` - Changesets configuration
- `package.json` - Release scripts
