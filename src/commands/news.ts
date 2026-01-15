import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { TwitterClient } from '../lib/twitter-client.js';
import type { NewsTab } from '../lib/twitter-client-news.js';

/**
 * Register news and trending commands.
 *
 * @param program Commander program instance.
 * @param ctx CLI context for shared helpers.
 */
export function registerNewsCommands(program: Command, ctx: CliContext): void {
  program
    .command('news')
    .description('Fetch AI-curated news and trending topics from X Explore page')
    .option('-n, --count <number>', 'Number of news items to fetch', '10')
    .option('--tabs <tabs>', 'Comma-separated tabs: for_you,trending,news,sports,entertainment')
    .option('--ai-only', 'Only fetch AI-curated content (default: true)', true)
    .option('--no-ai-only', 'Include non-AI-curated content')
    .option('--json', 'Output as JSON')
    .option('--json-full', 'Output as JSON with full raw API response in _raw field')
    .action(
      async (cmdOpts: { count?: string; tabs?: string; aiOnly?: boolean; json?: boolean; jsonFull?: boolean }) => {
        const opts = program.opts();
        const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
        const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);

        const countResult = ctx.parseIntegerOption(cmdOpts.count, { name: '--count', min: 1 });
        if (!countResult.ok) {
          console.error(`${ctx.p('err')}${countResult.error}`);
          process.exit(2);
        }
        const count = countResult.value;

        // Parse tabs option
        let tabs: NewsTab[] | undefined;
        if (cmdOpts.tabs) {
          const validTabs: NewsTab[] = ['for_you', 'trending', 'news', 'sports', 'entertainment'];
          const requestedTabs = cmdOpts.tabs.split(',').map((t) => t.trim().toLowerCase());

          tabs = [];
          for (const tab of requestedTabs) {
            if (validTabs.includes(tab as NewsTab)) {
              tabs.push(tab as NewsTab);
            } else {
              console.error(`${ctx.p('err')}Invalid tab: ${tab}. Valid tabs: ${validTabs.join(', ')}`);
              process.exit(2);
            }
          }

          if (tabs.length === 0) {
            console.error(`${ctx.p('err')}No valid tabs specified`);
            process.exit(2);
          }
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

        const result = await client.getNews(count, {
          aiOnly: cmdOpts.aiOnly ?? true,
          tabs,
          includeRaw,
        });

        if (result.success && result.items) {
          if (cmdOpts.json || cmdOpts.jsonFull) {
            console.log(JSON.stringify(result.items, null, 2));
          } else {
            if (result.items.length === 0) {
              console.log('No news items found.');
            } else {
              for (const item of result.items) {
                const category = item.category ? `${item.category} · ` : '';
                const tab = item.tab ? ` [${item.tab}]` : '';
                console.log(`\n${ctx.p('info')}${category}${item.headline}${tab}`);

                if (item.description) {
                  console.log(`  ${item.description}`);
                }

                if (item.timeAgo) {
                  console.log(`  ${item.timeAgo}`);
                }

                if (item.postCount !== undefined) {
                  console.log(`  ${item.postCount.toLocaleString()} posts`);
                }

                if (item.url) {
                  console.log(`  ${item.url}`);
                }
              }
            }
          }
        } else {
          console.error(`${ctx.p('err')}Failed to fetch news: ${result.error ?? 'Unknown error'}`);
          process.exit(1);
        }
      },
    );
}
