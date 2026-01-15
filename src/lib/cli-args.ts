/**
 * Parsed CLI invocation for Commander bootstrapping.
 */
export type CliInvocation = {
  argv: string[] | null;
  showHelp: boolean;
};

const TWEET_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:[^/]+\/status|i\/web\/status|i\/status)\/\d+/i;
const TWEET_ID_REGEX = /^\d{8,}$/;

/**
 * Check whether a string looks like a tweet URL or numeric tweet ID.
 *
 * @param value Raw CLI argument to inspect.
 * @returns True when the value looks like a tweet URL or ID.
 */
export function looksLikeTweetInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return TWEET_URL_REGEX.test(trimmed) || TWEET_ID_REGEX.test(trimmed);
}

/**
 * Build the argv for Commander, rewriting bare tweet inputs into `read` commands.
 *
 * @param rawArgs Arguments passed to the CLI (without node/binary).
 * @param knownCommands Set of known command names for inference guards.
 * @returns Normalized argv and help visibility settings.
 *
 * @example
 * ```ts
 * const result = resolveCliInvocation(['https://x.com/user/status/123'], new Set(['read']));
 * // result.argv === ['node', 'xkit', 'read', 'https://x.com/user/status/123']
 * ```
 */
export function resolveCliInvocation(rawArgs: string[], knownCommands: Set<string>): CliInvocation {
  if (rawArgs.length === 0) {
    return { argv: null, showHelp: true };
  }

  const hasKnownCommand = rawArgs.some((arg) => knownCommands.has(arg));

  if (!hasKnownCommand) {
    const tweetArgIndex = rawArgs.findIndex(looksLikeTweetInput);
    if (tweetArgIndex >= 0) {
      const rewrittenArgs = [...rawArgs];
      rewrittenArgs.splice(tweetArgIndex, 0, 'read');
      return { argv: ['node', 'xkit', ...rewrittenArgs], showHelp: false };
    }
  }

  return { argv: null, showHelp: false };
}
