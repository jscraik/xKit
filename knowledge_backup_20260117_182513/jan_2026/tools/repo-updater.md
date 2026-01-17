---
title: "repo_updater"
type: "tool"
date_added: "Fri Jan 09 22:45:28 +0000 2026"
source: "https://github.com/Dicklesworthstone/repo_updater"
tags: ["Shell"]
via: "Twitter bookmark from @doodlestein"
author: "Dicklesworthstone"
url: "https://github.com/Dicklesworthstone/repo_updater"
---

# repo_updater

A beautiful, automation-friendly CLI for synchronizing GitHub repositories. Keep dozens of repos in sync with a single command.

## Metadata

- **Stars:** 30
- **Language:** Shell

## README

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-blueviolet?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/shell-Bash%204.0+-purple?style=for-the-badge" alt="Shell" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">ru</h1>
<h3 align="center">Repo Updater</h3>

<div align="center">
  <img src="ru_illustration.webp" alt="ru - Repo Updater: Keep all your GitHub repositories synchronized with a single command">
</div>

<p align="center">
  <strong>A beautiful, automation-friendly CLI for synchronizing GitHub repositories</strong>
</p>

<p align="center">
  Keep dozens (or hundreds) of repos in sync with a single command.<br/>
  Clone missing repos, pull updates, detect conflicts, and get actionable resolution commands.
</p>

<p align="center">
  <em>Pure Bash with no string parsing of git output. Uses git plumbing for reliable status detection.<br/>
  Meaningful exit codes for CI. JSON output for scripting. Non-interactive mode for automation.</em>
</p>

---

<p align="center">

```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/repo_updater/main/install.sh?ru_cb=$(date +%s)" | bash
# You can omit the `?ru_cb=...` once installed; it's just a cache-buster for the installer fetch.
```

**Or via Homebrew (macOS/Linux):**

```bash
brew install dicklesworthstone/tap/ru
```

</p>

---

## 🤖 Ready-made Blurb for AI Agents

> [!IMPORTANT]
> **Copy the blurb below to your project's `AGENTS.md`, `CLAUDE.md`, or `.cursorrules` file for AI agent integration with ru.**

````markdown
## ru Quick Reference for AI Agents

Syncs GitHub repos to local projects directory (clone missing, pull updates, detect conflicts).

```bash
ru sync                    # Sync all repos
ru sync --dry-run          # Preview only
ru sync -j4 --autostash    # Parallel + auto-stash
ru status --no-fetch       # Quick local status
ru list --paths            # Repo paths (stdout)
```

**Automation:** `--non-interactive --json` (json→stdout, human→stderr)

**Exit:** 0=ok | 1=partial | 2=conflicts | 3=system | 4=bad args | 5=interrupted (`--resume`)

**Critical:**
- Never create worktrees/clones in projects dir → use `/tmp/`
- Never parse human output → use `--json`
````

---

## 🎯 The Primary Use Case: Keeping Your Projects Directory in Sync

**The scenario:** You work across multiple machines, contribute to dozens of repositories, and your local `/data/projects` directory needs to stay synchronized with GitHub. Manually running `git pull` in each directory is tedious and error-prone.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Your Repos     │     │  repos.d/       │     │       ru        │
│  on GitHub      │────▶│  public.txt     │────▶│     sync        │
│  (47 repos)     │     │  private.txt    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
         ┌──────────────────────────────────────────────┤
         ▼                    ▼                         ▼
┌─────────────────┐  ┌─────────────────┐     ┌─────────────────┐
│  Clone Missing  │  │  Pull Updates   │     │  Report Status  │
│  (8 new repos)  │  │  (34 updated)   │     │  (2 conflicts)  │
└─────────────────┘  └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                             ┌─────────────────┐
                                             │  Actionable     │
                                             │  Resolution     │
                                             │  Commands       │
                                             └─────────────────┘
```

**The workflow:**

1. **Configure once** — Add repos to `~/.config/ru/repos.d/public.txt`
2. **Run `ru sync`** — Everything happens automatically
3. **Review conflicts** — Get copy-paste commands to resolve issues

```bash
# On any machine, sync all 47 of your repos
ru sync

