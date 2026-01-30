# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in xKit, please **do not open a public issue**. Instead, send an email to the project maintainer privately.

Please include:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested mitigation (if known)

The maintainer will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Security Best Practices

### For Users

#### 1. Credential Storage

xKit stores Twitter authentication tokens in configuration files. Protect these credentials:

```bash
# Set restrictive permissions on config directory
chmod 700 ~/.config/xkit/
chmod 600 ~/.config/xkit/config.json5

# Never commit config files to version control
echo "config.json5" >> .gitignore
```

#### 2. Token Exposure

Be aware of where your tokens may be exposed:
- Shell history: Commands with `--auth-token` flag are saved in history
- Process list: Tokens may be visible in `ps` output
- Error messages: Tokens are redacted in error output
- Screenshots/logs: Be careful when sharing terminal screenshots

#### 3. Keychain Integration (Recommended)

When possible, use system keychain integration instead of plain text tokens:

```bash
# Use Chrome/Firefox profile integration (more secure)
xkit --chrome-profile default-release bookmarks-archive
```

### For Developers

#### 1. Cookie Redaction

Always redact authentication cookies in logs and error messages:

```typescript
// ❌ Bad
console.error(`Auth failed with token ${cookies.authToken}`);

// ✅ Good
console.error(`Auth failed with token ${cookies.authToken?.substring(0, 10)}...`);
```

#### 2. Prompt Injection Protection

When processing untrusted input (URLs, user data), validate and sanitize:

```typescript
// Validate URLs before processing
if (!isValidUrl(userInput)) {
    throw new Error('Invalid URL provided');
}
```

#### 3. Dependency Security

Regularly audit dependencies:

```bash
# Check for vulnerabilities
pnpm audit

# Automatically fix vulnerabilities
pnpm audit fix

# Check for outdated dependencies
pnpm outdated
```

#### 4. Environment Variables

Use environment variables for sensitive data in CI/CD:

```bash
# Never pass tokens in command line arguments
# ❌ Bad: xkit --auth-token $TOKEN tweet "hello"

# ✅ Good: export XKIT_AUTH_TOKEN=$TOKEN
export XKIT_AUTH_TOKEN=$TOKEN
xkit tweet "hello"
```

## Security Features

### Implemented

- **Cookie Redaction**: Authentication tokens are partially redacted in error messages
- **Prompt Injection Protection**: Untrusted input is validated before processing
- **Input Validation**: All user inputs are validated and type-checked
- **Error Handling**: Errors are caught and logged without exposing sensitive data

### Planned

- **Keychain Storage**: Store tokens in system keychain instead of config files
- **Token Encryption**: Encrypt tokens at rest in configuration files
- **Audit Logging**: Log all authentication events for security monitoring
- **Rate Limiting**: Implement client-side rate limiting to prevent abuse

## Known Security Considerations

### 1. Twitter API Rate Limits

xKit respects Twitter's rate limits but does not implement client-side throttling. Aggressive use may result in temporary account restrictions.

**Mitigation**: Use built-in delays and batch processing options.

### 2. Third-Party Dependencies

xKit depends on several npm packages. While we regularly audit dependencies, vulnerabilities may be discovered between updates.

**Mitigation**: Regular dependency audits and automated scanning in CI/CD.

### 3. Arbitrary Code Execution

Some commands (e.g., `--template`, custom summarization) may execute external code or interact with LLMs.

**Mitigation**: Only use trusted templates and LLM models.

## Supported Versions

Security updates are provided for:
- Latest stable version
- Previous minor version (for 6 months after release)
- Critical security updates may be provided for older versions at the maintainer's discretion

## Security Audits

This project has not undergone a formal security audit. We welcome responsible security research.

### Responsible Disclosure

If you discover a security vulnerability, please:

1. **Do not** exploit the vulnerability
2. **Do not** expose user data
3. **Do not** degrade system performance
4. **Do** provide a reasonable timeline for resolution before public disclosure

## Dependency Security

### Auditing Dependencies

We audit dependencies regularly:

```bash
# Audit for known vulnerabilities
pnpm audit

# Check license compatibility
pnpm audit --license

# View dependency tree
pnpm list --depth=0
```

### Adding New Dependencies

Before adding a new dependency:

1. Check if it's actively maintained
2. Review its security history
3. Consider if the functionality can be implemented in-house
4. Prefer dependencies with fewer transitive dependencies

## Security Contact

For security issues, contact: (maintainer email/to be added)

For non-security issues, please open a GitHub issue.
