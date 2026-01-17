---
title: "adversarial-spec"
type: "tool"
date_added: "Sun Jan 11 04:53:13 +0000 2026"
source: "https://github.com/zscole/adversarial-spec"
tags: ["anthropic", "claude-ai", "claude-code", "claude-code-plugin", "claude-skills", "llm", "orchestration", "Python"]
via: "Twitter bookmark from @0xzak"
author: "zscole"
url: "https://github.com/zscole/adversarial-spec"
---

# adversarial-spec

A Claude Code plugin that iteratively refines product specifications by debating between multiple LLMs until all models reach consensus.

## Metadata

- **Stars:** 437
- **Language:** Python

## README

# adversarial-spec

A Claude Code plugin that iteratively refines product specifications through multi-model debate until consensus is reached.

**Key insight:** A single LLM reviewing a spec will miss things. Multiple LLMs debating a spec will catch gaps, challenge assumptions, and surface edge cases that any one model would overlook. The result is a document that has survived rigorous adversarial review.

**Claude is an active participant**, not just an orchestrator. Claude provides independent critiques, challenges opponent models, and contributes substantive improvements alongside external models.

## Quick Start

```bash
# 1. Add the marketplace and install the plugin
claude plugin marketplace add zscole/adversarial-spec
claude plugin install adversarial-spec

# 2. Set at least one API key
export OPENAI_API_KEY="sk-..."
# Or use OpenRouter for access to multiple providers with one key
export OPENROUTER_API_KEY="sk-or-..."

# 3. Run it
/adversarial-spec "Build a rate limiter service with Redis backend"
```

## How It Works

```
You describe product --> Claude drafts spec --> Multiple LLMs critique in parallel
        |                                              |
        |                                              v
        |                              Claude synthesizes + adds own critique
        |                                              |
        |                                              v
        |                              Revise and repeat until ALL agree
        |                                              |
        +--------------------------------------------->|
                                                       v
                                            User review period
                                                       |
                                                       v
                                            Final document output
```

1. Describe your product concept or provide an existing document
2. (Optional) Start with an in-depth interview to capture requirements
3. Claude drafts the initial document (PRD or tech spec)
4. Document is sent to opponent models (GPT, Gemini, Grok, etc.) for parallel critique
5. Claude provides independent critique alongside opponent feedback
6. Claude synthesizes all feedback and revises
7. Loop continues until ALL models AND Claude agree
8. User review period: request changes or run additional cycles
9. Final converged document is output

## Requirements

- Python 3.10+
- `litellm` package: `pip install litellm`
- API key for at least one LLM provider

## Supported Models

| Provider   | Env Var                | Example Models                               |
|------------|------------------------|----------------------------------------------|
| OpenAI     | `OPENAI_API_KEY`       | `gpt-4o`, `gpt-4-turbo`, `o1`                |
| Anthropic  | `ANTHROPIC_API_KEY`    | `claude-sonnet-4-20250514`, `claude-opus-4-20250514` |
| Google     | `GEMINI_API_KEY`       | `gemini/gemini-2.0-flash`, `gemini/gemini-pro` |
| xAI        | `XAI_API_KEY`          | `xai/grok-3`, `xai/grok-beta`                |
| Mistral    | `MISTRAL_API_KEY`      | `mistral/mistral-large`, `mistral/codestral` |
| Groq       | `GROQ_API_KEY`         | `groq/llama-3.3-70b-versatile`               |
| OpenRouter | `OPENROUTER_API_KEY`   | `openrouter/openai/gpt-4o`, `openrouter/anthropic/claude-3.5-sonnet` |
| Codex CLI  | ChatGPT subscription   | `codex/gpt-5.2-codex`, `codex/gpt-5.1-codex-max` |
| Gemini CLI | Google account         | `gemini-cli/gemini-3-pro-preview`, `gemini-cli/gemini-3-flash-preview` |
| Deepseek   | `DEEPSEEK_API_KEY`     | `deepseek/deepseek-chat`                     |
| Zhipu      | `ZHIPUAI_API_KEY`      | `zhipu/glm-4`, `zhipu/glm-4-plus`            |

Check which keys are configured:

```bash
python3 ~/.claude/skills/adversarial-spec/scripts/debate.py providers
```

## AWS Bedrock Support

For enterprise users who need to route all model calls through AWS Bedrock (e.g., for security compliance or inference gateway requirements):

```bash
# Enable Bedrock mode
python3 ~/.claude/skills/adversarial-spec/scripts/debate.py bedrock enable --region us-east-1

# Add models enabled in your Bedrock account
python3 ~/.claude/skills/adversarial-spec/scripts/debate.py bedrock add-model claude-3-sonnet
python3 ~/.claude/skills/adversarial-spec/scripts/debate.py bedrock add-model claude-3-haiku

# Check configuration
python3 ~/.claude/skills/adversarial-spec/scripts/debate.py bedrock status

# Disable Bedrock mode
python3 ~/.claude/skills/adversarial-spec/scripts/debate.py bedrock disable
```

When Bedrock is enabled, **all model calls route through Bedrock** - no direct API calls are made. Use friendly names like `claude-3-sonnet` which are automatically mapped to Bedrock model IDs.

Configuration is stored at `~/.claude/adversarial-spec/config.json`.

## OpenRouter Support

[OpenRouter](https://openrouter.ai) provides unified acc

... (truncated)

## Links

- [GitHub Repository](https://github.com/zscole/adversarial-spec)
- [Original Tweet](https://x.com/0xzak/status/2010213382494798108)

## Original Tweet

> Just shipped adversarial-spec, a Claude Code plugin for writing better product specs.

The problem: You write a PRD or tech spec, maybe have Claude review it, and ship it. But one model reviewing a doc will miss things. It'll gloss over gaps, accept vague requirements, and let edge cases slide.

The fix: Make multiple LLMs argue about it.

adversarial-spec sends your document to GPT, Gemini, Grok, or any combination of models you want. They critique it in parallel. Then Claude synthesizes the feedback, adds its own critique, and revises. This loops until every model agrees the spec is solid.

What actually happens in practice: requirements that seemed clear get challenged. Missing error handling gets flagged. Security gaps surface. Scope creep gets caught. One model says "what about X?" and another says "the API contract is incomplete" and Claude adds "you haven't defined what happens when Y fails."

By the time all models agree, your spec has survived adversarial review from multiple perspectives.

Features:
- Interview mode: optional deep-dive Q&A before drafting to capture requirements upfront
- Early agreement checks: if a model agrees too fast, it gets pressed to prove it actually read the doc
- User review period: after consensus, you can request changes or run another cycle
- PRD to tech spec flow: finish a PRD, then continue straight into a technical spec based on it
- Telegram integration: get notified on your phone, inject feedback from anywhere

Works with OpenAI, Google, xAI, Mistral, Groq, Deepseek. Leveraging more models results in stricter convergence.

If you're building something and writing specs anyway, this makes them better.

Check it out and let me know what you think!

https://t.co/OrFf5HUI10

— @0xzak (zak.eth)