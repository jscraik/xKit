---
title: "convexskills"
type: "tool"
date_added: "Thu Jan 15 22:42:32 +0000 2026"
source: "https://github.com/waynesutton/convexskills"
tags: ["ai", "backend", "claude", "claude-skills", "convex", "database", "skills", "JavaScript"]
via: "Twitter bookmark from @waynesutton"
author: "waynesutton"
url: "https://github.com/waynesutton/convexskills"
---

# convexskills

AI agent skills and templates for building production ready apps with Convex. Patterns for queries, mutations, cron jobs, webhooks, migrations, and more.

## Metadata

- **Stars:** 104
- **Language:** JavaScript

## README

# Convex (unofficial) Skills v1

[![npm version](https://img.shields.io/npm/v/@waynesutton/convex-skills.svg)](https://www.npmjs.com/package/@waynesutton/convex-skills)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

A collection of AI-consumable skills for building production-ready applications with [Convex](https://convex.dev), following the Agent Skills open format.

## Overview

This repository contains skills that help AI assistants understand and implement Convex best practices. Each skill provides structured guidance for specific aspects of Convex development.

## Installation

### npm (recommended)

```bash
# Install globally for CLI access
npm install -g @waynesutton/convex-skills

# List available skills
convex-skills list

# Install a specific skill to your project
convex-skills install convex-best-practices

# Install all skills
convex-skills install-all

# Install templates (CLAUDE.md + skill templates)
convex-skills install-templates
```

Or use npx without installing:

```bash
npx @waynesutton/convex-skills list
npx @waynesutton/convex-skills install-all
```

### Programmatic Usage

```bash
npm install @waynesutton/convex-skills
```

```javascript
import { listSkills, getSkill, SKILLS } from "@waynesutton/convex-skills";

// List all skills
console.log(listSkills());

// Get a specific skill's content
const content = getSkill("convex-best-practices");
```

### Claude Code (from local clone)

```bash
git clone https://github.com/waynesutton/convexskills.git
cd convexskills
# Point Claude Code to this directory
```

### Codex

Follow the Codex skills guide and place the skill under `$CODEX_HOME/skills`:

```bash
# From the repo root
# Defaults to ~/.codex if CODEX_HOME is unset
cp -r skills/convex-best-practices "$CODEX_HOME/skills/"
```

Codex will auto-discover `SKILL.md` files in that directory on the next start.

### OpenCode

OpenCode discovers skills from `~/.claude/skills/<name>/SKILL.md` automatically. See OpenCode Skills docs for more details.

### Manual Installation

Copy the desired skill's `SKILL.md` file to your project's `.claude/skills/` directory.

## Available Skills

| Skill                                                                    | Description                                           |
| ------------------------------------------------------------------------ | ----------------------------------------------------- |
| [convex-best-practices](skills/convex-best-practices/SKILL.md)           | Guidelines for building production-ready Convex apps  |
| [convex-functions](skills/convex-functions/SKILL.md)                     | Writing queries, mutations, actions, and HTTP actions |
| [convex-realtime](skills/convex-realtime/SKILL.md)                       | Patterns for building reactive applications           |
| [convex-schema-validator](skills/convex-schema-validator/SKILL.md)       | Database schema definition and validation             |
| [convex-file-storage](skills/convex-file-storage/SKILL.md)               | File upload, storage, and serving                     |
| [convex-agents](skills/convex-agents/SKILL.md)                           | Building AI agents with Convex                        |
| [convex-cron-jobs](skills/convex-cron-jobs/SKILL.md)                     | Scheduled functions and background tasks              |
| [convex-http-actions](skills/convex-http-actions/SKILL.md)               | HTTP endpoints and webhook handling                   |
| [convex-migrations](skills/convex-migrations/SKILL.md)                   | Schema evolution and data migrations                  |
| [convex-security-check](skills/convex-security-check/SKILL.md)           | Quick security audit checklist                        |
| [convex-security-audit](skills/convex-security-audit/SKILL.md)           | Deep security review patterns                         |
| [convex-component-authoring](skills/convex-component-authoring/SKILL.md) | Creating reusable Convex components                   |

## Repository Structure

```
convex-skills/
├── skills/                   # Core Convex skills for AI agents
│   ├── convex-best-practices/
│   │   └── SKILL.md
│   ├── convex-functions/
│   │   └── SKILL.md
│   ├── convex-cron-jobs/
│   │   └── SKILL.md
│   └── ...
├── templates/                # Templates for forking developers
│   ├── CLAUDE.md             # Project context template
│   └── skills/               # Claude Code skill templates
│       ├── dev.md            # Full-stack development practices
│       ├── help.md           # Problem-solving methodology
│       └── gitrules.md       # Git safety protocols
├── .claude/skills/           # Active skills for this repo
├── prds/                     # Planning documents
├── AGENTS.md                 # Agent-facing documentation
├── CLAUDE.md                 # Claude configuration
├── GEMINI.md                 # Gemini CLI integration
├── README.md                 # This file
└── LICENSE         

... (truncated)

## Links

- [GitHub Repository](https://github.com/waynesutton/convexskills)
- [Original Tweet](https://x.com/waynesutton/status/2011932036316217508)

## Original Tweet

> Built 25+ apps with @convex, Claude, and Cursor.

I package the skills and rules I use on every project.

Unofficial Convex skills for Claude Code. Cursor rules included.

https://t.co/XRxkPhBAhQ

To save some time, you can also install via npm.

Keep shipping.

— @waynesutton (Wayne Sutton)