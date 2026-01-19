# Troubleshooting Guide

Last updated: 2026-01-19

This guide helps you diagnose and resolve common issues with xKit.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Authentication & Cookie Problems](#authentication--cookie-problems)
- [Command Execution Issues](#command-execution-issues)
- [Performance Issues](#performance-issues)
- [Error Messages](#error-messages)
- [Ollama Integration Issues](#ollama-integration-issues)

---

## Installation Issues

### `command not found: xkit` after npm install

**Symptoms:** Running `xkit` returns "command not found" after installation.

**Causes:**
1. npm global bin directory not in PATH
2. Installation failed silently
3. Using wrong package manager

**Solutions:**

1. **Check npm global location:**
   ```bash
   npm config get prefix
   # Add output/bin to your PATH if needed
   ```

2. **Verify installation:**
   ```bash
   npm list -g @brainwav/xkit
   ```

3. **Try alternative install methods:**
   ```bash
   # pnpm
   pnpm add -g @brainwav/xkit

   # bun
   bun add -g @brainwav/xkit

   # Homebrew (macOS)
   brew install jscraik/tap/xkit
   ```

### Node.js version error

**Symptoms:** Error about Node version being too old.

**Solution:** xKit requires Node.js >= 22.
```bash
# Check your version
node --version

# Upgrade with mise (recommended)
mise use node@lts

# Or use nvm
nvm install 22
nvm use 22
```

---

## Authentication & Cookie Problems

### `check` fails with "No credentials found"

**Symptoms:** `xkit check` returns no cookies or credentials.

**Causes:**
1. Not logged into X/Twitter in any supported browser
2. Browser cookies encrypted (Chrome on macOS)
3. Unsupported browser profile

**Solutions:**

1. **Log in to X/Twitter:**
   - Open Safari, Chrome, or Firefox
   - Log in to https://x.com
   - Run `xkit check` again

2. **Specify browser explicitly:**
   ```bash
   xkit check --cookie-source safari
   xkit check --cookie-source chrome
   xkit check --cookie-source firefox
   ```

3. **Try specific Chrome profile:**
   ```bash
   xkit check --cookie-source chrome --chrome-profile "Default"
   xkit check --cookie-source chrome --chrome-profile "Profile 1"
   ```

4. **Manual authentication (last resort):**
   ```bash
   # Set cookies manually (see browser DevTools -> Application -> Cookies)
   export AUTH_TOKEN="your_auth_token"
   export CT0="your_ct0_token"
   xkit check
   ```

### `401 Unauthorized` or `403 Forbidden` errors

**Symptoms:** API calls return 401/403 errors despite cookies being found.

**Causes:**
1. Cookies expired
2. Account suspended or locked
3. X/Twitter session invalidated

**Solutions:**

1. **Refresh browser session:**
   - Open X/Twitter in your browser
   - Log out and log back in
   - Run `xkit check` again

2. **Check account status:**
   - Try accessing X/Twitter in a browser
   - Verify your account is not suspended

3. **Clear xKit cache:**
   ```bash
   rm -rf ~/.config/xkit/query-ids-cache.json
   xkit query-ids --fresh
   ```

### Cookie extraction timeout

**Symptoms:** Long delay before "No credentials found" error.

**Cause:** Keychain/OS helpers timing out (default 30s).

**Solution:** Increase timeout or skip slow sources:
```bash
# Increase timeout to 60 seconds
xkit check --cookie-timeout 60000

# Skip problematic browser
xkit check --cookie-source safari  # only try Safari
```

---

## Command Execution Issues

### `archive` command fails silently

**Symptoms:** `xkit archive` exits without output or errors.

**Causes:**
1. No bookmarks to process
2. Output directory not writable
3. Ollama timeout (if using AI summarization)

**Solutions:**

1. **Run with verbose output:**
   ```bash
   xkit archive --stats
   xkit archive --limit 1  # test with single bookmark
   ```

2. **Check output directory permissions:**
   ```bash
   ls -la ~/bookmarks  # or your configured output dir
   ```

3. **Test without AI:**
   ```bash
   xkit archive --limit 5 --no-ai
   ```

### `read` shows wrong or incomplete data

**Symptoms:** Tweet content missing, truncated, or outdated.

**Causes:**
1. GraphQL query ID expired (404 error)
2. Tweet deleted or protected
3. Rate limiting

**Solutions:**

1. **Refresh query IDs:**
   ```bash
   xkit query-ids --fresh
   ```

2. **Verify tweet exists:**
   - Try opening the tweet URL in a browser
   - Check if the account is private

3. **Check rate limits:**
   ```bash
   # Wait a few minutes and retry
   xkit read <tweet-id>
   ```

### `daemon` won't start or crashes

**Symptoms:** `xkit daemon start` fails or daemon stops running.

**Causes:**
1. Port already in use
2. Invalid configuration
3. Process permissions

**Solutions:**

1. **Check daemon status:**
   ```bash
   xkit daemon status
   ```

2. **View daemon logs:**
   ```bash
   xkit daemon logs
   ```

3. **Stop and restart:**
   ```bash
   xkit daemon stop
   xkit daemon start --interval 30m
   ```

---

## Performance Issues

### Slow CLI startup

**Symptoms:** Noticeable delay before command output.

**Causes:**
1. Large node_modules (npm vs pnpm)
2. Slow filesystem access
3. Keychain access delays

**Solutions:**

1. **Use pnpm or bun instead of npm:**
   ```bash
   pnpm add -g @brainwav/xkit
   # or
   brew install jscraik/tap/xkit  # native binary, fastest
   ```

2. **Reduce cookie timeout:**
   ```bash
   xkit check --cookie-timeout 5000  # 5 seconds
   ```

3. **Use specific cookie source:**
   ```bash
   xkit --cookie-source safari whoami  # skip slower browsers
   ```

### High memory usage during archive

**Symptoms:** System slows down during large archive operations.

**Causes:**
1. Processing many bookmarks at once
2. Ollama AI model memory usage
3. Memory leak (unlikely but possible)

**Solutions:**

1. **Process in smaller batches:**
   ```bash
   xkit archive --limit 50
   xkit archive --limit 50 --offset 50
   ```

2. **Disable AI for large batches:**
   ```bash
   xkit archive --all --no-ai
   ```

3. **Check Ollama resource usage:**
   ```bash
   # Ollama typically uses 2-4GB RAM per model
   ollama ps
   ```

### Network timeout errors

**Symptoms:** Commands fail with timeout errors.

**Causes:**
1. Slow or unstable internet connection
2. X/Twitter API delays
3. Firewall/proxy interference

**Solutions:**

1. **Increase timeout:**
   ```bash
   xkit --timeout 60000 whoami  # 60 seconds
   ```

2. **Check network connectivity:**
   ```bash
   curl -I https://x.com
   ```

3. **Try simpler commands first:**
   ```bash
   xkit whoami  # lightweight command
   ```

---

## Error Messages

### `Error: automated request` (code 226)

**Cause:** X/Twitter anti-bot detection triggered.

**Solution:** This is usually temporary. Wait a few minutes and retry. If persistent, your account may be flagged.

### `Error: 404 Not Found` on GraphQL operations

**Cause:** GraphQL query ID has rotated/expired.

**Solution:**
```bash
xkit query-ids --fresh
```

### `Error: 429 Too Many Requests`

**Cause:** Rate limiting by X/Twitter API.

**Solution:** Wait 15-30 minutes before retrying. Reduce concurrent operations.

### `Error: ENOENT: no such file or directory`

**Cause:** Output directory doesn't exist or permissions issue.

**Solution:**
```bash
# Create directory manually
mkdir -p ~/bookmarks

# Check permissions
ls -la ~/bookmarks
```

### `Error: Invalid handle or user ID`

**Cause:** Malformed username/user ID format.

**Solution:**
```bash
# Correct format
xkit followers --user @username -n 10  # with @
xkit followers --user 12345678 -n 10   # numeric ID
```

---

## Ollama Integration Issues

### `Ollama connection refused` or `Ollama not available`

**Symptoms:** AI summarization fails with Ollama connection errors.

**Causes:**
1. Ollama not installed
2. Ollama not running
3. Wrong API endpoint

**Solutions:**

1. **Install Ollama:**
   ```bash
   # macOS
   brew install ollama

   # Or download from https://ollama.com
   ```

2. **Start Ollama:**
   ```bash
   ollama serve
   ```

3. **Verify connection:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

4. **Pull required model:**
   ```bash
   ollama pull llama3.1  # or qwen2.5, mistral, etc.
   ```

### AI summarization is slow

**Symptoms:** Each bookmark takes 10-30 seconds to process.

**Cause:** This is expected behavior for local AI models on CPU.

**Solutions:**

1. **Use faster model:**
   ```bash
   ollama pull phi3  # smaller/faster model
   xkit archive --model phi3
   ```

2. **Process smaller batches:**
   ```bash
   xkit archive --limit 10
   ```

3. **Disable AI for large archives:**
   ```bash
   xkit archive --all --no-ai
   ```

### AI returns garbled or low-quality output

**Symptoms:** Summaries are nonsensical or incomplete.

**Causes:**
1. Model not suitable for summarization
2. Input too long or malformed
3. Model needs to be updated

**Solutions:**

1. **Try different model:**
   ```bash
   ollama pull mistral
   xkit archive --model mistral
   ```

2. **Update Ollama:**
   ```bash
   brew upgrade ollama
   ollama pull llama3.1  # refresh model
   ```

3. **Check model is running:**
   ```bash
   ollama ps
   ollama list
   ```

---

## Still Need Help?

If you're still experiencing issues after trying these solutions:

1. **Check existing issues:** https://github.com/jscraik/xKit/issues
2. **Create a new issue:** Include:
   - xKit version (`xkit --version`)
   - Command that failed
   - Full error message
   - Operating system and Node.js version
   - Steps to reproduce

3. **Join the community:** Reply to the launch post or create a GitHub Discussion for questions.

---

**Last updated:** 2026-01-19
**Next review:** 2026-04-19 (quarterly)
