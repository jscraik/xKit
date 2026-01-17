---
title: "claude-code-showcase"
type: "tool"
date_added: "Wed Jan 14 23:21:09 +0000 2026"
source: "https://github.com/ChrisWiles/claude-code-showcase"
tags: ["JavaScript"]
via: "Twitter bookmark from @brian_lovin"
author: "ChrisWiles"
url: "https://github.com/ChrisWiles/claude-code-showcase"
---

# claude-code-showcase

Comprehensive Claude Code project configuration example with hooks, skills, agents, commands, and GitHub Actions workflows

## Metadata

- **Stars:** 4877
- **Language:** JavaScript

## README

# Claude Code Project Configuration Showcase

> Most software engineers are seriously sleeping on how good LLM agents are right now, especially something like Claude Code.

Once you've got Claude Code set up, you can point it at your codebase, have it learn your conventions, pull in best practices, and refine everything until it's basically operating like a super-powered teammate. **The real unlock is building a solid set of reusable "[skills](#skills---domain-knowledge)" plus a few "[agents](#agents---specialized-assistants)" for the stuff you do all the time.**

### What This Looks Like in Practice

**Custom UI Library?** We have a [skill that explains exactly how to use it](.claude/skills/core-components/SKILL.md). Same for [how we write tests](.claude/skills/testing-patterns/SKILL.md), [how we structure GraphQL](.claude/skills/graphql-schema/SKILL.md), and basically how we want everything done in our repo. So when Claude generates code, it already matches our patterns and standards out of the box.

**Automated Quality Gates?** We use [hooks](.claude/settings.json) to auto-format code, run tests when test files change, type-check TypeScript, and even [block edits on the main branch](.claude/settings.md). Claude Code also created a bunch of ESLint automation, including custom rules and lint checks that catch issues before they hit review.

**Deep Code Review?** We have a [code review agent](.claude/agents/code-reviewer.md) that Claude runs after changes are made. It follows a detailed checklist covering TypeScript strict mode, error handling, loading states, mutation patterns, and more. When a PR goes up, we have a [GitHub Action](.github/workflows/pr-claude-code-review.yml) that does a full PR review automatically.

**Scheduled Maintenance?** We've got GitHub workflow agents that run on a schedule:
- [Monthly docs sync](.github/workflows/scheduled-claude-code-docs-sync.yml) - Reads commits from the last month and makes sure docs are still aligned
- [Weekly code quality](.github/workflows/scheduled-claude-code-quality.yml) - Reviews random directories and auto-fixes issues
- [Biweekly dependency audit](.github/workflows/scheduled-claude-code-dependency-audit.yml) - Safe dependency updates with test verification

**Intelligent Skill Suggestions?** We built a [skill evaluation system](#skill-evaluation-hooks) that analyzes every prompt and automatically suggests which skills Claude should activate based on keywords, file paths, and intent patterns.

A ton of maintenance and quality work is just... automated. It runs ridiculously smoothly.

**JIRA/Linear Integration?** We connect Claude Code to our ticket system via [MCP servers](.mcp.json). Now Claude can read the ticket, understand the requirements, implement the feature, update the ticket status, and even create new tickets if it finds bugs along the way. The [`/ticket` command](.claude/commands/ticket.md) handles the entire workflow—from reading acceptance criteria to linking the PR back to the ticket.

We even use Claude Code for ticket triage. It reads the ticket, digs into the codebase, and leaves a comment with what it thinks should be done. So when an engineer picks it up, they're basically starting halfway through already.

**There is so much low-hanging fruit here that it honestly blows my mind people aren't all over it.**

---

## Table of Contents

- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Configuration Reference](#configuration-reference)
  - [CLAUDE.md - Project Memory](#claudemd---project-memory)
  - [settings.json - Hooks & Environment](#settingsjson---hooks--environment)
  - [MCP Servers - External Integrations](#mcp-servers---external-integrations)
  - [LSP Servers - Real-Time Code Intelligence](#lsp-servers---real-time-code-intelligence)
  - [Skill Evaluation Hooks](#skill-evaluation-hooks)
  - [Skills - Domain Knowledge](#skills---domain-knowledge)
  - [Agents - Specialized Assistants](#agents---specialized-assistants)
  - [Commands - Slash Commands](#commands---slash-commands)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Best Practices](#best-practices)
- [Examples in This Repository](#examples-in-this-repository)

---

## Directory Structure

```
your-project/
├── CLAUDE.md                      # Project memory (alternative location)
├── .mcp.json                      # MCP server configuration (JIRA, GitHub, etc.)
├── .claude/
│   ├── settings.json              # Hooks, environment, permissions
│   ├── settings.local.json        # Personal overrides (gitignored)
│   ├── settings.md                # Human-readable hook documentation
│   ├── .gitignore                 # Ignore local/personal files
│   │
│   ├── agents/                    # Custom AI agents
│   │   └── code-reviewer.md       # Proactive code review agent
│   │
│   ├── commands/                  # Slash commands (/command-name)
│   │   ├── onboard.md             # Deep task exploration
│   │   ├── pr-review.md           #

... (truncated)

## Links

- [GitHub Repository](https://github.com/ChrisWiles/claude-code-showcase)
- [Original Tweet](https://x.com/brian_lovin/status/2011579369710657641)

## Original Tweet

> Idk, just type this into Claude Code and see what happens:

"""
Read the README on this repository: https://t.co/BjHHPqwrvw 

Explore the code base to learn about best practices and patterns for using Claude Code effectively. Take what you learn and bring it back into the context of our codebase. Look for opportunities to improve our own Claude Code setup (in the ./claude directory). Read our skills, commands, subagents, and rules files to get the full picture before making any suggestions.

When you're ready, create a list of your top recommendations and explain why you think they would be meaningful improvements to our project setup.

For each suggestion, create a testing framework so that you can measure how different prompts would behave or change the outcome given the new rule/setting/skill/etc.

The testing framework will let you run a sample prompt before making changes, take notes about the response/tool use/quality in your own response, and document everything in a BEFORE file. 

Then apply the suggested change to the rule/skill/command/setting file and re-run the exact same prompt. Observe the outcome and and save your notes in an AFTER file. 

Next, analyze the two documents to figure out if the changes to the Claude Code settings had a meaningful impact. If you aren't sure, run this loop with one more test prompt case (come up with the best possible prompt you can think of that would adequately test the changed setting).

Write a final before/after report that we can review together. When we find high impact changes, we'll implement the suggested change and commit. Don't stop until you've run the testing + evaluation loop on all of the recommendations from your first-phase exploration.
"""

— @brian_lovin (Brian Lovin)