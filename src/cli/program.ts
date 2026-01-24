import { Command } from 'commander';
import { registerBookmarkAnalysisCommand } from '../commands/bookmark-analysis.js';
import { registerBookmarkExportCommand } from '../commands/bookmark-export.js';
import { registerBookmarksArchiveCommand } from '../commands/bookmarks-archive.js';
import { registerBookmarksCommand } from '../commands/bookmarks.js';
import { registerCacheCommand } from '../commands/cache.js';
import { registerCheckCommand } from '../commands/check.js';
import { registerDaemonCommands } from '../commands/daemon.js';
import { registerGenerateSkillsCommand } from '../commands/generate-skills.js';
import { registerHelpCommand } from '../commands/help.js';
import { registerLearnCommand } from '../commands/learn.js';
import { registerListsCommand } from '../commands/lists.js';
import { registerMetricsCommand } from '../commands/metrics.js';
import { registerNewsCommands } from '../commands/news.js';
import { registerPostCommands } from '../commands/post.js';
import { registerQueryIdsCommand } from '../commands/query-ids.js';
import { registerReadCommands } from '../commands/read.js';
import { registerRecapCommand } from '../commands/recap.js';
import { registerSearchCommands } from '../commands/search.js';
import { registerSetupCommand } from '../commands/setup.js';
import { registerSummarizeCommand } from '../commands/summarize.js';
import { registerTemplateCommands } from '../commands/templates.js';
import { registerUnbookmarkCommand } from '../commands/unbookmark.js';
import { registerUserTimelineCommand } from '../commands/user-timeline.js';
import { registerUserCommands } from '../commands/users.js';
import { getCliVersion } from '../lib/version.js';
import { metrics } from '../metrics/metrics-collector.js';
import { type CliContext, collectCookieSource } from './shared.js';

/**
 * Known CLI commands used to detect shorthand invocations.
 */
export const KNOWN_COMMANDS = new Set([
  'tweet',
  'reply',
  'query-ids',
  'read',
  'replies',
  'thread',
  'search',
  'mentions',
  'bookmarks',
  'bookmarks-archive',
  'archive',
  'cache',
  'unbookmark',
  'following',
  'followers',
  'likes',
  'lists',
  'list-timeline',
  'news',
  'help',
  'whoami',
  'check',
  'setup',
  'daemon',
  'export-bookmarks',
  'analyze-bookmarks',
  'metrics',
  'generate-skills',
  'learn',
  'recap',
  'summarize',
  'template',
  'templates',
]);

/**
 * Create and configure the Commander program with all xkit commands.
 *
 * @param ctx CLI context used for shared formatting and config.
 * @returns Configured Commander program instance.
 */
