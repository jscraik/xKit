import type { Command } from 'commander';
import JSON5 from 'json5';
import kleur from 'kleur';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { type CookieSource, resolveCredentials } from '../lib/cookies.js';
import { extractTweetId } from '../lib/extract-tweet-id.js';
import {
  labelPrefix,
  type OutputConfig,
  resolveOutputConfigFromArgv,
  resolveOutputConfigFromCommander,
  statusPrefix,
} from '../lib/output.js';
import type { TweetData } from '../lib/twitter-client.js';

/**
 * JSON5-backed CLI configuration stored in ~/.config/xkit/config.json5 or ./.xkitrc.json5.
 */
export type XKitConfig = {
  authToken?: string;
  ct0?: string;
  chromeProfile?: string;
  firefoxProfile?: string;
  cookieSource?: CookieSource | CookieSource[];
  cookieTimeoutMs?: number;
  timeoutMs?: number;
  quoteDepth?: number;
};

/**
 * Loaded media attachment metadata and content.
 */
export type MediaSpec = { path: string; alt?: string; mime: string; buffer: Buffer };

/**
 * Shared CLI helpers and resolved configuration used by command handlers.
 */
export type CliContext = {
  isTty: boolean;
  getOutput: () => OutputConfig;
  colors: {
    banner: (t: string) => string;
    subtitle: (t: string) => string;
    section: (t: string) => string;
    bullet: (t: string) => string;
    command: (t: string) => string;
    option: (t: string) => string;
    argument: (t: string) => string;
    description: (t: string) => string;
    muted: (t: string) => string;
    accent: (t: string) => string;
  };
  p: (kind: Parameters<typeof statusPrefix>[0]) => string;
  l: (kind: Parameters<typeof labelPrefix>[0]) => string;
  config: XKitConfig;
  applyOutputFromCommand: (command: Command) => void;
  resolveTimeoutFromOptions: (options: { timeout?: string | number }) => number | undefined;
  resolveQuoteDepthFromOptions: (options: { quoteDepth?: string | number }) => number | undefined;
  resolveCredentialsFromOptions: (opts: CredentialsOptions) => ReturnType<typeof resolveCredentials>;
  loadMedia: (opts: { media: string[]; alts: string[] }) => MediaSpec[];
  printTweets: (tweets: TweetData[], opts?: { json?: boolean; emptyMessage?: string; showSeparator?: boolean }) => void;
  extractTweetId: (tweetIdOrUrl: string) => string;
  parseIntegerOption: typeof parseIntegerOption;
};

const COOKIE_SOURCES: CookieSource[] = ['safari', 'chrome', 'firefox'];

const INTEGER_REGEX = /^[+-]?\d+$/;

export type IntegerOptionParseResult = { ok: true; value: number } | { ok: false; error: string };

export function parseIntegerOption(
  raw: string | number | undefined | null,
  opts: { name: string; min?: number; max?: number },
): IntegerOptionParseResult {
  const valueString = typeof raw === 'number' ? String(raw) : String(raw ?? '');
  const trimmed = valueString.trim();

  const min = typeof opts.min === 'number' && Number.isFinite(opts.min) ? opts.min : undefined;
  const max = typeof opts.max === 'number' && Number.isFinite(opts.max) ? opts.max : undefined;

  const expectedRange = (() => {
    if (min !== undefined && max !== undefined) {
      return `Expected an integer between ${min} and ${max}.`;
    }
    if (min !== undefined) {
      return `Expected an integer >= ${min}.`;
    }
    if (max !== undefined) {
      return `Expected an integer <= ${max}.`;
    }
    return 'Expected an integer.';
  })();

  if (!trimmed || !INTEGER_REGEX.test(trimmed)) {
    return { ok: false, error: `Invalid ${opts.name}. ${expectedRange}` };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed)) {
    return { ok: false, error: `Invalid ${opts.name}. ${expectedRange}` };
  }

  if (min !== undefined && parsed < min) {
    return { ok: false, error: `Invalid ${opts.name}. ${expectedRange}` };
  }

  if (max !== undefined && parsed > max) {
    return { ok: false, error: `Invalid ${opts.name}. ${expectedRange}` };
  }

  return { ok: true, value: parsed };
}

function parseCookieSource(value: string): CookieSource {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'safari' || normalized === 'chrome' || normalized === 'firefox') {
    return normalized;
  }
  throw new Error(`Invalid --cookie-source "${value}". Allowed: safari, chrome, firefox.`);
}

