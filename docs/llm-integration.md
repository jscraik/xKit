# LLM Integration Guide

**Last updated:** 2026-01-20

xKit supports multiple LLM providers for bookmark categorization, usefulness scoring, and semantic analysis. This guide covers configuration, usage, and cost optimization.

## Table of Contents

- [Overview](#overview)
- [Providers](#providers)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Cost Optimization](#cost-optimization)
- [Embeddings](#embeddings)
- [Troubleshooting](#troubleshooting)

---

## Overview

xKit's LLM integration supports three providers:

| Provider | Type | Best For | Cost |
|----------|------|----------|------|
| **OpenAI** | Cloud API | High-quality categorization | Paid per token |
| **Anthropic** | Cloud API | Fast, cost-effective categorization | Paid per token |
| **Ollama** | Local | Privacy, zero cost, embeddings | Free (local) |

### Use Cases

- **Categorization**: Auto-categorize bookmarks by topic using LLM analysis
- **Usefulness Scoring**: Rate bookmark quality and relevance
- **Semantic Search**: Find similar bookmarks using vector embeddings
- **Custom Analysis**: Run custom analysis scripts via `analyze-bookmarks`

---

## Quick Start

### Option 1: OpenAI (Recommended for Quality)

```bash
# Set API key
export OPENAI_API_KEY="sk-..."

# Analyze bookmarks with LLM categorization
xkit analyze-bookmarks --input bookmarks.json --output analysis.json

# Use with cost optimization strategy
xkit analyze-bookmarks --input bookmarks.json --model-strategy balanced
```

### Option 2: Anthropic (Recommended for Speed/Cost)

```bash
# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Analyze bookmarks
xkit analyze-bookmarks --input bookmarks.json --method llm
```

### Option 3: Ollama (Recommended for Privacy/Embeddings)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama server
ollama serve

# Pull a model (optional: uses default qwen2.5:7b)
ollama pull qwen2.5:7b

# Pull embedding model for semantic search
ollama pull nomic-embed-text

# Analyze with local model (no API key needed)
xkit analyze-bookmarks --input bookmarks.json --method llm

# Generate embeddings for semantic search
xkit analyze-bookmarks --input bookmarks.json --embed

# Find similar bookmarks
xkit analyze-bookmarks --input bookmarks.json --similar <bookmark-id>
```

---

## Configuration

### Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."
export LLM_MODEL="gpt-4"  # Optional: override default model

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
export LLM_MODEL="claude-3-haiku-20240307"  # Optional

# Ollama
export OLLAMA_HOST="http://localhost:11434"  # Optional
export OLLAMA_MODEL="qwen2.5:7b"  # Optional
export OLLAMA_EMBEDDING_MODEL="nomic-embed-text"  # Optional
```

### Configuration File

Create `.bookmark-analysis.config.json` in your project root:

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
  "output": {
    "directory": "./analysis",
    "filenamePattern": "bookmarks_analysis_{timestamp}.json"
  }
}
```

### Provider-Specific Models

#### OpenAI Models

| Model | Quality | Speed | Cost (per 1M tokens) |
|-------|---------|-------|---------------------|
| `gpt-4` | Best | Slowest | $30 input / $60 output |
| `gpt-4-turbo` | Excellent | Fast | $10 input / $30 output |
| `gpt-3.5-turbo` | Good | Fastest | $0.50 input / $1.50 output |

```bash
export LLM_MODEL="gpt-4-turbo"  # Recommended balance
```

#### Anthropic Models

| Model | Quality | Speed | Cost (per 1M tokens) |
|-------|---------|-------|---------------------|
| `claude-3-opus-20240229` | Best | Slow | $15 input / $75 output |
| `claude-3-sonnet-20240229` | Excellent | Medium | $3 input / $15 output |
| `claude-3-haiku-20240307` | Good | Fast | $0.25 input / $1.25 output |

```bash
export LLM_MODEL="claude-3-haiku-20240307"  # Recommended for speed/cost
```

#### Ollama Models

| Model | Quality | RAM Required | Speed |
|-------|---------|--------------|-------|
| `qwen2.5:7b` | Good | 4-8GB | Fast |
| `qwen2.5:14b` | Better | 8-16GB | Medium |
| `llama3:8b` | Good | 8GB | Fast |
| `mistral:7b` | Good | 4-8GB | Fast |

**Embedding Models:**

| Model | Dimensions | Quality |
|-------|------------|---------|
| `nomic-embed-text` | 768 | Good (default) |
| `mxbai-embed-large` | 1024 | Better |
| `snowflake-arctic-embed2` | 768 | Good |
| `qwen3-embedding` | 1024 | Better |

---

## Usage

### Analyze Bookmarks

```bash
# Basic analysis with heuristic scoring (no LLM required)
xkit analyze-bookmarks --input bookmarks.json --method heuristic

# LLM categorization
xkit analyze-bookmarks --input bookmarks.json --method llm

# Hybrid scoring (LLM + heuristics)
xkit analyze-bookmarks --input bookmarks.json --method hybrid

# Custom output path
xkit analyze-bookmarks --input bookmarks.json --output my-analysis.json
```

### Advanced Options

```bash
# Use custom config file
xkit analyze-bookmarks --input bookmarks.json --config my-config.json

# Run custom analysis scripts
xkit analyze-bookmarks --input bookmarks.json --scripts ./analyze-pr.js,./sentiment.js

# Model cost optimization strategy
xkit analyze-bookmarks --input bookmarks.json --model-strategy fast
xkit analyze-bookmarks --input bookmarks.json --model-strategy balanced
xkit analyze-bookmarks --input bookmarks.json --model-strategy quality
xkit analyze-bookmarks --input bookmarks.json --model-strategy optimized
```

### Analysis Results Format

```json
{
  "bookmarks": [
    {
      "id": "1234567890",
      "categories": ["technology", "programming", "typescript"],
      "usefulnessScore": 0.87,
      "usefulnessBreakdown": {
        "engagement": 0.9,
        "recency": 0.7,
        "contentQuality": 0.95
      }
    }
  ],
  "metadata": {
    "analyzedAt": "2026-01-20T12:00:00Z",
    "totalBookmarks": 100,
    "successfulAnalyses": 98,
    "failedAnalyses": 2
  }
}
```

---

## Cost Optimization

xKit includes a **Model Router** with predefined cost-optimization strategies that automatically select the best model for each operation.

### Strategies

| Strategy | Description | Use When |
|----------|-------------|----------|
| `fast` | Cheapest models, acceptable quality | Large datasets, prototyping |
| `balanced` | Good quality, reasonable cost | Most use cases (default) |
| `quality` | Best models, higher cost | Critical analysis, small datasets |
| `optimized` | Adaptive routing based on task | Maximum cost efficiency |

### Strategy Configuration

```bash
# Use fast strategy for large dataset
xkit analyze-bookmarks --input large-export.json --model-strategy fast

# Use quality strategy for important analysis
xkit analyze-bookmarks --input curated.json --model-strategy quality

# Use optimized for adaptive routing
xkit analyze-bookmarks --input bookmarks.json --model-strategy optimized
```

### How It Works

The Model Router defines **model tiers** and routes requests based on the operation type:

```javascript
// Example: balanced strategy
{
  tiers: {
    fast: ["gpt-3.5-turbo", "claude-3-haiku-20240307"],
    balanced: ["gpt-4-turbo", "claude-3-sonnet-20240229"],
    quality: ["gpt-4", "claude-3-opus-20240229"]
  },
  strategy: {
    categorization: ["balanced", "fast", "quality"],      // Try balanced first
    usefulness: ["quality", "balanced", "fast"],          // Try quality first
    summarization: ["quality", "balanced"]                // Only use quality/balanced
  }
}
```

If a model fails (rate limit, error), the router **automatically falls back** to the next tier.

### Custom Strategy

Create a custom strategy in `.bookmark-analysis.config.json`:

```json
{
  "modelRouter": {
    "tiers": {
      "my-fast": ["gpt-3.5-turbo"],
      "my-quality": ["gpt-4-turbo"]
    },
    "strategy": {
      "categorization": ["my-fast", "my-quality"]
    }
  }
}
```

---

## Embeddings

Ollama provides **semantic embeddings** for finding similar bookmarks using vector similarity.

### Generate Embeddings

```bash
# Generate embeddings for all bookmarks
xkit analyze-bookmarks --input bookmarks.json --embed

# Use custom embedding model
xkit analyze-bookmarks --input bookmarks.json --embed --embedding-model mxbai-embed-large

# Use custom Ollama host
xkit analyze-bookmarks --input bookmarks.json --embed --ollama-host http://localhost:11434
```

### Find Similar Bookmarks

```bash
# Find bookmarks similar to a specific ID
xkit analyze-bookmarks --input bookmarks.json --similar 1234567890

# Output example:
# Top 5 similar bookmarks:
# 87.5%  [9876543210]
#       Building scalable APIs with TypeScript
#       by @typescriptexpert
```

### Embedding Storage

Embeddings are cached in `./embeddings/embeddings.json`:

```json
{
  "embeddings": [
    {
      "bookmarkId": "1234567890",
      "vector": [0.12, -0.34, 0.56, ...],
      "model": "nomic-embed-text",
      "generatedAt": "2026-01-20T12:00:00Z"
    }
  ]
}
```

**Performance:** ~100-500ms per embedding on CPU (varies by model and hardware).

---

## Troubleshooting

### OpenAI Errors

**Error:** `OpenAI API error: 401`

```
Cause: Invalid API key
Fix: Verify OPENAI_API_KEY is set correctly
```

**Error:** `OpenAI API error: 429`

```
Cause: Rate limit exceeded
Fix: Wait 15-30 minutes, or use --model-strategy fast with cheaper models
```

### Anthropic Errors

**Error:** `Anthropic API error: 401`

```
Cause: Invalid API key
Fix: Verify ANTHROPIC_API_KEY is set correctly
```

**Error:** `Anthropic API error: 529`

```
Cause: Overloaded API
Fix: Retry with exponential backoff (automatic in xKit)
```

### Ollama Errors

**Error:** `Ollama not available at http://localhost:11434`

```
Cause: Ollama server not running
Fix: Start Ollama with 'ollama serve'
```

**Error:** `model 'qwen2.5:7b' not found`

```
Cause: Model not downloaded
Fix: Pull model with 'ollama pull qwen2.5:7b'
```

**Error:** `model 'nomic-embed-text' not found`

```
Cause: Embedding model not downloaded
Fix: Pull model with 'ollama pull nomic-embed-text'
```

### LLM Categorization Failures

**Symptom:** All bookmarks categorized as "uncategorized"

```
Cause: LLM API error or timeout
Fix:
1. Check API key is valid
2. Check network connectivity
3. Try cheaper/faster model
4. Check logs in ~/.xkit/logs/
```

### Performance Issues

**Symptom:** Analysis is very slow

```
Cause: API latency or rate limiting
Fix:
1. Use Ollama for local inference (zero latency)
2. Use --model-strategy fast with cheaper models
3. Reduce concurrent requests (config option)
```

### Debug Mode

Enable verbose logging:

```bash
# Set log level
export XKIT_LOG_LEVEL=debug

# Run with debug output
xkit analyze-bookmarks --input bookmarks.json --method llm

# Check logs
cat ~/.xkit/logs/xkit.log
```

---

## See Also

- [Custom Templates Guide](CUSTOM_TEMPLATES.md) - Domain-specific summarization
- [Bookmark Archiving](bookmark-archiving.md) - Archive workflow documentation
- [Architecture](ARCHITECTURE.md) - Implementation details
- [Troubleshooting](troubleshooting.md) - General troubleshooting

---

**Last updated:** 2026-01-20
**Next review:** 2026-04-20 (quarterly, or after each release)
