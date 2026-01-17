---
title: "jeffreysprompts.com"
type: "tool"
date_added: "Fri Jan 09 23:12:03 +0000 2026"
source: "https://github.com/Dicklesworthstone/jeffreysprompts.com/blob/main/PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md"
tags: ["TypeScript"]
via: "Twitter bookmark from @doodlestein"
author: "Dicklesworthstone"
url: "https://github.com/Dicklesworthstone/jeffreysprompts.com/blob/main/PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md"
---

# jeffreysprompts.com

A curated collection of battle-tested prompts for agentic coding - Browse, copy, and install as Claude Code skills

## Metadata

- **Stars:** 29
- **Language:** TypeScript

## README

<div align="center">

<img src="illustration.webp" alt="JeffreysPrompts.com - A friendly robot shopping for prompts in a cozy prompt shop, with shelves of labeled prompt scrolls and a terminal showing 'jfp install idea-wizard'">

# JeffreysPrompts.com

**A curated collection of battle-tested prompts for agentic coding**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Bun](https://img.shields.io/badge/Bun-1.x-FBF0DF?style=flat-square&logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

*"Where'd you get that prompt?! It's lovely!"*<br>
*"Oh, this old thing? I got it at JeffreysPrompts.com."*

---

**Browse. Copy. Install as Claude Code skills. Ship faster.**

</div>

## What is JeffreysPrompts.com?

JeffreysPrompts.com is a platform for discovering, copying, and installing curated prompts that supercharge your work with AI coding agents like Claude Code, Codex CLI, and Gemini CLI.

It's three things in one:

| Component | Purpose |
|-----------|---------|
| **Web App** | Beautiful UI to browse, search, filter, and copy prompts |
| **CLI Tool (`jfp`)** | Agent-optimized command-line interface with JSON output |
| **Claude Code Skills** | One-click installation of prompts as reusable Claude Code skills |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   YOU                    jeffreysprompts.com                   CLAUDE   │
│    │                            │                                  │    │
│    ├─── Browse prompts ────────►│                                  │    │
│    │                            │                                  │    │
│    ├─── Copy to clipboard ─────►│                                  │    │
│    │                            │                                  │    │
│    ├─── Install as skill ──────►│────── jfp install ──────────────►│    │
│    │                            │                                  │    │
│    │                            │       ~/.config/claude/skills/   │    │
│    │                            │              │                   │    │
│    │◄───── Agent uses skill ────│◄─────────────┘                   │    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Prompts

These prompts come from Jeffrey Emanuel's "My Favorite Prompts" series on Twitter. They're battle-tested patterns refined through extensive real-world usage with AI coding agents.

### The Idea Wizard

> *Generate 30 improvement ideas, rigorously evaluate each, distill to the very best 5*

The key insight: by forcing the agent to generate many ideas and then critically evaluate them, you get much better results than asking for "5 good ideas" directly.

### The README Reviser

> *Update documentation for recent changes, framing them as "how it always was"*

Addresses documentation drift. The framing trick produces cleaner, more professional docs.

### The Robot-Mode Maker

> *Create an agent-optimized CLI for any project*

Builds what the agent would want to use, because it WILL be using it. JSON output, token efficiency, quick-start mode.

**...and more.** Each prompt includes when to use it, tips, and examples.

---

## Table of Contents

- [Quick Start](#quick-start)
  - [Web App](#web-app)
  - [CLI Tool](#cli-tool)
  - [Claude Code Skills](#claude-code-skills)
- [Features](#features)
  - [Web App Features](#web-app-features)
  - [CLI Features](#cli-features)
  - [Skills Integration](#skills-integration)
- [The jfp CLI](#the-jfp-cli)
  - [Installation](#cli-installation)
  - [Commands](#cli-commands)
  - [Robot Mode](#robot-mode)
- [Architecture](#architecture)
  - [TypeScript-Native Prompts](#typescript-native-prompts)
  - [Project Structure](#project-structure)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Quality Gates](#quality-gates)
- [The Making-Of Page](#the-making-of-page)
- [Design Philosophy](#design-philosophy)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

### Web App

Visit **[jeffreysprompts.com](https://jeffreysprompts.com)** to:

1. Browse all prompts with search and filtering
2. Click any prompt to copy it to your clipboard
3. Add prompts to your basket for bulk export
4. Download as markdown or Claude Code skills

### CLI Tool

```bash
# Install the jfp CLI
curl -fsSL "https://jeffreysprompts.com/install-cli.sh?$(date +%s)" | bash

# List all prompts
jfp list



... (truncated)

## Links

- [GitHub Repository](https://github.com/Dicklesworthstone/jeffreysprompts.com/blob/main/PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md)
- [Original Tweet](https://x.com/doodlestein/status/2009765138295931153)

## Original Tweet

> A ton of people have asked me in the past week to record a screencast because they want to watch me work and understand my workflows better.

I'm not willing to do that because I know it will kill my velocity, since I'm constantly jumping back and forth between public and private projects to push all my initiatives forward every single day. 

And I also don't want to be stressed out worrying that I leaked .env details or inadvertently violated an NDA with one of my consulting clients.

But I AM willing to do the next best thing, which is to build stuff live, in public. Normally this would be about as exciting as watching paint dry, but I'm going to make this project RIGHT NOW in a single day. 

This started out as a dumb joke this morning and a domain purchase on a whim but has already blossomed into an almost unbelievably ambitious and full-featured web app and CLI tool for humans and agents, as well as a "how to" site and hub for agent skills files.

This is going to be the home for all my prompts, both individually and as collections of related prompts, and also associated skills. The skills will relate to generic prompting workflows and also to tooling, both my own agent flywheel tooling and other dev tooling (e.g., gh, gcloud, vault, wrangler, vercel-cli, supabase-cli, etc.)

In what is surely not the first extremely "meta" situation here, part of the new project is itself a nice "How I conceived, designed, planned, and implemented all of this in one single day" rich webpage that basically will provide the complete Claude Code session (I'm keeping it all in one mega session for continuity) that will be beautifully presented along with explanatory narrative that shows the thinking behind each prompt and workflow.

You've only "missed" the first part of the process, where I create the initial markdown plan document (I put 'missed' in quotes because later you'll be able to see all this at the session level on that "/how_i_made_it" page). 

But I'm not even done with the markdown plan; I'm still doing the final polishing and checks using Claude Code, and then I'm going to do a couple of passes using GPT Pro to improve it as I've explained in my recent posts.

You can see the current version of the plan right now, which is already extremely good and complete (it's 6,452 lines already, lol):

https://t.co/xi3qWQ6U6v

Then after I revise the markdown plan, I'll turn it into a ton (probably at least 300+) self-contained beads. Once that's done, I can use my bv tool to export those beads to a static GitHub Pages site so you can explore them and understand how markdown plans map to beads in my system.

Then I will iteratively polish and improve the beads until the boys can't come up with anything left to improve. Then I'll boot up ye Old Agent Swarme and knock this thing out in hours for you. If all goes according to plan, I should have the live site ready for your enjoyment late tonight or, worst case, tomorrow.

— @doodlestein (Jeffrey Emanuel)