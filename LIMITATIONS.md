# Known Limitations

Last updated: 2026-01-19

This document outlines the current limitations of xKit v0.7.0 and our plans to address them.

## Table of Contents

- [Platform Limitations](#platform-limitations)
- [Authentication Limitations](#authentication-limitations)
- [API Limitations](#api-limitations)
- [Feature Limitations](#feature-limitations)
- [Performance Limitations](#performance-limitations)
- [Security Considerations](#security-considerations)

---

## Platform Limitations

### Browser Cookie Extraction

**Limitation:** Cookie extraction only works on macOS with Safari, Chrome, and Firefox.

**Impact:** Linux and Windows users must manually provide `AUTH_TOKEN` and `CT0` environment variables.

**Planned Improvement:**
- [ ] Add Windows cookie extraction support (Q2 2026)
- [ ] Add Linux cookie extraction support (Q2 2026)

**Workaround:**
```bash
# Manual authentication for Linux/Windows
export AUTH_TOKEN="your_token"
export CT0="your_ct0"
xkit whoami
```

### Chrome Profile Encryption

**Limitation:** Chrome cookies may be encrypted on some macOS systems, preventing extraction.

**Impact:** `--cookie-source chrome` may fail with decryption errors.

**Planned Improvement:**
- [ ] Add keychain integration for Chrome decryption (Q2 2026)

**Workaround:** Use Safari or Firefox instead:
```bash
xkit check --cookie-source safari
```

---

## Authentication Limitations

### Cookie-Based Authentication Only

**Limitation:** xKit uses browser cookies for authentication, not OAuth or API tokens.

**Impact:**
- Cookies expire and must be refreshed
- No official API support
- May violate X/Twitter ToS (use at your own risk)

**Planned Improvement:**
- [ ] Evaluate official API support for Phase 2 (post-evidence validation)

**Workaround:** Re-authenticate by logging into X/Twitter in your browser.

### No Multi-Account Support

**Limitation:** Can only authenticate with one account at a time.

**Impact:** Switching between accounts requires manual cookie management.

**Planned Improvement:**
- [ ] Add profile configuration for multiple accounts (Q3 2026, conditional on evidence)

**Workaround:** Use different cookie sources or manual tokens for each account.

---

## API Limitations

### Undocumented GraphQL API

**Limitation:** xKit uses X/Twitter's undocumented web GraphQL API.

**Impact:**
- API may change without notice
- Query IDs rotate frequently
- No official support or documentation
- May be blocked by X/Twitter at any time

**Planned Improvement:**
- [ ] Auto-recovery mechanisms already in place
- [ ] Query ID refresh with `xkit query-ids --fresh`
- [ ] Fallback to legacy REST endpoints for some operations

**Workaround:** If queries fail, run `xkit query-ids --fresh` and retry.

### Unknown Rate Limits

**Limitation:** X/Twitter's rate limits for the web GraphQL API are not documented.

**Impact:**
- May encounter 429 errors unexpectedly
- No guaranteed request limits
- Throttling behavior may change

**Planned Improvement:**
- [ ] Collect rate limit data from community usage
- [ ] Implement adaptive rate limiting (Q2 2026)

**Workaround:** Wait 15-30 minutes after rate limit errors before retrying.

### No Media Upload in GraphQL Mode

**Limitation:** Media uploads use the legacy REST endpoint, not GraphQL.

**Impact:** May be less reliable than native GraphQL media uploads.

**Planned Improvement:**
- [ ] Monitor for GraphQL media upload availability

**Workaround:** Current fallback to REST endpoint works reliably.

---

## Feature Limitations

### Bookmark Archiving

**Limitation:** Archive command processes bookmarks sequentially, not in parallel.

**Impact:**
- Large archives (1000+ bookmarks) can take hours with AI summarization
- No resume capability if interrupted mid-run

**Planned Improvement:**
- [ ] Add checkpoint/resume functionality (Q2 2026, conditional on evidence)
- [ ] Parallel processing with configurable concurrency (Q3 2026, conditional on evidence)

**Workaround:** Process in smaller batches:
```bash
xkit archive --limit 100
xkit archive --limit 100 --offset 100
```

### AI Summarization

**Limitation:** AI summarization requires Ollama to be installed and running.

**Impact:**
- Additional setup required for AI features
- 2-4GB RAM usage per model
- 10-30 seconds per bookmark on CPU

**Planned Improvement:**
- [ ] Document alternative AI providers (OpenAI, Anthropic) for Phase 2 (conditional on evidence)
- [ ] Add optional cloud API support (Q3 2026, conditional on evidence)

**Workaround:** Use `--no-ai` flag for faster archiving without summarization.

### No Tweet Posting in CLI

**Limitation:** The `tweet` and `reply` commands exist but are not well-documented in Phase 1.

**Impact:** Users may not discover these features.

**Planned Improvement:**
- [ ] Comprehensive tweet/reply documentation in Phase 2 (conditional on evidence)

**Workaround:** Commands work but are undocumented in this release:
```bash
xkit tweet "Hello, world!"
xkit reply <tweet-id> "This is a reply"
```

### Limited Search Operators

**Limitation:** Search uses X/Twitter's search syntax, which has limited advanced operators.

**Impact:** Complex queries may not work as expected.

**Planned Improvement:**
- [ ] Document supported search operators in Phase 2 (conditional on evidence)

**Workaround:** Use X/Twitter's web UI for complex searches, then use xkit for results.

### Metrics Collection

**Limitation:** Metrics are stored locally and never transmitted (privacy-first design).

**Impact:** No aggregate usage statistics or community insights available.

**Planned Improvement:**
- [ ] Opt-in telemetry for Phase 2 (conditional on strong user demand and governance approval)

**Workaround:** Manual metrics inspection:
```bash
xkit metrics
cat ~/.xkit/metrics.json
```

---

## Performance Limitations

### CLI Startup Overhead

**Limitation:** TypeScript/Node.js startup overhead (~500ms p95).

**Impact:** Noticeable delay for quick commands.

**Planned Improvement:**
- [ ] Native binary via Homebrew reduces this to ~50ms (available now)

**Workaround:** Use Homebrew installation for faster startup:
```bash
brew install jscraik/tap/xkit
```

### Memory Usage

**Limitation:** Each CLI invocation uses ~50-100MB base memory.

**Impact:** Negligible for modern systems, but notable on resource-constrained devices.

**Planned Improvement:**
- [ ] Optimize for lower memory usage in Phase 2 (conditional on evidence)

**Workaround:** Use native binary for lower memory footprint.

### Network Latency

**Limitation:** All operations require network calls to X/Twitter servers.

**Impact:** Commands are slower on high-latency connections.

**Planned Improvement:**
- [ ] Add caching layer for frequently accessed data (Q3 2026, conditional on evidence)

**Workaround:** Use `--timeout` flag to adjust for slow connections:
```bash
xkit --timeout 60000 whoami  # 60 second timeout
```

---

## Security Considerations

### Cookie Storage

**Limitation:** xKit reads cookies from browser stores but does not store them.

**Impact:** Re-authentication required if browser cookies change.

**Security Trade-off:** This is intentional - xKit does not persist credentials for security reasons.

### No Content Sanitization by Default

**Limitation:** Archived bookmark content may contain malicious HTML/JavaScript.

**Impact:** Opening archived markdown files in browsers could execute malicious code.

**Mitigation:** HTML sanitization tests are in place (tests/security/malicious-html.test.ts).

**Best Practice:** Review archived content before opening in browsers. Use text editors for viewing.

### Ollama Network Exposure

**Limitation:** Ollama runs on localhost:11434 and may be exposed to network.

**Impact:** If your firewall is misconfigured, Ollama API could be accessible to other devices on your network.

**Best Practice:** Ensure firewall blocks inbound connections to port 11434.

---

## Governance & Evidence Limitations

### No User Validation

**Limitation:** Phase 1 shipped without user validation (evidence-first principle violated).

**Impact:** Features may not match user needs or workflows.

**Mitigation:** Evidence plan is now active (see `.specs/EVIDENCE_PLAN_TRACKING.md`).

**Planned Improvement:**
- [ ] Community engagement and feedback collection (Q1 2026)
- [ ] Go/no-go decision framework for Phase 2 (2026-02-01)

### Unknown User Base

**Limitation:** No telemetry or usage data collected (privacy-first).

**Impact:** Difficult to prioritize features based on actual usage.

**Mitigation:** Community feedback via GitHub Issues and Discussions.

---

## Reporting Limitations

If you've encountered a limitation not listed here, please:

1. **Search existing issues:** https://github.com/jscraik/xKit/issues
2. **Create a new issue:** Use the "limitation" label
3. **Join the discussion:** GitHub Discussions for feature requests

---

**Last updated:** 2026-01-19
**Next review:** 2026-04-19 (quarterly, or after each release)
