/**
 * Sanitization utilities for knowledge reorganization.
 *
 * **Security (NON-NEGOTIABLE):**
 * - Handle validation MUST be ASCII-only: `/^[A-Za-z0-9_]+$/` (NOT `/^[\w]+$/` to prevent Unicode bypass)
 * - Path traversal check FIRST: Before any slugification, check for `/..\.[\/\\]/`
 * - Reserved Windows names: CON, PRN, AUX, NUL, COM1-9, LPT1-9 must be rejected
 * - Control characters: Strip ALL control chars (U+0000-U+001F, U+007F)
 *
 * Evidence: `.ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md:300-342`
 */

/** Reserved Windows device names that cannot be used as filenames */
const RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
];

/** Maximum length for real name in author folder */
const MAX_REAL_NAME_LENGTH = 100;

/**
 * Sanitize author folder name for filesystem safety.
 *
 * Format: `@handle` or `@handle (Real Name)`
 *
 * @param handle - Twitter handle (with or without @ prefix)
 * @param realName - Optional real name to include
 * @returns Sanitized author folder name
 *
 * @throws {Error} If handle contains invalid characters or is a reserved Windows name
 */
export function sanitizeAuthorName(handle: string, realName?: string): string {
  // 1. Extract handle without @
  const cleanHandle = handle.replace(/^@/, '');

  // 2. Validate handle (ASCII alphanumeric + underscore only)
  // FIXED: Changed from /^[\w]+$/ to prevent Unicode word characters
  if (!/^[A-Za-z0-9_]+$/.test(cleanHandle)) {
    throw new Error(
      `Invalid handle format: ${handle}. ` +
      `Handles must be ASCII alphanumeric or underscore only.`
    );
  }

  // 3. Check reserved names (safe now, handle is ASCII-only)
  if (RESERVED_NAMES.includes(cleanHandle.toUpperCase())) {
    throw new Error(`Reserved Windows filename: ${cleanHandle}`);
  }

  // 4. If no real name, return just handle
  if (!realName) {
    return `@${cleanHandle}`;
  }

  // 5. Sanitize real name (Unicode allowed here, in folder name only)
  let clean = realName
    .replace(/[\x00-\x1f\x7f]/g, '')           // Remove control characters
    .normalize('NFC')                           // Normalize Unicode
    .replace(/[<>:"|?*\/\\]/g, '')             // Remove dangerous filesystem chars
    .replace(/^[\s.]+|[\s.]+$/g, '')           // Remove leading/trailing dots/spaces
    .replace(/\s+/g, ' ')                       // Collapse multiple spaces
    .trim();

  // If real name is empty after sanitization, return just handle
  if (!clean) {
    return `@${cleanHandle}`;
  }

  // 6. Limit real name length
  if (clean.length > MAX_REAL_NAME_LENGTH) {
    clean = clean.slice(0, MAX_REAL_NAME_LENGTH);
    // Trim again in case truncation left trailing whitespace
    clean = clean.trim();
  }

  return `@${cleanHandle} (${clean})`;
}

/**
 * Sanitize slug with security checks.
 *
 * @param text - Text to sanitize
 * @returns Sanitized slug safe for filenames
 *
 * @throws {Error} If path traversal detected
 */
export function sanitizeSlug(text: string): string {
  // Pre-check for path traversal attempts
  if (/\.\.[\/\\]/.test(text)) {
    throw new Error(`Path traversal detected in slug: ${text}`);
  }

  return text
    .toLowerCase()
    // Remove control characters FIRST
    .replace(/[\x00-\x1f\x7f]/g, '')
    // Normalize Unicode to NFC
    .normalize('NFC')
    // Replace non-alphanumerics with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .slice(0, 80);
}
