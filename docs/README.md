# xKit Documentation

Complete documentation for xKit - the fast X/Twitter CLI and bookmark archiving tool.

## Getting Started

- [Main README](../README.md) - Installation, quickstart, and basic usage
- [Bookmark Archiving Guide](bookmark-archiving.md) - Complete guide to bookmark archiving features

## Features

### Core Features

- **Twitter CLI** - Tweet, reply, read, search via GraphQL API
- **Bookmark Management** - Fetch, organize, and archive bookmarks
- **Content Enrichment** - Automatic URL expansion and content extraction
- **Smart Categorization** - Organize bookmarks by content type
- **Knowledge Base** - Build a markdown-based knowledge repository

### Advanced Features

- **Webhook Notifications** - Discord, Slack, and custom webhooks
- **Folder Support** - Preserve Twitter bookmark folder organization
- **Media Handling** - Extract and archive photos, videos, GIFs
- **Statistics Tracking** - Detailed processing metrics and growth stats
- **Daemon Mode** - Continuous background archiving

## Guides

### User Guides

- [Bookmark Archiving](bookmark-archiving.md) - Complete archiving workflow
- [Bookmark Export Analysis](bookmark-export-analysis.md) - Export and analysis features

### Developer Guides

- [Testing Guide](testing.md) - Running tests and writing new tests
- [Release Process](releases.md) - How releases work with Changesets
- [Releasing Checklist](releasing.md) - Step-by-step release guide

### Implementation Details

- [Implementation Summary](implementation/IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [Priority Features](implementation/PRIORITY_FEATURES_COMPLETE.md) - Smaug-inspired features

## API Reference

### Library Usage

xKit can be used as a library in your Node.js projects:

```typescript
import {
  TwitterClient,
  resolveCredentials,
  BookmarkEnricher,
  BookmarkCategorizer,
  MarkdownWriter,
  WebhookNotifier,
} from '@brainwav/xkit';
```

See the [main README](../README.md#library) for detailed API documentation.

## Configuration

### Config Files

- Global: `~/.config/xkit/config.json5`
- Project: `./.xkitrc.json5`

### Environment Variables

- `AUTH_TOKEN`, `CT0` - Twitter credentials
- `XKIT_TIMEOUT_MS` - Request timeout
- `XKIT_COOKIE_TIMEOUT_MS` - Cookie extraction timeout
- `XKIT_QUOTE_DEPTH` - Max quoted tweet depth

See [Configuration](../README.md#config-json5) for full details.

## Architecture

### Project Structure

```
xKit/
├── src/
│   ├── lib/                      # Core Twitter client
│   ├── cli/                      # CLI framework
│   ├── commands/                 # Command implementations
│   ├── bookmark-enrichment/      # Content extraction
│   ├── bookmark-categorization/  # Smart categorization
│   ├── bookmark-markdown/        # Markdown generation
│   ├── bookmark-folders/         # Folder management
│   ├── bookmark-media/           # Media handling
│   ├── bookmark-state/           # State management
│   ├── bookmark-stats/           # Statistics tracking
│   ├── bookmark-daemon/          # Daemon mode
│   ├── webhook-notifications/    # Webhook support
│   └── setup-wizard/             # Interactive setup
├── tests/                        # Test files
├── docs/                         # Documentation
└── examples/                     # Usage examples
```

### Design Patterns

- **Mixin Pattern** - TwitterClient composition
- **Command Pattern** - CLI commands
- **Module Pattern** - Feature organization
- **State Management** - Incremental processing

## Contributing

### Development Setup

```bash
pnpm install
pnpm run build
pnpm test
```

### Code Style

- TypeScript strict mode
- 2-space indentation
- ESM modules
- Explicit `.js` extensions in imports

### Testing

- Unit tests with Vitest
- Property-based tests with fast-check
- Live API tests (require auth)
- 90% coverage target

## Support

### Troubleshooting

See [Troubleshooting](../README.md#troubleshooting) in the main README.

### Common Issues

- Missing credentials → Run `xkit setup`
- Query ID errors → Run `xkit query-ids --fresh`
- Rate limiting → Reduce request frequency

### Getting Help

- [GitHub Issues](https://github.com/jscraik/xKit/issues)
- [Discussions](https://github.com/jscraik/xKit/discussions)

## License

MIT - See [LICENSE](../LICENSE) for details.
