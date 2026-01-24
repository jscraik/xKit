import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { normalizeHandle } from '../lib/normalize-handle.js';
import { TwitterClient } from '../lib/twitter-client.js';

/**
 * Register user timeline command.
 *
 * @param program Commander program instance.
 * @param ctx CLI context for shared helpers.
 */
export function registerUserTimelineCommand(program: Command, ctx: CliContext): void {
    program
        .command('user-timeline')
        .description('Get tweets from a specific user')
        .argument('<username>', 'Username (e.g., @jh3yy or jh3yy)')
        .option('-n, --count <number>', 'Number of tweets to fetch', '20')
        .option('--json', 'Output as JSON')
        .option('--json-full', 'Output as JSON with full raw API response in _raw field')
        .action(async (username: string, cmdOpts: { count?: string; json?: boolean; jsonFull?: boolean }) => {
            const opts = program.opts();
            const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
            const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);

            const countResult = ctx.parseIntegerOption(cmdOpts.count, { name: '--count', min: 1 });
            if (!countResult.ok) {
                console.error(`${ctx.p('err')}${countResult.error}`);
                process.exit(2);
            }
            const count = countResult.value;

            // Normalize username (remove @ if present)
            const normalizedUsername = normalizeHandle(username);
            if (!normalizedUsername) {
                console.error(`${ctx.p('err')}Invalid username: ${username}`);
                process.exit(2);
            }

            const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

            for (const warning of warnings) {
                console.error(`${ctx.p('warn')}${warning}`);
            }

            if (!cookies.authToken || !cookies.ct0) {
                console.error(`${ctx.p('err')}Missing required credentials`);
                process.exit(1);
            }

            const client = new TwitterClient({ cookies, timeoutMs, quoteDepth });
            const includeRaw = cmdOpts.jsonFull ?? false;
            const result = await client.getUserTweets(normalizedUsername, count, { includeRaw });

            if (result.success && result.tweets) {
                ctx.printTweets(result.tweets, {
                    json: cmdOpts.json || cmdOpts.jsonFull,
                    emptyMessage: `No tweets found for @${normalizedUsername}.`,
                });
            } else {
                console.error(`${ctx.p('err')}Failed to fetch user timeline: ${result.error}`);
                process.exit(1);
            }
        });
}
