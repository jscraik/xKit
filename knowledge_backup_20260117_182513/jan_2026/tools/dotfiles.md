---
title: ".dotfiles"
type: "tool"
date_added: "Wed Jan 14 08:52:44 +0000 2026"
source: "https://github.com/dmmulroy/.dotfiles/blob/main/home/.config/opencode/skill/prd-task/SKILL.md?plain=1#L152"
tags: ["Shell"]
via: "Twitter bookmark from @RozenMD"
author: "dmmulroy"
url: "https://github.com/dmmulroy/.dotfiles/blob/main/home/.config/opencode/skill/prd-task/SKILL.md?plain=1#L152"
---

# .dotfiles

## Metadata

- **Stars:** 325
- **Language:** Shell

## README

# Dotfiles

A comprehensive, automated dotfiles management system for macOS development environments. Features a powerful CLI tool for setup, maintenance, and AI-powered development insights.

## Overview

This repository contains my personal development environment configuration, managed through a custom CLI tool called `dot`. It uses GNU Stow for symlink management, Homebrew for package installation, and includes configurations for Fish shell, Neovim, Tmux, Git, and other essential development tools.

### Key Features

- 🚀 **One-command setup** - Complete development environment in minutes
- 🤖 **AI Integration** - OpenCode for commit summaries and assistance
- 📦 **Resilient Package Management** - Continues installation even if packages fail
- 🔍 **Health Monitoring** - Comprehensive environment diagnostics
- 🛠️ **Modular Design** - Separate work and personal configurations

## Quick Start

```bash
# Clone the repository
git clone https://github.com/dmmulroy/.dotfiles.git ~/.dotfiles
cd ~/.dotfiles

# Full setup (installs everything)
./dot init

# Or customize the installation
./dot init --skip-ssh --skip-font
```

After installation, the `dot` command will be available globally for ongoing management. Running `dot` without arguments shows help.

## Repository Structure

```
~/.dotfiles/
├── dot                 # Main CLI tool
├── home/              # Configuration files (stowed to ~)
│   ├── .config/
│   │   ├── fish/      # Fish shell configuration
│   │   ├── git/       # Git configuration
│   │   ├── nvim/      # Neovim configuration
│   │   ├── tmux/      # Tmux configuration
│   │   └── ...
│   └── .ideavimrc     # IntelliJ IDEA Vim config
├── packages/
│   ├── bundle         # Base Brewfile
│   └── bundle.work    # Work-specific packages
├── CLAUDE.md          # Instructions for AI assistants
└── README.md          # This file
```

## The `dot` CLI Tool

The `dot` command is a comprehensive management tool for your dotfiles. It handles everything from initial setup to ongoing maintenance and provides AI-powered insights.

### Installation Commands

#### `dot init` - Initial Setup
Complete environment setup with all tools and configurations.

```bash
# Full installation
dot init

# Skip SSH key generation
dot init --skip-ssh

# Skip font installation  
dot init --skip-font

# Skip both SSH and font setup
dot init --skip-ssh --skip-font
```

**What it does:**
1. Installs Homebrew (if not present)
2. Installs packages from Brewfiles
3. Creates symlinks with GNU Stow
4. Installs Bun runtime
5. Installs OpenCode CLI via Homebrew (with native installer/bun/npm fallback)
6. Generates SSH key for GitHub (optional)
7. Installs MonoLisa font (optional)
8. Sets up Fish shell with plugins

### Maintenance Commands

#### `dot update` - Update Everything
```bash
dot update
```
- Pulls latest dotfiles changes (auto-detects jj vs git)
- Updates Homebrew packages
- Re-stows configuration files

#### `dot doctor` - Health Check
```bash
dot doctor
```
Comprehensive diagnostics including:
- ✅ Homebrew installation
- ✅ Essential tools (git, nvim, tmux, node, etc.)
- ✅ OpenCode installation method and functionality
- ✅ Fish shell configuration
- ✅ PATH configuration
- ⚠️ Broken symlinks detection
- ⚠️ Missing dependencies

#### `dot check-packages` - Package Status
```bash
dot check-packages
```
Shows which packages are installed vs. missing from your Brewfiles.

#### `dot retry-failed` - Retry Failed Installations
```bash
dot retry-failed
```
Attempts to reinstall packages that failed during initial setup.

### AI-Powered Features

#### `dot summary` - Commit Analysis
Uses OpenCode to generate intelligent summaries of recent git commits.

```bash
# Summarize last 3 commits (default)
dot summary

# Summarize specific number of commits
dot summary -n 5

# Include file diffs for detailed analysis
dot summary -d

# Verbose mode with commit details
dot summary -v

# Combine options
dot summary -n 10 -d -v
```

**Example Output:**
```
=> Summary of Recent Changes

Development Focus: Recent work centers on improving the diagnostic navigation
system in Neovim, updating deprecated API calls to use modern vim.diagnostic.jump()
functions. This includes better error handling and user experience improvements.

Technical Patterns: The commits show incremental configuration refinements
with a focus on tooling updates and environment optimization...
```

### Performance & Development Tools

#### `dot benchmark-shell` - Fish Shell Performance Benchmarking
```bash
# Run 10 benchmarks (default)
dot benchmark-shell

# Run specific number of benchmarks
dot benchmark-shell -r 20

# Show verbose output with individual timings  
dot benchmark-shell -v

# Combine options
dot benchmark-shell -r 15 -v
```

Measures Fish shell startup performance with detailed analysis:
- **High-precision timing** via Python3 or Perl
- **Performance assessment** with color-coded results (excellent ≤50ms, good ≤100ms, fair ≤200ms)
- **Optimization tips** for sl

... (truncated)

## Links

- [GitHub Repository](https://github.com/dmmulroy/.dotfiles/blob/main/home/.config/opencode/skill/prd-task/SKILL.md?plain=1#L152)
- [Original Tweet](https://x.com/RozenMD/status/2011360823499698238)

## Original Tweet

> stealing this from @dillon_mulroy 

https://t.co/Tak5eCNTlM https://t.co/K0hrezuaMH

— @RozenMD (Max Rozen)