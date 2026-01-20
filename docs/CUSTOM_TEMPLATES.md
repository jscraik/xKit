# Custom Templates for xKit Summarization

**Phase 4 Feature**: Create reusable summarization prompts with variable substitution.

## Overview

Custom templates allow you to define domain-specific summarization prompts that go beyond the built-in personas and length levels. Templates are stored as Markdown files with YAML frontmatter in `~/.xkit/templates/`.

## Quick Start

```bash
# Create a custom template
mkdir -p ~/.xkit/templates

# Create template file at ~/.xkit/templates/my-template.md
# Use --template flag to use it
xkit archive --summarize --template my-template -n 10

# Override template variables
xkit archive --summarize --template my-template --var domain=AI -n 10
```

## Template Format

Templates use YAML frontmatter followed by Markdown content:

```markdown
---
name: template-name          # Required: Unique identifier
description: Human description  # Required: Shown in listings
category: academic           # Optional: For grouping templates
variables:                   # Optional: Default variable values
  domain: Computer Science
  focus: algorithms
---

Template content with {{variable}} placeholders.
```

## Template Directory

Templates are loaded from:
- **Default**: `~/.xkit/templates/`
- **Custom**: Set via `templateDir` in `~/.config/xkit/config.json5` or `.xkitrc.json5`

### Example Config

```json5
// ~/.config/xkit/config.json5
{
  "templateDir": "/path/to/my/templates"
}
```

## Variable Syntax

Variables use double curly braces: `{{variableName}}`

### Substitution Rules

1. **Strict Mode**: Undefined variables cause errors (catches typos early)
2. **Default Values**: Set in template frontmatter under `variables:`
3. **Override**: Use `--var key=value` flags to override defaults

### Example

```markdown
---
variables:
  domain: CS
  focus: algorithms
---

Analyze this {{domain}} paper with {{focus}} focus.
```

```bash
# Use defaults (domain=CS, focus=algorithms)
xkit archive --summarize --template research-paper

# Override focus only
xkit archive --summarize --template research-paper --var focus=NLP

# Override both
xkit archive --summarize --template research-paper --var domain=ML --var focus=optimization
```

## Allowed Variables

The following variables are allowed in templates (security validation):

| Variable | Purpose | Example |
|----------|---------|---------|
| `domain` | Domain or field of study | `Computer Science`, `Machine Learning` |
| `focus` | Specific area to emphasize | `algorithms`, `optimization`, `NLP` |
| `methodology` | Research or analysis method | `quantitative`, `experimental`, `theoretical` |
| `format` | Output format style | `actionable`, `comprehensive`, `brief` |
| `audience` | Target audience | `developers`, `researchers`, `managers` |
| `context` | Additional context | `API design`, `system architecture` |
| `url` | Original content URL (auto-filled) | - |
| `title` | Original content title (auto-filled) | - |
| `author` | Content author (auto-filled) | - |
| `language` | Content language (auto-filled) | - |
| `difficulty` | Difficulty level | `beginner`, `intermediate`, `advanced` |
| `category` | Content category | `tutorial`, `reference`, `opinion` |

## Security

Templates are validated before use for security:

- **Forbidden Patterns**: System access, code execution, external calls
- **Max Length**: 10KB per template
- **Variable Whitelist**: Only allowed variables can be used
- **Path Traversal Protection**: Template names are sanitized

### Forbidden Patterns

The following patterns are blocked in templates:

- `process.*` - System access
- `child_process` - Process spawning
- `fs.*` - Filesystem access
- `require(` - Module loading
- `eval(`, `Function(`, `new Function(` - Code execution
- `exec(`, `spawn(`, `execFile(` - Shell access
- `fetch(`, `axios.*`, `http.get(`, `https.get(` - External calls

## CLI Usage

### Use Built-in Personas (Existing)

```bash
xkit archive --summarize --persona technical-researcher --length long -n 10
```

### Use Custom Template (New)

```bash
# Template with default variables
xkit archive --summarize --template research-paper -n 10

# Template with variable overrides
xkit archive --summarize --template research-paper --var domain=ML --var focus=NLP -n 10

# Multiple variables
xkit archive --summarize --template research-paper \
  --var domain="Deep Learning" \
  --var focus="transformer architectures" \
  --var methodology="empirical" \
  -n 10
```

### Template Takes Precedence Over Persona

When both `--template` and `--persona` are specified, the template takes precedence:

```bash
# Template provides full custom instructions, persona is ignored
xkit archive --summarize --template research-paper --persona educator -n 10
```

## Error Handling

### Template Not Found

```bash
$ xkit archive --summarize --template nonexistent

Template not found: nonexistent

Available templates:
  - research-paper: Academic paper summary with methodology focus
  - blog-post: Blog post summarization for quick reading
  - technical-doc: Technical documentation review and summary

Or use --persona instead:
  xkit archive --summarize --persona technical-researcher
```

### Undefined Variable

