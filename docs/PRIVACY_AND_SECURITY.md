# Privacy and Security Guide

## What's Already Protected

Your personal data is **already protected** by default:

### ✅ Gitignored (Not Committed to Git)

The following are already in `.gitignore`:

```gitignore
# Personal knowledge base
knowledge/

# Runtime state (processed bookmark IDs)
.xkit/

# Credentials
.env
.env.local
.env.*.local
.env.template

# Generated files
bookmarks.md
bookmarks.json
```

### Verify Protection

```bash
# Check if knowledge is ignored
git status knowledge/
# Should show nothing (ignored)

# Check if .xkit is ignored
git status .xkit/
# Should show nothing (ignored)
```

## Privacy Levels

### Level 1: Local Only (Current Setup) ✅

**What's protected:**

- ✅ Knowledge base (`knowledge/`)
- ✅ State files (`.xkit/`)
- ✅ Credentials (`.env`)
- ✅ Generated archives (`bookmarks.md`)

**What's public:**

- Source code
- Documentation
- Configuration examples

**Best for:**

- Open source contributors
- Sharing the tool with others
- Public repositories

### Level 2: Private Repository

**Make the entire repo private:**

```bash
# On GitHub
# Settings → General → Danger Zone → Change visibility → Make private
```

**Best for:**

- Personal forks
- Custom modifications
- Complete privacy

### Level 3: Separate Knowledge Repository

**Keep knowledge in a separate private repo:**

```bash
# Create separate private repo for knowledge
mkdir ~/my-knowledge
cd ~/my-knowledge
git init
git remote add origin git@github.com:yourusername/my-knowledge.git

# Symlink from xKit
cd ~/dev/xKit
rm -rf knowledge
ln -s ~/my-knowledge knowledge

# Now knowledge is in a separate private repo
cd ~/my-knowledge
git add .
git commit -m "Initial knowledge base"
git push -u origin main
```

**Best for:**

- Syncing knowledge across machines
- Backing up to private GitHub
- Keeping knowledge separate from tool

### Level 4: Encrypted Knowledge Base

**Encrypt sensitive bookmarks:**

```bash
# Install git-crypt
brew install git-crypt

# Initialize encryption in knowledge repo
cd ~/my-knowledge
git-crypt init

# Create .gitattributes
cat > .gitattributes << 'EOF'
# Encrypt all markdown files
*.md filter=git-crypt diff=git-crypt
*.json filter=git-crypt diff=git-crypt
EOF

# Add and commit
git add .gitattributes
git commit -m "Enable encryption"

# Export key for other machines
git-crypt export-key ~/my-knowledge.key
```

**Best for:**

- Highly sensitive bookmarks
- Compliance requirements
- Multi-machine sync with encryption

## What Gets Stored Where

### Local Files (Private)

```
knowledge/                    # Your personal knowledge base
├── 2026/01-jan/
│   ├── tools/@username/
│   │   └── repo-name.md     # GitHub repo content
│   └── articles/@username/
│       └── article-name.md  # Article content
.xkit/state/
└── bookmarks-state.json     # Processed bookmark IDs
bookmarks.md                 # Archive of all bookmarks
```

### What's in the Files

**Knowledge files contain:**

- GitHub repo READMEs
- Article full text
- AI-generated summaries
- Your bookmark metadata
- Tweet text from bookmarked tweets

**State file contains:**

- Bookmark IDs (just numbers)
- Timestamps
- No personal content

## Security Best Practices

### 1. Credentials

**Never commit credentials:**

```bash
# Already protected in .gitignore
.env
.env.local
.env.template
```

**Use 1Password for credentials:**

```bash
# Inject at runtime
op run --env-file=".env.template" -- pnpm run dev bookmarks-archive --all
```

### 2. Sensitive Bookmarks

**If you bookmark sensitive content:**

```bash
# Option 1: Don't archive it
# Just keep it on Twitter

# Option 2: Use a separate private repo
# See Level 3 above

# Option 3: Encrypt it
# See Level 4 above
```

### 3. Sharing Your Fork

**If you fork xKit publicly:**

```bash
# Your .gitignore already protects:
✅ knowledge/
✅ .xkit/
✅ .env
✅ bookmarks.md

# Safe to push:
✅ Source code changes
✅ Documentation updates
✅ Bug fixes
```

### 4. Backup Strategy

**Local backups:**

```bash
# Time Machine (macOS)
# Automatically backs up knowledge/

# Manual backup
tar -czf knowledge-backup-$(date +%Y%m%d).tar.gz knowledge/
```

**Cloud backups (encrypted):**

```bash
# Option 1: Private GitHub repo
cd ~/my-knowledge
git push

# Option 2: Encrypted cloud storage
# Use Cryptomator, Veracrypt, or similar
```

## Accidental Exposure Prevention

### Check Before Committing

```bash
# Always check what you're committing
git status
git diff --cached

# Verify knowledge is ignored
git check-ignore knowledge/
# Should output: knowledge/
```

### Remove Accidentally Committed Files

```bash
# If you accidentally committed knowledge/
git rm -r --cached knowledge/
git commit -m "Remove accidentally committed knowledge"
git push --force

# Then add to .gitignore (already there)
echo "knowledge/" >> .gitignore
git add .gitignore
git commit -m "Ensure knowledge is gitignored"
git push
```

### GitHub Secret Scanning

If you accidentally commit credentials:

1. **Rotate immediately** - Change AUTH_TOKEN and CT0
2. **Remove from history:**

   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   git push --force --all
   ```

3. **Use 1Password** going forward

## Privacy Checklist

Before pushing to GitHub:

- [ ] `knowledge/` is in `.gitignore`
- [ ] `.xkit/` is in `.gitignore`
- [ ] `.env` files are in `.gitignore`
- [ ] Run `git status` to verify
- [ ] No personal data in commit
- [ ] No credentials in code

## Recommended Setup

**For most users:**

```bash
# 1. Keep xKit repo public (for contributions)
# 2. Keep knowledge/ gitignored (already done)
# 3. Use 1Password for credentials
# 4. Backup knowledge/ with Time Machine
```

**For sensitive use cases:**

```bash
# 1. Fork xKit privately
# 2. Or use separate private repo for knowledge/
# 3. Enable encryption with git-crypt
# 4. Use 1Password for credentials
```

## Summary

✅ **Your knowledge base is already private** - it's in `.gitignore`

✅ **Your credentials are protected** - `.env` is gitignored

✅ **Safe to push code changes** - personal data won't be committed

✅ **Backup locally** - Time Machine or manual backups

For extra security, consider:

- Private repository
- Separate knowledge repo
- Encryption with git-crypt
- 1Password for credentials (already recommended)