# Output:
# → Processing 1/47: mcp_agent_mail
#   ├─ Path: /data/projects/mcp_agent_mail
#   ├─ Status: behind (0 ahead, 3 behind)
#   └─ Result: ✓ Updated (2s)
#
# ╭─────────────────────────────────────────────────────────────╮
# │                    📊 Sync Summary                          │
# │  ✅ Cloned:     8 repos                                     │
# │  ✅ Updated:   34 repos                                     │
# │  ⏭️  Current:    3 repos                                    │
# │  ⚠️  Conflicts: 2 repos (need attention)                    │
# │  Total: 47 repos processed in 2m 34s                        │
# ╰─────────────────────────────────────────────────────────────╯
```

**Comparison:**

| Without ru | With ru |
|----------

... (truncated)

## Links

- [GitHub Repository](https://github.com/Dicklesworthstone/repo_updater)
- [Original Tweet](https://x.com/doodlestein/status/2009758450171924729)

## Original Tweet

> Introducing my latest tool designed to accelerate agent coding workflows: repo_updater (ru for short). 

You can get it here, as always for free and 100% MIT-licensed open-source:

https://t.co/nONU9xSlT8

I basically made this tool out of necessity, because I was wasting far too much time and energy managing an ever-increasing number of public and private GitHub repos across 4 different machines (a Mac at home, a Linux workstation at home, and two remote bare-metal Linux servers in the cloud) that were always drifting apart and causing mental friction and wasted time. 

It also caused low-grade anxiety because I worried about agents doing silly things and wiping out useful work. 

Sometimes I would accidentally work on the wrong machine (this happens much less often now that I have each host automatically displayed in a different color scheme in Ghostty and WezTerm, see my recent post about that or check my misc_coding_agent_tips_and_scripts repo).

So just this simple workflow of pulling remote changes and pushing local changes and making sure repos are in sync in a smart way, but for a large list of public and private repos and done in a cross-platform way (the system is pure bash scripting that works with the gh utility from GitHub) that is parallelized across repos, was a big unlock for me in terms of automation.

But of course, I'm not even the one using ru, although I certainly could; my agents are the ones that use it on my behalf.

So, naturally I designed ru so that it's "agent-first" in every way, ensuring that it was as ergonomic and intuitive as possible for use by coding agents, for which I had them design their "dream tool" in an iterative process using the robot-mode prompt I shared earlier (i.e., prompt number 3 in the "My Favorite Prompts" series, lol).

So how do I use it exactly? Well, step one is to install it, which takes 2 seconds using the curl | bash one-liner script given in the readme file of the ru repo.

Then, suppose you would like all your repos to live in the /data/projects directory on your Mac or Linux machine. The next step is to get a list of all of your public and private repos you want to manage with ru.

To do that, you can create a text file with one URL per line or use several other formats. 

One particularly easy/lazy way is to simply ask Claude Code to use the gh tool to list all your repos and then specify it from there (e.g., "Take all the non-forked repos with more than 3 files in them that I touched at least once in the past 3 months and add the public repos to the public repo list of ru and the private repos to the private repo list of ru.") 

Then, simply start up Claude Code and use this prompt:

"First, I want you to cd to /data/projects and then run the `ru` command just like that; then in the same directory I want you to run the command `ru sync` and carefully study the resulting output. 

When you've done that all meticulously, reviewing carefully every single line of output, I want you to help me to ensure that all my repos are up-to-date; BUT, I want to be super careful and hyper cautious and vigilant about potentially losing ANY useful work (code, documentation, beads tasks, etc.) in BOTH the local repos and the remote repo on GitHub. 

In every case, I want the one "best" canonical version of each committed file (usually that is the latest version, but NOT always); this cannot be mechanically determined and must be done by you manually and carefully by doing diffs between versions and understanding the changes and differences and what they mean relative to the purpose and structure of each specific project.

Also, use common sense to avoid committing obviously ephemeral files or build artifacts, sensitive .env files containing credentials, etc. Use ultrathink."

Do this on each of your machines. The best way is to do it first on your main machine, and then have Claude SSH directly into your other machines and install ru on them and configure them identically in every respect (to maintain sanity, I highly recommend using the same directory for all repos, usually `~/projects` or `/data/projects` for me). 

Then Claude can run the same process on the remote machines, or you can directly connect to them yourself and start up new Claude Code sessions (this is what I recommend) because these can get very interactive when you have complex situations that need your guidance and feedback.

To see some examples of these complex interactive sessions using CC and ru, see the attached screenshots.

Anyway, this project is already saving me a ton of time and mental energy, and I didn't even discuss the more powerful functionality in there for helping to automate the management of GitHub issues and PRs, which is the main time savings and automation potential this tool provides me with. 

That will have to wait for another post in the next day or so.

— @doodlestein (Jeffrey Emanuel)