```bash
$ xkit archive --summarize --template research-paper --var typo=value

Undefined variables in template: methodology

Required variables: methodology

Use --var to set values:
  --var methodology=value
  --var typo=value

Or define defaults in template frontmatter:
---
variables:
  methodology: default value
---
```

### Invalid YAML

```bash
$ xkit archive --summarize --template broken

Invalid YAML frontmatter in template: ~/.xkit/templates/broken.md

YAML Error: Bad indentation

Common YAML issues:
- Proper indentation (use 2 spaces, not tabs)
- Quoted strings with special characters
- No trailing commas
- Boolean values: true/false
```

## Example Templates

See `examples/templates/` for complete examples:

### Research Paper Template

```markdown
---
name: research-paper
description: Academic paper summary with methodology focus
category: academic
variables:
  domain: Computer Science
  focus: algorithms
  methodology: quantitative
---

You are analyzing a {{domain}} research paper.

Focus your summary on: {{focus}}

### Research Objective
Describe the core problem or research question.

### Methodology
Detail the {{methodology}} approach used.

### Key Findings
Summarize the main results and discoveries.

### Implications
Discuss broader impact for {{domain}}.
```

### Blog Post Template

```markdown
---
name: blog-post
description: Blog post summarization for quick reading
category: general
variables:
  audience: developers
  format: actionable
---

Summarize this blog post for {{audience}}.

Format: {{format}}

1. Main thesis or argument
2. Key takeaways or actionable insights
3. Tools or resources mentioned
```

### Technical Documentation Template

```markdown
---
name: technical-doc
description: Technical documentation review and summary
category: engineering
variables:
  context: API design
  focus: architecture
---

You are reviewing technical documentation about {{context}}.

Focus your analysis on: {{focus}}

### Purpose & Scope
What does this documentation cover?

### Key Technical Details
Architecture patterns, APIs, interfaces, configuration options.

### Practical Guidance
Usage examples, best practices, common pitfalls.

### Assessment
Clarity, completeness, missing information.
```

## Best Practices

### 1. Use Descriptive Names

```yaml
---
name: research-paper-nlp-quantitative  # Good: specific and descriptive
description: NLP papers with quantitative analysis
---
```

### 2. Provide Default Variables

```yaml
---
variables:
  domain: Computer Science  # Default makes template usable immediately
  focus: general            # Can be overridden with --var
---
```

### 3. Document Template Purpose

```yaml
---
description: Academic paper summary emphasizing methodology and quantitative results  # Clear description
category: academic         # Helps with organization
---
```

### 4. Use Category for Grouping

```yaml
---
category: academic    # Group research papers together
category: engineering # Group technical docs together
category: general     # Group general templates together
---
```

### 5. Keep Templates Focused

Each template should serve a specific use case:
- `research-paper-ml` for ML papers
- `research-paper-nlp` for NLP papers
- `blog-post-dev` for developer blog posts
- `technical-doc-api` for API documentation

## Troubleshooting

### Template Not Loading

1. Check file extension: Must be `.md`
2. Check file location: Must be in `~/.xkit/templates/` (or configured `templateDir`)
3. Check YAML syntax: Use a YAML validator if needed
4. Check required fields: `name` and `description` are required

### Variable Not Substituting

1. Check variable name: Must match `{{variableName}}` exactly
2. Check spelling: Variable names are case-sensitive
3. Check allowed variables: See list of allowed variables above
4. Check `--var` format: Must be `key=value`

### Template Validation Failed

1. Check for forbidden patterns: See security section
2. Check template length: Maximum 10KB
3. Check variable names: Must be in allowed list

## Advanced Usage

### Combining with Built-in Features

Templates work alongside existing xKit features:

```bash
# Combine with categorization
xkit archive --summarize --template research-paper --skip-categorization -n 10

# Combine with full content extraction
xkit archive --summarize --template technical-doc --output-dir ./knowledge -n 10

# Combine with organization
xkit archive --summarize --template blog-post --organize-by-month -n 10
```

### Creating Template Variants

Create specialized templates for different domains:

```bash
~/.xkit/templates/
  research-paper-ml.md       # ML papers
  research-paper-nlp.md      # NLP papers
  research-paper-systems.md  # Systems papers
  blog-post-dev.md           # Developer blogs
  blog-post-design.md        # Design blogs
  technical-doc-api.md       # API docs
  technical-doc-ui.md        # UI docs
```

## Migration Guide

### From Built-in Personas to Custom Templates

If you're currently using `--persona` and `--length`, you can create equivalent templates:

```bash
# Current usage
xkit archive --summarize --persona technical-researcher --length long -n 10

# Create equivalent template at ~/.xkit/templates/tech-long.md
# with content combining technical-researcher persona and long length instructions

# New usage
xkit archive --summarize --template tech-long -n 10
```

## See Also

- [README.md](../README.md) - General xKit documentation
- [examples/templates/](../examples/templates/) - Example templates
- [Phase 4 Plan](../PRD.md) - Implementation details
