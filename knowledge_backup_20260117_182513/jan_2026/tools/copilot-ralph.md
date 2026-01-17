---
title: "copilot-ralph"
type: "tool"
date_added: "Tue Jan 13 12:19:54 +0000 2026"
source: "https://github.com/brenbuilds1/copilot-ralph"
tags: ["Shell"]
via: "Twitter bookmark from @BrenBuilds"
author: "brenbuilds1"
url: "https://github.com/brenbuilds1/copilot-ralph"
---

# copilot-ralph

Copilot ralph is an autonomous AI agent loop that runs repeatedly until all PRD items are complete.

## Metadata

- **Stars:** 39
- **Language:** Shell

## README

# Ralph for GitHub Copilot CLI

An autonomous AI agent loop that runs [GitHub Copilot CLI](https://github.com/github/copilot-cli) repeatedly until all PRD items are complete. Each iteration is a fresh Copilot instance with clean context. Memory persists via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/) and adapted from [Ryan Carson's Amp implementation](https://github.com/snarktank/ralph).

## Prerequisites

- [GitHub Copilot CLI](https://github.com/github/copilot-cli) installed and authenticated (`npm install -g @github/copilot`)
- Active Copilot subscription (Pro, Pro+, Business, or Enterprise)
- `jq` installed (`apt-get install jq` on Linux, `brew install jq` on macOS)
- A git repository (Ralph commits progress and uses git history for memory)

## Quick Start

Copy files to your project, then run:

```bash
# In your project directory
cp /path/to/copilot-ralph/ralph.sh ./
cp /path/to/copilot-ralph/prompt.md ./
cp /path/to/copilot-ralph/prd.json.example ./prd.json

# Edit prd.json with your user stories
./ralph.sh
```

Ralph runs in the current directory and commits to the current git repo.

## PRD Format

Create a `prd.json` file with your user stories:

```json
{
  "projectName": "Landing Page",
  "branchName": "ralph/landing-page",
  "userStories": [
    {
      "id": "US-001",
      "title": "Create hero section",
      "priority": 1,
      "description": "Build hero with headline and CTA",
      "acceptanceCriteria": ["Full viewport height", "CTA scrolls to signup"],
      "passes": false
    }
  ]
}
```

See `prd.json.example` for a complete example.

## What Ralph Does

```bash
./ralph.sh [max_iterations]
```

Default is 10 iterations. Each iteration:

1. Picks the highest priority story where `passes: false`
2. Implements that single story
3. Runs quality checks
4. Commits if checks pass
5. Marks story as `passes: true`
6. Appends learnings to `progress.txt`
7. Repeats until all stories pass

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   prd.json ─────┬───────── progress.txt ─────── git history │
│                 │                                           │
│                 ▼                                           │
│        copilot -p "$PROMPT" --allow-all-tools               │
│                 │                                           │
│                 ▼                                           │
│        Check for <promise>COMPLETE</promise>                │
│                 │                                           │
│         ┌──────┴──────┐                                     │
│         ▼             ▼                                     │
│      Complete     Continue                                  │
│      Exit 0       Next iteration                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `ralph.sh` | Bash loop that spawns Copilot CLI instances |
| `prompt.md` | Instructions for each iteration |
| `prd.json` | Your user stories (create from example) |
| `progress.txt` | Learnings from previous iterations (auto-created) |

## Critical Concepts

### Fresh Context Each Iteration

Each iteration spawns a new Copilot CLI instance. Memory persists only via:
- Git history
- `progress.txt`
- `prd.json`

### Small Tasks

Stories should be small enough to complete in one context window.

**Good:** Add a form component, Create an API endpoint, Add validation

**Too big:** Build the dashboard, Add authentication, Refactor the API

### Stop Condition

When all stories have `passes: true`, Ralph outputs `<promise>COMPLETE</promise>` and exits.

## Models

GitHub Copilot CLI uses **Claude Sonnet 4.5** by default.

Available models: Claude Sonnet 4.5, Claude Sonnet 4, GPT-5

```bash
# Change model via environment variable
export COPILOT_MODEL=gpt-5
./ralph.sh
```

## Debugging

```bash
# Check story status
cat prd.json | jq '.userStories[] | {id, title, passes}'

# View learnings
cat progress.txt

# Check commits
git log --oneline -10
```

## Customizing

Edit `prompt.md` to add:
- Project-specific quality check commands
- Codebase conventions
- Common gotchas for your stack

## References

- [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph/)
- [Ryan Carson's Amp implementation](https://github.com/snarktank/ralph)
- [GitHub Copilot CLI](https://github.com/github/copilot-cli)
- [Copilot CLI Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)


## Links

- [GitHub Repository](https://github.com/brenbuilds1/copilot-ralph)
- [Original Tweet](https://x.com/BrenBuilds/status/2011050572351488471)

## Original Tweet

> @0xPaulius are you saying theres a market for me putting a UI infront of my copilot cli ralph loop? 
https://t.co/XntM729FS2

— @BrenBuilds (Bren)