export function createProgram(ctx: CliContext): Command {
  const program: Command = new Command();

  program.configureHelp({
    showGlobalOptions: true,
    styleTitle: (t) => ctx.colors.section(t),
    styleUsage: (t) => ctx.colors.description(t),
    styleCommandText: (t) => ctx.colors.command(t),
    styleCommandDescription: (t) => ctx.colors.muted(t),
    styleOptionTerm: (t) => ctx.colors.option(t),
    styleOptionText: (t) => ctx.colors.option(t),
    styleOptionDescription: (t) => ctx.colors.muted(t),
    styleArgumentTerm: (t) => ctx.colors.argument(t),
    styleArgumentText: (t) => ctx.colors.argument(t),
    styleArgumentDescription: (t) => ctx.colors.muted(t),
    styleSubcommandTerm: (t) => ctx.colors.command(t),
    styleSubcommandText: (t) => ctx.colors.command(t),
    styleSubcommandDescription: (t) => ctx.colors.muted(t),
    styleDescriptionText: (t) => ctx.colors.muted(t),
  });

  const collect = (value: string, previous: string[] = []): string[] => {
    previous.push(value);
    return previous;
  };

  program.addHelpText(
    'beforeAll',
    () =>
      `${ctx.colors.banner('xkit')} ${ctx.colors.muted(getCliVersion())} ${ctx.colors.subtitle(
        '— fast X CLI for tweeting, replying, and reading',
      )}`,
  );

  program.name('xkit').description('Post tweets and replies via Twitter/X GraphQL API').version(getCliVersion());

  const formatExample = (command: string, description: string): string =>
    `${ctx.colors.command(`  ${command}`)}\n${ctx.colors.muted(`    ${description}`)}`;

  program.addHelpText(
    'afterAll',
    () =>
      `\n${ctx.colors.section('Examples')}\n${[
        formatExample('xkit whoami', 'Show the logged-in account via GraphQL cookies'),
        formatExample('xkit --firefox-profile default-release whoami', 'Use Firefox profile cookies'),
        formatExample('xkit tweet "hello from xkit"', 'Send a tweet'),
        formatExample(
          'xkit 1234567890123456789 --json',
          'Read a tweet (ID or URL shorthand for `read`) and print JSON',
        ),
      ].join('\n\n')}\n\n${ctx.colors.section('Shortcuts')}\n${[
        formatExample('xkit <tweet-id-or-url> [--json]', 'Shorthand for `xkit read <tweet-id-or-url>`'),
      ].join('\n\n')}\n\n${ctx.colors.section('JSON Output')}\n${ctx.colors.muted(
        `  Add ${ctx.colors.option('--json')} to: read, replies, thread, search, mentions, bookmarks, likes, following, followers, lists, list-timeline, news, query-ids`,
      )}\n${ctx.colors.muted(
        `  Add ${ctx.colors.option('--json-full')} to include raw API response in ${ctx.colors.argument('_raw')} field (tweet and news commands)`,
      )}\n${ctx.colors.muted(`  (Run ${ctx.colors.command('xkit <command> --help')} to see per-command flags.)`)}`,
  );

  program.addHelpText(
    'afterAll',
    () =>
      `\n\n${ctx.colors.section('Config')}\n${ctx.colors.muted(
        `  Reads ${ctx.colors.argument('~/.config/xkit/config.json5')} and ${ctx.colors.argument('./.xkitrc.json5')} (JSON5)`,
      )}\n${ctx.colors.muted(
        `  Supports: chromeProfile, firefoxProfile, cookieSource, cookieTimeoutMs, timeoutMs, quoteDepth`,
      )}\n\n${ctx.colors.section('Env')}\n${ctx.colors.muted(
        `  ${ctx.colors.option('NO_COLOR')}, ${ctx.colors.option('XKIT_TIMEOUT_MS')}, ${ctx.colors.option('XKIT_COOKIE_TIMEOUT_MS')}, ${ctx.colors.option('XKIT_QUOTE_DEPTH')}`,
      )}`,
  );

  program.addHelpText(
    'afterAll',
    () =>
      `\n${ctx.colors.section('JSON Output')}\n${ctx.colors.muted(
        `  Add ${ctx.colors.option('--json')} to: read, replies, thread, search, mentions, bookmarks, likes, following, followers, lists, list-timeline, news, query-ids`,
      )}\n${ctx.colors.muted(
        `  Add ${ctx.colors.option('--json-full')} to include raw API response in ${ctx.colors.argument('_raw')} field (tweet and news commands)`,
      )}\n${ctx.colors.muted(`  (Run ${ctx.colors.command('xkit <command> --help')} to see per-command flags.)`)}`,
  );

  program
    .option('--auth-token <token>', 'Twitter auth_token cookie')
    .option('--ct0 <token>', 'Twitter ct0 cookie')
    .option('--chrome-profile <name>', 'Chrome profile name for cookie extraction', ctx.config.chromeProfile)
    .option('--firefox-profile <name>', 'Firefox profile name for cookie extraction', ctx.config.firefoxProfile)
    .option('--cookie-timeout <ms>', 'Cookie extraction timeout in milliseconds (keychain/OS helpers)')
    .option('--cookie-source <source>', 'Cookie source for browser cookie extraction (repeatable)', collectCookieSource)
    .option('--media <path>', 'Attach media file (repeatable, up to 4 images or 1 video)', collect)
    .option('--alt <text>', 'Alt text for the corresponding --media (repeatable)', collect)
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--quote-depth <depth>', 'Max quoted tweet depth (default: 1; 0 disables)')
    .option('--plain', 'Plain output (stable, no emoji, no color)')
    .option('--no-emoji', 'Disable emoji output')
    .option('--no-color', 'Disable ANSI colors (or set NO_COLOR)');

  program.hook('preAction', (_thisCommand, actionCommand) => {
    ctx.applyOutputFromCommand(actionCommand);
  });

  // Metrics collection hooks
  if (metrics) {
    program.hook('preAction', (_thisCommand, actionCommand) => {
      const commandName = actionCommand.name();
      // Store start time on the command object for post-action retrieval
      (actionCommand as any)._metricsStartTime = Date.now();
      (actionCommand as any)._metricsCommandName = commandName;
    });

    program.hook('postAction', async (_thisCommand, actionCommand) => {
      const startTime = (actionCommand as any)._metricsStartTime;
      const commandName = (actionCommand as any)._metricsCommandName;

      if (startTime && commandName && metrics) {
        const duration = Date.now() - startTime;
        metrics.record({
          command: commandName,
          timestamp: startTime,
          duration,
          success: true,
        });
      }
    });
  }

  registerHelpCommand(program, ctx);
  registerSetupCommand(program, ctx);
  registerQueryIdsCommand(program, ctx);
  registerPostCommands(program, ctx);
  registerReadCommands(program, ctx);
  registerSearchCommands(program, ctx);
  registerUserTimelineCommand(program, ctx);
  registerNewsCommands(program, ctx);
  registerBookmarksCommand(program, ctx);
  registerBookmarksArchiveCommand(program, ctx);
  registerDaemonCommands(program, ctx);
  registerUnbookmarkCommand(program, ctx);
  registerListsCommand(program, ctx);
  registerUserCommands(program, ctx);
  registerCheckCommand(program, ctx);
  registerBookmarkExportCommand(program, ctx);
  registerBookmarkAnalysisCommand(program, ctx);
  registerCacheCommand(program, ctx);
  registerMetricsCommand(program, ctx);
  registerGenerateSkillsCommand(program, ctx);
  registerLearnCommand(program, ctx);
  registerRecapCommand(program, ctx);
  registerSummarizeCommand(program, ctx);
  registerTemplateCommands(program, ctx);

  return program;
}
