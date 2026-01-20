# xKit Configuration Reference

**Last updated:** 2026-01-20

Complete reference for all xKit configuration options, environment variables, and precedence rules.

## Table of Contents

- [Precedence](#precedence)
- [Global Config](#global-config)
- [Project Config](#project-config)
- [Environment Variables](#environment-variables)
- [CLI Flags](#cli-flags)
- [Specialized Configs](#specialized-configs)
- [Examples](#examples)

---

## Precedence

Configuration values are resolved in the following order (highest to lowest priority):

```
1. CLI Flags (command-line arguments)
2. Environment Variables
3. Project Config (.xkitrc.json5 in current directory)
4. Global Config (~/.config/xkit/config.json5)
5. Built-in Defaults
```

**Example:** If `timeoutMs` is set in:
- CLI flag: `--timeout 5000` → **Used (highest priority)**
- Env var: `XKIT_TIMEOUT_MS=10000`
- Global config: `timeoutMs: 20000`
- Default: `20000`

The CLI flag value (`5000`) takes precedence.

---

## Global Config

**Location:** `~/.config/xkit/config.json5`

**Purpose:** User-wide defaults for all xKit projects.

### Example Configuration

```json5
{
  // Cookie sources for browser extraction (order matters)
  cookieSource: ["safari", "chrome"],

  // Browser profile for cookie extraction
  chromeProfile: "Default",
  firefoxProfile: "default-release",

  // Timeouts
  cookieTimeoutMs: 30000,
  timeoutMs: 20000,

  // Output formatting
  quoteDepth: 1,

  // Template directory for custom prompts
  templateDir: "~/.xkit/templates",

  // Ollama configuration
  ollamaHost: "http://localhost:11434",

  // Model configuration
  llmModel: "qwen2.5:7b",
  embeddingModel: "nomic-embed-text"
}
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookieSource` | string \| string[] | `["safari", "chrome", "firefox"]` | Browser(s) to read cookies from, in order |
| `chromeProfile` | string | `"Default"` | Chrome profile name for cookie extraction |
| `firefoxProfile` | string | `"default-release"` | Firefox profile name for cookie extraction |
| `cookieTimeoutMs` | number | `30000` | Cookie extraction timeout (milliseconds) |
| `timeoutMs` | number | `20000` | Request timeout for API calls (milliseconds) |
| `quoteDepth` | number | `1` | Max quoted tweet depth in JSON output (0 = disabled) |
| `templateDir` | string | `~/.xkit/templates` | Directory for custom summarization templates |
| `ollamaHost` | string | `http://localhost:11434` | Ollama server URL |
| `llmModel` | string | `qwen2.5:7b` | Default Ollama model |
| `embeddingModel` | string | `nomic-embed-text` | Default Ollama embedding model |

---

## Project Config

**Location:** `.xkitrc.json5` (in project root)

**Purpose:** Project-specific settings that override global defaults.

### Example Configuration

```json5
{
  // Project-specific timeout
  timeoutMs: 60000,

  // Use Firefox cookies for this project
  cookieSource: ["firefox"],

  // Custom output directory for archives
  knowledgeDir: "./docs/knowledge",
  archiveDir: "./docs/archive",

  // Timezone for date formatting
  timezone: "America/Los_Angeles",

  // Archive preferences
  includeMedia: true,
  skipCategorization: false,
  skipEnrichment: false
}
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeoutMs` | number | `20000` | Request timeout (milliseconds) |
| `cookieSource` | string \| string[] | (from global) | Browser(s) for cookie extraction |
| `knowledgeDir` | string | `./knowledge` | Knowledge base output directory |
| `archiveDir` | string | `./archive` | Archive file output directory |
| `timezone` | string | (local timezone) | Timezone for date formatting |
| `includeMedia` | boolean | `false` | Include media attachments in output |
| `skipCategorization` | boolean | `false` | Skip bookmark categorization |
| `skipEnrichment` | boolean | `false` | Skip URL enrichment |

---

## Environment Variables

### Authentication

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_TOKEN` | X/Twitter auth_token cookie | `aba2...` |
| `CT0` | X/Twitter ct0 (csrf) cookie | `1a2b...` |
| `TWITTER_AUTH_TOKEN` | Alternative to AUTH_TOKEN | `aba2...` |
| `TWITTER_CT0` | Alternative to CT0 | `1a2b...` |

### X API (for export-bookmarks command)

| Variable | Description | Example |
|----------|-------------|---------|
| `X_API_KEY` | X API key | `abcd1234` |
| `X_API_SECRET` | X API secret | `xyz789` |
| `X_ACCESS_TOKEN` | X access token (optional) | `token` |
| `X_ACCESS_SECRET` | X access secret (optional) | `secret` |

### LLM Providers

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `LLM_MODEL` | Override default model name | `gpt-4-turbo` |

### Ollama

| Variable | Description | Example |
|----------|-------------|---------|
| `OLLAMA_HOST` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Default Ollama model | `qwen2.5:7b` |
| `OLLAMA_EMBEDDING_MODEL` | Embedding model | `nomic-embed-text` |

### Timeouts & Behavior

| Variable | Description | Example |
|----------|-------------|---------|
| `XKIT_TIMEOUT_MS` | Request timeout | `30000` |
| `XKIT_COOKIE_TIMEOUT_MS` | Cookie extraction timeout | `30000` |
| `XKIT_QUOTE_DEPTH` | JSON quote depth | `1` |
| `NO_COLOR` | Disable ANSI colors | `1` |

### Cache & State

| Variable | Description | Example |
|----------|-------------|---------|
| `XKIT_QUERY_IDS_CACHE` | Query IDs cache path | `~/.config/xkit/query-ids-cache.json` |

### Logging

| Variable | Description | Example |
|----------|-------------|---------|
| `XKIT_LOG_LEVEL` | Log level | `debug`, `info`, `warn`, `error` |

---

## CLI Flags

### Global Flags (available on all commands)

| Flag | Short | Description | Environment Variable |
|-----|-------|-------------|---------------------|
| `--auth-token <token>` | - | Set auth_token manually | `AUTH_TOKEN` |
| `--ct0 <token>` | - | Set ct0 cookie manually | `CT0` |
| `--cookie-source <source>` | - | Cookie source (safari\|chrome\|firefox) | - |
| `--chrome-profile <name>` | - | Chrome profile name | - |
| `--firefox-profile <name>` | - | Firefox profile name | - |
| `--cookie-timeout <ms>` | - | Cookie extraction timeout | `XKIT_COOKIE_TIMEOUT_MS` |
| `--timeout <ms>` | - | Request timeout | `XKIT_TIMEOUT_MS` |
| `--quote-depth <n>` | - | Quote tweet depth (0=disabled) | `XKIT_QUOTE_DEPTH` |
| `--plain` | - | Stable output (no emoji, no ANSI) | `NO_COLOR=1` |
| `--no-emoji` | - | Disable emoji output | - |
| `--no-color` | - | Disable ANSI colors | `NO_COLOR=1` |

### Command-Specific Flags

#### `xkit archive`

| Flag | Description | Default |
|-----|-------------|---------|
| `-n, --count <number>` | Number of bookmarks | `20` |
| `--all` | Fetch all bookmarks | `false` |
| `--max-pages <number>` | Max pages to fetch | unlimited |
| `--folder-id <id>` | Specific bookmark folder | all folders |
| `--force` | Re-process existing bookmarks | `false` |
| `--skip-enrichment` | Skip URL enrichment | `false` |
| `--skip-categorization` | Skip categorization | `false` |
| `--include-media` | Include media attachments | `false` |
| `--output-dir <path>` | Knowledge base directory | `./knowledge` |
| `--archive-file <path>` | Archive file path | `./archive/bookmarks.md` |
| `--timezone <tz>` | Timezone for dates | local timezone |
| `--summarize` | Enable AI summarization | `false` |
| `--persona <name>` | Summarization persona | - |
| `--length <level>` | Summary length | `medium` |
| `--template <name>` | Custom template name | - |
| `--var <key=value>` | Template variable | - |
| `--webhook-url <url>` | Webhook URL | - |
| `--webhook-type <type>` | Webhook type (discord\|slack\|generic) | - |
| `--stats` | Show detailed statistics | `false` |

#### `xkit analyze-bookmarks`

| Flag | Description | Default |
|-----|-------------|---------|
| `--input <file>` | Input JSON file (required) | - |
| `--output <file>` | Output file path | auto-generated |
| `--method <method>` | Scoring method (llm\|heuristic\|hybrid) | `hybrid` |
| `--scripts <paths>` | Comma-separated script paths | - |
| `--config <path>` | Config file path | `.bookmark-analysis.config.json` |
| `--model-strategy <strategy>` | Model strategy (fast\|balanced\|quality\|optimized) | `balanced` |
| `--embed` | Generate embeddings | `false` |
| `--similar <id>` | Find similar bookmarks | - |
| `--embedding-model <name>` | Ollama embedding model | `nomic-embed-text` |
| `--ollama-host <url>` | Ollama server URL | `http://localhost:11434` |

#### `xkit export-bookmarks`

| Flag | Description | Default |
|-----|-------------|---------|
| `--resume` | Resume previous export | `false` |
| `--output-dir <directory>` | Output directory | `./exports` |
| `--config <path>` | Config file path | `.bookmark-export.config.json` |

#### `xkit daemon`

| Flag | Description | Default |
|-----|-------------|---------|
| `start` subcommand flags: | | |
| `--interval <time>` | Run interval | `30m` |
| `--run-now` | Run on start | `false` |

#### Search & Fetch Commands

| Command | Flag | Description | Default |
|---------|------|-------------|---------|
| `search` | `-n, --count <number>` | Number of results | `20` |
| `mentions` | `-n, --count <number>` | Number of results | `20` |
| `mentions` | `--user <@handle>` | Specific user | auth user |
| `news` | `-n, --count <number>` | Number of results | `10` |
| `news` | `--tabs <tabs>` | Comma-separated tabs | `for_you,news,sports,entertainment` |
| `news` | `--ai-only` | AI-curated only | `true` |
| `bookmarks` | `-n, --count <number>` | Number of results | `20` |
| `bookmarks` | `--folder-id <id>` | Specific folder | all |
| `bookmarks` | `--all` | Fetch all | `false` |
| `bookmarks` | `--max-pages <n>` | Max pages | unlimited |
| `likes` | `-n, --count <number>` | Number of results | `20` |
| `following` | `--user <userId>` | Specific user | auth user |
| `following` | `-n, --count <number>` | Number of results | `20` |
| `followers` | `--user <userId>` | Specific user | auth user |
| `followers` | `-n, --count <number>` | Number of results | `20` |

---

## Specialized Configs

### Bookmark Analysis Config

**Location:** `.bookmark-analysis.config.json`

**Purpose:** LLM and analysis settings for `xkit analyze-bookmarks`.

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "${OPENAI_API_KEY}",
    "model": "gpt-4",
    "maxTokens": 500,
    "temperature": 0.7
  },
  "scoring": {
    "method": "hybrid",
    "llmWeight": 0.6,
    "heuristicWeight": 0.4
  },
  "scripts": ["./custom-analyzer.js"],
  "output": {
    "directory": "./analysis",
    "filenamePattern": "bookmarks_analysis_{timestamp}.json"
  }
}
```

### Bookmark Export Config

**Location:** `.bookmark-export.config.json`

**Purpose:** X API settings for `xkit export-bookmarks`.

```json
{
  "xApi": {
    "apiKey": "${X_API_KEY}",
    "apiSecret": "${X_API_SECRET}",
    "accessToken": "${X_ACCESS_TOKEN}",
    "accessSecret": "${X_ACCESS_SECRET}"
  },
  "output": {
    "directory": "./exports",
    "filenamePattern": "bookmarks_export_{timestamp}.json"
  },
  "rateLimit": {
    "maxRetries": 3,
    "backoffMultiplier": 2
  }
}
```

### Custom Templates

**Location:** `~/.xkit/templates/*.md`

**Purpose:** Domain-specific summarization prompts.

```markdown
---
name: research-paper
description: Academic paper summary
category: academic
variables:
  domain: Computer Science
  focus: algorithms
---

You are analyzing a {{domain}} research paper.
Focus your summary on: {{focus}}
```

See [Custom Templates Guide](CUSTOM_TEMPLATES.md) for details.

---

## Examples

### Minimal Config

**~/.config/xkit/config.json5**

```json5
{
  cookieSource: ["safari"],
  timeoutMs: 20000
}
```

### Development Config

**~/.config/xkit/config.json5**

```json5
{
  cookieSource: ["chrome"],
  chromeProfile: "Profile 1",
  timeoutMs: 60000,
  quoteDepth: 2,
  ollamaHost: "http://localhost:11434",
  llmModel: "llama3:8b"
}
```

### Production Archiving Config

**.xkitrc.json5**

```json5
{
  knowledgeDir: "./docs/knowledge",
  archiveDir: "./docs/archive",
  timezone: "America/New_York",
  includeMedia: true,
  skipEnrichment: false,
  skipCategorization: false
}
```

### LLM Analysis Config

**.bookmark-analysis.config.json**

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-haiku-20240307",
    "maxTokens": 300,
    "temperature": 0.5
  },
  "scoring": {
    "method": "llm"
  },
  "output": {
    "directory": "./analysis",
    "filenamePattern": "analysis_{timestamp}.json"
  }
}
```

### Environment Variables Setup

**~/.zshrc or ~/.bashrc**

```bash
# X/Twitter Authentication
export AUTH_TOKEN="your_auth_token_here"
export CT0="your_ct0_here"

# OpenAI (optional, for LLM features)
export OPENAI_API_KEY="sk-..."

# Anthropic (optional, alternative LLM)
export ANTHROPIC_API_KEY="sk-ant-..."

# Ollama (if using local models)
export OLLAMA_HOST="http://localhost:11434"
export OLLAMA_MODEL="qwen2.5:7b"
export OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# Timeouts
export XKIT_TIMEOUT_MS="30000"
export XKIT_COOKIE_TIMEOUT_MS="30000"

# Logging
export XKIT_LOG_LEVEL="info"
```

**Never commit credentials to version control.** Use `.env` files (gitignored) or environment variable management tools like `direnv`.

---

## See Also

- [LLM Integration Guide](llm-integration.md) - LLM provider configuration
- [Custom Templates](CUSTOM_TEMPLATES.md) - Template configuration
- [API Reference](api-reference.md) - Programmatic configuration
- [Troubleshooting](troubleshooting.md) - Configuration issues

---

**Last updated:** 2026-01-20
**Next review:** 2026-04-20 (quarterly, or after each release)