/**
 * Commander collector for `--cookie-source` flags.
 *
 * @param value Raw flag value.
 * @param previous Accumulated values.
 * @returns Updated cookie source list.
 * @throws When the cookie source is invalid.
 */
export const collectCookieSource = (value: string, previous: CookieSource[] = []): CookieSource[] => {
  previous.push(parseCookieSource(value));
  return previous;
};

function resolveCookieSourceOrder(input: unknown): CookieSource[] | undefined {
  if (typeof input === 'string') {
    return [parseCookieSource(input)];
  }
  if (Array.isArray(input)) {
    const result: CookieSource[] = [];
    for (const entry of input) {
      if (typeof entry !== 'string') {
        continue;
      }
      result.push(parseCookieSource(entry));
    }
    return result.length > 0 ? result : undefined;
  }
  return undefined;
}

function resolveTimeoutMs(...values: Array<string | number | undefined | null>): number | undefined {
  for (const value of values) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function resolveQuoteDepth(...values: Array<string | number | undefined | null>): number | undefined {
  for (const value of values) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return undefined;
}

function detectMime(path: string): string | null {
  const ext = path.toLowerCase();
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (ext.endsWith('.png')) {
    return 'image/png';
  }
  if (ext.endsWith('.webp')) {
    return 'image/webp';
  }
  if (ext.endsWith('.gif')) {
    return 'image/gif';
  }
  if (ext.endsWith('.mp4') || ext.endsWith('.m4v')) {
    return 'video/mp4';
  }
  if (ext.endsWith('.mov')) {
    return 'video/quicktime';
  }
  return null;
}

function readConfigFile(path: string, warn: (message: string) => void): Partial<XKitConfig> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON5.parse(raw) as Partial<XKitConfig>;
    return parsed ?? {};
  } catch (error) {
    warn(`Failed to parse config at ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function loadConfig(warn: (message: string) => void): XKitConfig {
  const globalPath = join(homedir(), '.config', 'xkit', 'config.json5');
  const localPath = join(process.cwd(), '.xkitrc.json5');

  return {
    ...readConfigFile(globalPath, warn),
    ...readConfigFile(localPath, warn),
  };
}

type CredentialsOptions = {
  authToken?: string;
  ct0?: string;
  chromeProfile?: string;
  firefoxProfile?: string;
  cookieSource?: CookieSource[];
  cookieTimeout?: string | number;
};

/**
 * Create the CLI context with resolved configuration, output formatting, and helpers.
 *
 * @param normalizedArgs CLI argv (post normalization).
 * @param env Process environment variables.
 * @returns CLI context for command registration and execution.
 */
export function createCliContext(normalizedArgs: string[], env: NodeJS.ProcessEnv = process.env): CliContext {
  const isTty = process.stdout.isTTY;
  let output: OutputConfig = resolveOutputConfigFromArgv(normalizedArgs, env, isTty);
  kleur.enabled = output.color;

  const wrap =
    (styler: (text: string) => string): ((text: string) => string) =>
      (text: string): string =>
        isTty ? styler(text) : text;

  const colors = {
    banner: wrap((t) => kleur.bold().blue(t)),
    subtitle: wrap((t) => kleur.dim(t)),
    section: wrap((t) => kleur.bold().white(t)),
    bullet: wrap((t) => kleur.blue(t)),
    command: wrap((t) => kleur.bold().cyan(t)),
    option: wrap((t) => kleur.cyan(t)),
    argument: wrap((t) => kleur.magenta(t)),
    description: wrap((t) => kleur.white(t)),
    muted: wrap((t) => kleur.gray(t)),
    accent: wrap((t) => kleur.green(t)),
  };

  const p = (kind: Parameters<typeof statusPrefix>[0]): string => {
    const prefix = statusPrefix(kind, output);
    if (output.plain || !output.color) {
      return prefix;
    }
    if (kind === 'ok') {
      return kleur.green(prefix);
    }
    if (kind === 'warn') {
      return kleur.yellow(prefix);
    }
    if (kind === 'err') {
      return kleur.red(prefix);
    }
    if (kind === 'info') {
      return kleur.cyan(prefix);
    }
    return kleur.gray(prefix);
  };

  const l = (kind: Parameters<typeof labelPrefix>[0]): string => {
    const prefix = labelPrefix(kind, output);
    if (output.plain || !output.color) {
      return prefix;
    }
    if (kind === 'url') {
      return kleur.cyan(prefix);
    }
    if (kind === 'date') {
      return kleur.magenta(prefix);
    }
    if (kind === 'source') {
      return kleur.gray(prefix);
    }
    if (kind === 'engine') {
      return kleur.blue(prefix);
    }
    if (kind === 'credentials') {
      return kleur.yellow(prefix);
    }
    if (kind === 'user') {
      return kleur.cyan(prefix);
    }
    if (kind === 'userId') {
      return kleur.magenta(prefix);
    }
    if (kind === 'email') {
      return kleur.green(prefix);
    }
    return kleur.gray(prefix);
  };

  const config = loadConfig((message) => {
    console.error(colors.muted(`${p('warn')}${message}`));
  });

  function applyOutputFromCommand(command: Command): void {
    const opts = command.optsWithGlobals() as { plain?: boolean; emoji?: boolean; color?: boolean };
    output = resolveOutputConfigFromCommander(opts, env, isTty);
    kleur.enabled = output.color;
  }

  function resolveTimeoutFromOptions(options: { timeout?: string | number }): number | undefined {
    return resolveTimeoutMs(options.timeout, config.timeoutMs, env.XKIT_TIMEOUT_MS);
  }

  function resolveCookieTimeoutFromOptions(options: { cookieTimeout?: string | number }): number | undefined {
    return resolveTimeoutMs(options.cookieTimeout, config.cookieTimeoutMs, env.XKIT_COOKIE_TIMEOUT_MS);
  }

  function resolveQuoteDepthFromOptions(options: { quoteDepth?: string | number }): number | undefined {
    return resolveQuoteDepth(options.quoteDepth, config.quoteDepth, env.XKIT_QUOTE_DEPTH);
  }

  function resolveCredentialsFromOptions(opts: CredentialsOptions): ReturnType<typeof resolveCredentials> {
    const cookieSource = opts.cookieSource?.length
      ? opts.cookieSource
      : (resolveCookieSourceOrder(config.cookieSource) ?? COOKIE_SOURCES);
    return resolveCredentials({
      authToken: opts.authToken || config.authToken,
      ct0: opts.ct0 || config.ct0,
      cookieSource,
      chromeProfile: opts.chromeProfile || config.chromeProfile,
      firefoxProfile: opts.firefoxProfile || config.firefoxProfile,
      cookieTimeoutMs: resolveCookieTimeoutFromOptions(opts),
    });
  }

  function loadMedia(opts: { media: string[]; alts: string[] }): MediaSpec[] {
    if (opts.media.length === 0) {
      return [];
    }
    const specs: MediaSpec[] = [];
    for (const [index, path] of opts.media.entries()) {
      const mime = detectMime(path);
      if (!mime) {
        throw new Error(`Unsupported media type for ${path}. Supported: jpg, jpeg, png, webp, gif, mp4, mov`);
      }
      const buffer = readFileSync(path);
      specs.push({ path, mime, buffer, alt: opts.alts[index] });
    }

    const videoCount = specs.filter((m) => m.mime.startsWith('video/')).length;
    if (videoCount > 1) {
      throw new Error('Only one video can be attached');
    }
    if (videoCount === 1 && specs.length > 1) {
      throw new Error('Video cannot be combined with other media');
    }
    if (specs.length > 4) {
      throw new Error('Maximum 4 media attachments');
    }
    return specs;
  }

  function printTweets(
    tweets: TweetData[],
    opts: { json?: boolean; emptyMessage?: string; showSeparator?: boolean } = {},
  ) {
    if (opts.json) {
      console.log(JSON.stringify(tweets, null, 2));
      return;
    }
    if (tweets.length === 0) {
      console.log(opts.emptyMessage ?? 'No tweets found.');
      return;
    }
    for (const tweet of tweets) {
      console.log(`\n@${tweet.author.username} (${tweet.author.name}):`);
      console.log(tweet.text);
      if (tweet.createdAt) {
        console.log(`${l('date')}${tweet.createdAt}`);
      }
      console.log(`${l('url')}https://x.com/${tweet.author.username}/status/${tweet.id}`);
      if (opts.showSeparator ?? true) {
        console.log('─'.repeat(50));
      }
    }
  }

  return {
    isTty,
    getOutput: () => output,
    colors,
    p,
    l,
    config,
    applyOutputFromCommand,
    resolveTimeoutFromOptions,
    resolveQuoteDepthFromOptions,
    resolveCredentialsFromOptions,
    loadMedia,
    printTweets,
    extractTweetId,
    parseIntegerOption,
  };
}
