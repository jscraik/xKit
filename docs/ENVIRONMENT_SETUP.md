# Environment Setup Guide

This guide covers setting up environment variables for xKit using 1Password for secure credential management.

## Overview

xKit requires various API keys and credentials for enhanced features. We use 1Password to securely manage these credentials and inject them at runtime.

## Prerequisites

- [1Password CLI](https://developer.1password.com/docs/cli/get-started/) installed
- 1Password account with a vault for development credentials
- Node.js 22+ installed

## Required Environment Variables

### Core Twitter/X Authentication

```bash
# Twitter/X API credentials (required for basic functionality)
AUTH_TOKEN="your_twitter_auth_token"
CT0="your_twitter_ct0_token"
```

**How to get these:**

1. Run `xkit setup` to extract from your browser
2. Or manually from browser cookies (see main README)

### Content Extraction & Enhancement (Optional)

```bash
# Ollama Configuration (for local AI processing)
OLLAMA_HOST="http://localhost:11434"           # Local Ollama server
OLLAMA_MODEL="qwen2.5:7b"                      # Default model for summarization
OLLAMA_CLOUD_API_KEY="your_ollama_cloud_key"  # For Ollama Cloud API (optional)

# OpenAI (for Whisper transcription - optional)
OPENAI_API_KEY="your_openai_api_key"

# Firecrawl (for advanced web scraping - optional)
FIRECRAWL_API_KEY="your_firecrawl_api_key"
```

### Media & Transcription (Optional)

```bash
# YouTube Data API (for enhanced video metadata - optional)
YOUTUBE_API_KEY="your_youtube_api_key"

# FAL.ai (alternative transcription service - optional)
FAL_KEY="your_fal_api_key"
```

### Webhook Notifications (Optional)

```bash
# Discord webhook for notifications
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Slack webhook for notifications
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

## 1Password Setup

### Step 1: Create a Vault

Create a dedicated vault in 1Password for xKit credentials:

```bash
# Create a new vault (or use existing)
op vault create "xKit Development"
```

### Step 2: Store Credentials

Store each credential as a secure note or API credential in 1Password:

```bash
# Example: Store Twitter auth token
op item create \
  --category="API Credential" \
  --title="xKit Twitter Auth" \
  --vault="xKit Development" \
  AUTH_TOKEN="your_token_here" \
  CT0="your_ct0_here"

# Example: Store Ollama Cloud API key
op item create \
  --category="API Credential" \
  --title="Ollama Cloud API" \
  --vault="xKit Development" \
  OLLAMA_CLOUD_API_KEY="your_key_here"

# Example: Store OpenAI API key
op item create \
  --category="API Credential" \
  --title="OpenAI API" \
  --vault="xKit Development" \
  OPENAI_API_KEY="your_key_here"
```

### Step 3: Create .env Template

Create a `.env.template` file in your project root:

```bash
# Twitter/X Authentication (required)
AUTH_TOKEN="op://xKit Development/xKit Twitter Auth/AUTH_TOKEN"
CT0="op://xKit Development/xKit Twitter Auth/CT0"

# Ollama Configuration (optional)
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:7b"
OLLAMA_CLOUD_API_KEY="op://xKit Development/Ollama Cloud API/OLLAMA_CLOUD_API_KEY"

# OpenAI (optional)
OPENAI_API_KEY="op://xKit Development/OpenAI API/OPENAI_API_KEY"

# Firecrawl (optional)
FIRECRAWL_API_KEY="op://xKit Development/Firecrawl API/FIRECRAWL_API_KEY"

# YouTube (optional)
YOUTUBE_API_KEY="op://xKit Development/YouTube API/YOUTUBE_API_KEY"

# Webhooks (optional)
DISCORD_WEBHOOK_URL="op://xKit Development/Discord Webhook/DISCORD_WEBHOOK_URL"
SLACK_WEBHOOK_URL="op://xKit Development/Slack Webhook/SLACK_WEBHOOK_URL"
```

### Step 4: Inject Environment Variables

Use 1Password CLI to inject secrets when running commands:

```bash
# Run xKit with 1Password secrets
op run --env-file=".env.template" -- pnpm run dev bookmarks-archive --all

# Or set up an alias in your shell
alias xkit-dev='op run --env-file=".env.template" -- pnpm run dev'

# Then use it
xkit-dev bookmarks-archive --all --organize-by-month
```

### Step 5: Add to Shell Profile (Optional)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# xKit with 1Password
alias xkit='op run --env-file="$HOME/dev/xKit/.env.template" -- pnpm --dir="$HOME/dev/xKit" run dev'
alias xkit-dev='cd ~/dev/xKit && op run --env-file=".env.template" -- pnpm run dev'
```

## Package.json Scripts

Add these scripts to `package.json` for convenience:

```json
{
  "scripts": {
    "dev:secure": "op run --env-file='.env.template' -- tsx src/cli.ts",
    "archive:secure": "op run --env-file='.env.template' -- tsx src/cli.ts bookmarks-archive",
    "test:live:secure": "op run --env-file='.env.template' -- vitest run tests/live"
  }
}
```

Usage:

```bash
pnpm run dev:secure bookmarks-archive --all --organize-by-month
pnpm run archive:secure --all --enrich --analyze
pnpm run test:live:secure
```

## Configuration Priority

xKit resolves credentials in this order:

1. **CLI flags** (highest priority)
2. **Environment variables** (from 1Password)
3. **Project config** (`./.xkitrc.json5`)
4. **Global config** (`~/.config/xkit/config.json5`)
5. **Default values** (lowest priority)

## Security Best Practices

### ✅ DO

- Store all API keys in 1Password
- Use `op run` to inject secrets at runtime
- Add `.env` and `.env.template` to `.gitignore`
- Rotate credentials regularly
- Use separate credentials for development and production

### ❌ DON'T

- Commit `.env` files to git
- Share API keys in plain text
- Use production credentials for development
- Store credentials in code or config files

## Verification

Test your setup:

```bash
# Verify 1Password CLI is working
op whoami

# Test credential injection
op run --env-file=".env.template" -- env | grep AUTH_TOKEN

# Run xKit with injected credentials
op run --env-file=".env.template" -- pnpm run dev bookmarks-archive --count 5
```

## Troubleshooting

### "op: command not found"

Install 1Password CLI:

```bash
# macOS
brew install --cask 1password-cli

# Or download from https://developer.1password.com/docs/cli/get-started/
```

### "Authentication required"

Sign in to 1Password CLI:

```bash
op signin
```

### "Item not found"

Verify the item exists and the reference is correct:

```bash
# List items in vault
op item list --vault="xKit Development"

# Get specific item
op item get "xKit Twitter Auth" --vault="xKit Development"
```

### Environment variables not loading

Check the `.env.template` syntax:

```bash
# Test loading
op run --env-file=".env.template" -- env | grep -E "(AUTH_TOKEN|OLLAMA|OPENAI)"
```

## Feature-Specific Setup

### For Article Extraction (Free)

No API keys needed! Uses local processing:

```bash
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:7b"
```

### For Video Transcription

**Option 1: Free (YouTube captions only)**
No setup needed - uses `yt-dlp` to download published captions.

**Option 2: Paid (Whisper for videos without captions)**

```bash
OPENAI_API_KEY="your_key_here"  # $0.006/minute
```

**Option 3: Cloud (Ollama Cloud)**

```bash
OLLAMA_CLOUD_API_KEY="your_key_here"
```

### For Advanced Web Scraping

**Option 1: Free (Basic extraction)**
No setup needed - uses built-in HTML parsing.

**Option 2: Paid (Firecrawl for blocked sites)**

```bash
FIRECRAWL_API_KEY="your_key_here"  # $16/month for 3,000 pages
```

## Example: Complete Setup

```bash
# 1. Create vault
op vault create "xKit Development"

# 2. Store Twitter credentials
op item create \
  --category="API Credential" \
  --title="xKit Twitter Auth" \
  --vault="xKit Development" \
  AUTH_TOKEN="$(op read 'op://Private/Twitter/auth_token')" \
  CT0="$(op read 'op://Private/Twitter/ct0')"

# 3. Store Ollama Cloud key (optional)
op item create \
  --category="API Credential" \
  --title="Ollama Cloud API" \
  --vault="xKit Development" \
  OLLAMA_CLOUD_API_KEY="your_ollama_cloud_key"

# 4. Create .env.template (see template above)

# 5. Test
op run --env-file=".env.template" -- pnpm run dev bookmarks-archive --count 5

# 6. Add alias to ~/.zshrc
echo 'alias xkit-dev="cd ~/dev/xKit && op run --env-file=\".env.template\" -- pnpm run dev"' >> ~/.zshrc
source ~/.zshrc

# 7. Use it!
xkit-dev bookmarks-archive --all --organize-by-month
```

## Next Steps

1. Set up your 1Password vault and credentials
2. Create `.env.template` with your references
3. Test with `op run --env-file=".env.template" -- pnpm run dev --help`
4. Start archiving: `xkit-dev bookmarks-archive --all --organize-by-month`

## Support

- [1Password CLI Documentation](https://developer.1password.com/docs/cli/)
- [xKit Documentation](./README.md)
- [Environment Variables Reference](./ENVIRONMENT_SETUP.md)
