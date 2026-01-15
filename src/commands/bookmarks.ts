import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { extractBookmarkFolderId } from '../lib/extract-bookmark-folder-id.js';
import { TwitterClient } from '../lib/twitter-client.js';

/**
 * Register the bookmarks command.
 *
 * @param program Commander program instance.
 * @param ctx CLI context for shared helpers.
 */
export function registerBookmarksCommand(program: Command, ctx: CliContext): void {
  program
    .command('bookmarks')
    .description('Get your bookmarked tweets')
    .option('-n, --count <number>', 'Number of bookmarks to fetch', '20')
    .option('--folder-id <id>', 'Bookmark folder (collection) id')
    .option('--all', 'Fetch all bookmarks (paged)')
    .option('--max-pages <number>', 'Stop after N pages when using --all')
    .option('--cursor <string>', 'Resume pagination from a cursor')
    .option('--json', 'Output as JSON')
    .option('--json-full', 'Output as JSON with full raw API response in _raw field')
    .action(
      async (cmdOpts: {
        count?: string;
        json?: boolean;
        jsonFull?: boolean;
        folderId?: string;
        all?: boolean;
        maxPages?: string;
        cursor?: string;
      }) => {
        const opts = program.opts();
        const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

        const usePagination = cmdOpts.all || cmdOpts.cursor;

        if (cmdOpts.maxPages !== undefined && !usePagination) {
          console.error(`${ctx.p('err')}--max-pages requires --all or --cursor.`);
          process.exit(2);
        }

        let count = 20;
        if (!usePagination) {
          const countResult = ctx.parseIntegerOption(cmdOpts.count, { name: '--count', min: 1 });
          if (!countResult.ok) {
            console.error(`${ctx.p('err')}${countResult.error}`);
            process.exit(2);
          }
          count = countResult.value;
        }

        let maxPages: number | undefined;
        if (cmdOpts.maxPages !== undefined) {
          const maxPagesResult = ctx.parseIntegerOption(cmdOpts.maxPages, { name: '--max-pages', min: 1 });
          if (!maxPagesResult.ok) {
            console.error(`${ctx.p('err')}${maxPagesResult.error}`);
            process.exit(2);
          }
          maxPages = maxPagesResult.value;
        }

        const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

        for (const warning of warnings) {
          console.error(`${ctx.p('warn')}${warning}`);
        }

        if (!cookies.authToken || !cookies.ct0) {
          console.error(`${ctx.p('err')}Missing required credentials`);
          process.exit(1);
        }

        const client = new TwitterClient({ cookies, timeoutMs });
        const folderId = cmdOpts.folderId ? extractBookmarkFolderId(cmdOpts.folderId) : null;
        if (cmdOpts.folderId && !folderId) {
          console.error(`${ctx.p('err')}Invalid --folder-id. Expected numeric ID or https://x.com/i/bookmarks/<id>.`);
          process.exit(2);
        }
        const includeRaw = cmdOpts.jsonFull ?? false;
        const timelineOptions = { includeRaw };
        const paginationOptions = { includeRaw, maxPages, cursor: cmdOpts.cursor };
        const result = folderId
          ? usePagination
            ? await client.getAllBookmarkFolderTimeline(folderId, paginationOptions)
            : await client.getBookmarkFolderTimeline(folderId, count, timelineOptions)
          : usePagination
            ? await client.getAllBookmarks(paginationOptions)
            : await client.getBookmarks(count, timelineOptions);

        if (result.success && result.tweets) {
          const emptyMessage = folderId ? 'No bookmarks found in folder.' : 'No bookmarks found.';
          const isJson = cmdOpts.json || cmdOpts.jsonFull;
          if (isJson && usePagination) {
            console.log(JSON.stringify({ tweets: result.tweets, nextCursor: result.nextCursor ?? null }, null, 2));
          } else {
            ctx.printTweets(result.tweets, { json: isJson, emptyMessage });
          }
        } else {
          console.error(`${ctx.p('err')}Failed to fetch bookmarks: ${result.error}`);
          process.exit(1);
        }
      },
    );
}
