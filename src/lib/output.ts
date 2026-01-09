/**
 * Output rendering configuration for CLI formatting.
 */
export type OutputConfig = {
  plain: boolean;
  emoji: boolean;
  color: boolean;
};

/** Status prefix categories used in CLI output. */
export type StatusKind = 'ok' | 'warn' | 'err' | 'info' | 'hint';
/** Label prefix categories used in CLI output. */
export type LabelKind = 'url' | 'date' | 'source' | 'engine' | 'credentials' | 'user' | 'userId' | 'email';

const STATUS: Record<StatusKind, { emoji: string; text: string; plain: string }> = {
  ok: { emoji: '✅', text: 'OK:', plain: '[ok]' },
  warn: { emoji: '⚠️', text: 'Warning:', plain: '[warn]' },
  err: { emoji: '❌', text: 'Error:', plain: '[err]' },
  info: { emoji: 'ℹ️', text: 'Info:', plain: '[info]' },
  hint: { emoji: 'ℹ️', text: 'Hint:', plain: '[hint]' },
};

const LABELS: Record<LabelKind, { emoji: string; text: string; plain: string }> = {
  url: { emoji: '🔗', text: 'URL:', plain: 'url:' },
  date: { emoji: '📅', text: 'Date:', plain: 'date:' },
  source: { emoji: '📍', text: 'Source:', plain: 'source:' },
  engine: { emoji: '⚙️', text: 'Engine:', plain: 'engine:' },
  credentials: { emoji: '🔑', text: 'Credentials:', plain: 'credentials:' },
  user: { emoji: '🙋', text: 'User:', plain: 'user:' },
  userId: { emoji: '🪪', text: 'User ID:', plain: 'user_id:' },
  email: { emoji: '📧', text: 'Email:', plain: 'email:' },
};

/**
 * Resolve output behavior from raw argv flags.
 *
 * @param argv Raw CLI argv.
 * @param env Process environment variables.
 * @param isTty Whether stdout is attached to a TTY.
 * @returns Derived output configuration.
 */
export function resolveOutputConfigFromArgv(argv: string[], env: NodeJS.ProcessEnv, isTty: boolean): OutputConfig {
  const hasNoColorEnv = Object.hasOwn(env, 'NO_COLOR') || env.TERM === 'dumb';
  const defaultColor = isTty && !hasNoColorEnv;

  const plain = argv.includes('--plain');
  const emoji = !plain && !argv.includes('--no-emoji');
  const color = !plain && !argv.includes('--no-color') && defaultColor;

  return { plain, emoji, color };
}

/**
 * Resolve output behavior from Commander options.
 *
 * @param opts Commander options (`plain`, `emoji`, `color`).
 * @param env Process environment variables.
 * @param isTty Whether stdout is attached to a TTY.
 * @returns Derived output configuration.
 */
export function resolveOutputConfigFromCommander(
  opts: { plain?: boolean; emoji?: boolean; color?: boolean },
  env: NodeJS.ProcessEnv,
  isTty: boolean,
): OutputConfig {
  const hasNoColorEnv = Object.hasOwn(env, 'NO_COLOR') || env.TERM === 'dumb';
  const defaultColor = isTty && !hasNoColorEnv;

  const plain = Boolean(opts.plain);
  const emoji = !plain && (opts.emoji ?? true);
  const color = !plain && (opts.color ?? true) && defaultColor;

  return { plain, emoji, color };
}

/**
 * Format a status prefix for output lines.
 *
 * @param kind Status variant to render.
 * @param cfg Output configuration.
 * @returns Formatted status prefix string.
 */
export function statusPrefix(kind: StatusKind, cfg: OutputConfig): string {
  if (cfg.plain) {
    return `${STATUS[kind].plain} `;
  }
  if (cfg.emoji) {
    return `${STATUS[kind].emoji} `;
  }
  return `${STATUS[kind].text} `;
}

/**
 * Format a label prefix for output lines.
 *
 * @param kind Label variant to render.
 * @param cfg Output configuration.
 * @returns Formatted label prefix string.
 */
export function labelPrefix(kind: LabelKind, cfg: OutputConfig): string {
  if (cfg.plain) {
    return `${LABELS[kind].plain} `;
  }
  if (cfg.emoji) {
    return `${LABELS[kind].emoji} `;
  }
  return `${LABELS[kind].text} `;
}

/**
 * Format a like/retweet/reply stats line.
 *
 * @param stats Tweet stats to render.
 * @param cfg Output configuration.
 * @returns Rendered stats line.
 */
export function formatStatsLine(
  stats: { likeCount?: number | null; retweetCount?: number | null; replyCount?: number | null },
  cfg: OutputConfig,
): string {
  const likeCount = stats.likeCount ?? 0;
  const retweetCount = stats.retweetCount ?? 0;
  const replyCount = stats.replyCount ?? 0;

  if (cfg.plain) {
    return `likes: ${likeCount}  retweets: ${retweetCount}  replies: ${replyCount}`;
  }
  if (!cfg.emoji) {
    return `Likes ${likeCount}  Retweets ${retweetCount}  Replies ${replyCount}`;
  }
  return `❤️ ${likeCount}  🔁 ${retweetCount}  💬 ${replyCount}`;
}

/**
 * Format a tweet URL for the given tweet ID.
 *
 * @param tweetId Tweet ID.
 * @returns URL string for the tweet.
 */
export function formatTweetUrl(tweetId: string): string {
  return `https://x.com/i/status/${tweetId}`;
}

/**
 * Format a labeled tweet URL line.
 *
 * @param tweetId Tweet ID.
 * @param cfg Output configuration.
 * @returns Labeled URL line.
 */
export function formatTweetUrlLine(tweetId: string, cfg: OutputConfig): string {
  return `${labelPrefix('url', cfg)}${formatTweetUrl(tweetId)}`;
}
