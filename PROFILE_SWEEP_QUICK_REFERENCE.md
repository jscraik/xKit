# Profile Sweep Quick Reference

## Command Syntax

```bash
xkit profile-sweep <username> [options]
```

## Common Use Cases

### 1. Basic Profile Archive

```bash
xkit profile-sweep @username --limit 200
```

Archives 200 most recent tweets with code snippets and media metadata.

### 2. Full Archive with Articles

```bash
xkit profile-sweep @username --extract-articles --limit 500
```

Extracts full article content from all shared links.

### 3. High-Engagement Content Only

```bash
xkit profile-sweep @username --min-likes 100 --exclude-retweets
```

Only archives tweets with 100+ likes, excluding retweets.

### 4. Date Range Archive

```bash
xkit profile-sweep @username --date-from 2024-01-01 --date-to 2024-12-31
```

Archives all tweets from 2024.

### 5. Complete Archive with Media

```bash
xkit profile-sweep @username --extract-articles --include-media --limit 1000
```

Downloads all media files and extracts articles.

### 6. Persona Extraction

```bash
xkit profile-sweep @username --create-skill --include-images --limit 500
```

Creates an AI persona skill from tweets and images.

### 7. Resume Interrupted Sweep

```bash
xkit profile-sweep @username --resume
```

Continues from last checkpoint if sweep was interrupted.

## All Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-n, --limit` | number | 200 | Number of tweets to fetch (max: 3200) |
| `--extract-articles` | flag | false | Extract full article content from links |
| `--include-code` | flag | true | Extract code snippets from tweets |
| `--include-media` | flag | false | Download all media (images and videos) |
| `--include-images` | flag | false | Download and analyze images |
| `--include-videos` | flag | false | Download videos |
| `--create-skill` | flag | false | Extract persona and generate Claude skill |
| `-t, --target` | path | ~/dev/agent-skills/personas | Target directory for skill output |
| `--model` | string | qwen2.5:7b | Ollama model for persona extraction |
| `--host` | url | <http://localhost:11434> | Ollama host URL |
| `--auto-approve` | flag | false | Write skill directly without review |
| `--min-likes` | number | 0 | Only include tweets with at least this many likes |
| `--exclude-retweets` | flag | false | Exclude retweets from the archive |
| `--date-from` | date | - | Only include tweets from this date onwards (YYYY-MM-DD) |
| `--date-to` | date | - | Only include tweets up to this date (YYYY-MM-DD) |
| `--output-format` | string | json,markdown | Additional output formats: csv, html, sqlite |
| `--resume` | flag | false | Resume from previous checkpoint if available |

## Output Files

After running a sweep, you'll find these files in `artifacts/{username}/`:

### Core Files

- **tweets.json** - Raw tweet data with full metadata
- **{username}-sweep-{date}.json** - Complete sweep data
- **{username}-sweep-{date}.md** - Human-readable report
- **SWEEP_SUMMARY.md** - Executive summary with stats

### Statistics & Analysis

- **statistics.json** - Engagement stats, hashtags, posting patterns
- **code-snippets-organized.json** - Code organized by type/component/category

### Optional Files

- **errors.log** - Error log (only if errors occurred)
- **persona.json** - AI-extracted persona (with --create-skill)
- **skill-creator-prompt.md** - Prompt for skill-creator (with --create-skill)
- **media/** - Downloaded media files (with --include-media)

## Statistics Included

The sweep automatically calculates:

- **Engagement**: Total/average likes, retweets, replies
- **Top Content**: Most engaging tweets
- **Hashtags**: Frequency analysis of hashtags used
- **Mentions**: Most mentioned accounts
- **Domains**: Most linked websites
- **Posting Patterns**: By hour, day of week, and month

## Error Handling

The sweep is designed to be resilient:

- **Non-blocking**: Errors don't stop the sweep
- **Retry logic**: Failed article extractions retry 3 times with exponential backoff
- **Error logging**: All failures logged to errors.log with timestamps
- **Progress tracking**: Real-time feedback on long operations
- **Deduplication**: Automatic removal of duplicate media/articles

## Performance Tips

1. **Start small**: Test with `--limit 50` first
2. **Use filters**: `--min-likes` and date filters reduce processing time
3. **Parallel processing**: Article extraction uses 5 concurrent requests
4. **Resume support**: Use `--resume` for large sweeps that might be interrupted
5. **Skip media**: Omit `--include-media` for faster sweeps

## Troubleshooting

### Sweep is slow

- Reduce `--limit` value
- Skip `--extract-articles` for faster processing
- Use `--min-likes` to filter low-engagement content

### Articles not extracting

- Check errors.log for specific failures
- Some sites block automated extraction
- Paywalled content won't extract

### Out of memory

- Reduce `--limit` value
- Skip `--include-media` to reduce memory usage
- Process in smaller batches using date filters

### Ollama errors (with --create-skill)

- Ensure Ollama is running: `ollama serve`
- Check model is available: `ollama list`
- Pull model if needed: `ollama pull qwen2.5:7b`

## Examples by Use Case

### Content Creator Analysis

```bash
xkit profile-sweep @creator --extract-articles --min-likes 50 --limit 1000
```

Analyze their most popular content and shared resources.

### Developer Research

```bash
xkit profile-sweep @developer --include-code --extract-articles --limit 500
```

Extract code snippets and technical articles they share.

### Persona Creation

```bash
xkit profile-sweep @person --create-skill --include-images --limit 300
```

Create an AI persona from their tweets and visual content.

### Historical Archive

```bash
xkit profile-sweep @account --date-from 2020-01-01 --date-to 2023-12-31 --limit 3200
```

Archive specific time period (max 3200 tweets per sweep).

### Media Collection

```bash
xkit profile-sweep @artist --include-media --min-likes 100 --limit 500
```

Download all media from high-engagement tweets.

## Next Steps

After running a sweep:

1. Review `SWEEP_SUMMARY.md` for overview
2. Check `statistics.json` for detailed analytics
3. Browse `{username}-sweep-{date}.md` for readable report
4. Explore `code-snippets-organized.json` for code patterns
5. If errors occurred, review `errors.log` for details

## Integration with Other Tools

The JSON output can be used with:

- Data analysis tools (Python, R)
- Visualization libraries (D3.js, Chart.js)
- Database imports (SQLite, PostgreSQL)
- Custom scripts and automation

## Support

For issues or questions:

- Check the main README.md
- Review docs/user-profile-archiving.md
- See PROFILE_SWEEP_IMPROVEMENTS.md for technical details
