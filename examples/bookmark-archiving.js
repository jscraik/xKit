/**
 * Example: Bookmark Archiving with xKit
 * 
 * This example demonstrates how to use xKit's bookmark archiving
 * features programmatically.
 */

import {
    BookmarkCategorizer,
    BookmarkEnricher,
    FolderManager,
    MarkdownWriter,
    MediaHandler,
    StateManager,
    StatsTracker,
    TwitterClient,
    WebhookNotifier,
    resolveCredentials,
} from '@brainwav/xkit';

async function archiveBookmarks() {
    console.log('🐉 xKit Bookmark Archiver Example\n');

    // Step 1: Resolve credentials from browser cookies
    const { cookies } = await resolveCredentials({ cookieSource: 'safari' });

    // Step 2: Initialize components
    const client = new TwitterClient({ cookies });
    const enricher = new BookmarkEnricher({
        expandUrls: true,
        extractContent: true,
    });
    const categorizer = new BookmarkCategorizer();
    const writer = new MarkdownWriter({
        outputDir: './knowledge',
        archiveFile: './bookmarks.md',
        timezone: 'America/New_York',
    });
    const state = new StateManager();
    const folderManager = new FolderManager({
        folders: {
            '1234567890': 'ai-tools',
            '0987654321': 'articles',
        },
    });
    const mediaHandler = new MediaHandler({ includeMedia: true });
    const stats = new StatsTracker();

    // Step 3: Optional webhook notifications
    const webhook = new WebhookNotifier({
        url: 'https://discord.com/api/webhooks/...',
        type: 'discord',
        enabled: true,
        notifyOn: {
            start: true,
            success: true,
            error: true,
        },
    });

    try {
        stats.start();
        await webhook.notifyStart();

        // Step 4: Fetch bookmarks
        console.log('📥 Fetching bookmarks...');
        const result = await client.getBookmarks(50);

        if (!result.success || !result.tweets) {
            throw new Error('Failed to fetch bookmarks');
        }

        console.log(`✅ Fetched ${result.tweets.length} bookmarks`);

        // Step 5: Convert to bookmark records
        let bookmarks = result.tweets.map(tweet => ({
            id: tweet.id,
            text: tweet.text,
            author: tweet.author,
            url: `https://x.com/${tweet.author.username}/status/${tweet.id}`,
            createdAt: tweet.createdAt,
            urls: tweet.urls || [],
            media: mediaHandler.extractMedia(tweet.media),
            tags: [],
        }));

        // Step 6: Add folder tags
        bookmarks = folderManager.addFolderTags(bookmarks, '1234567890');

        // Step 7: Filter new bookmarks
        bookmarks = state.filterNew(bookmarks);
        console.log(`📝 Processing ${bookmarks.length} new bookmarks`);

        if (bookmarks.length === 0) {
            console.log('✨ No new bookmarks to process!');
            return;
        }

        stats.recordProcessed(bookmarks.length);

        // Step 8: Enrich bookmarks
        console.log('🔗 Enriching content...');
        const enrichStart = Date.now();

        const enriched = await enricher.enrichBatch(bookmarks, {
            concurrency: 5,
            onProgress: (current, total) => {
                process.stdout.write(`\r  Progress: ${current}/${total}`);
            },
        });

        stats.recordEnrichmentTime(Date.now() - enrichStart);
        console.log('\n✅ Enrichment complete');

        // Step 9: Categorize bookmarks
        console.log('🏷️  Categorizing...');
        const catStart = Date.now();

        const categorized = categorizer.categorizeBatch(enriched);

        stats.recordCategorizationTime(Date.now() - catStart);

        const categoryStats = categorizer.getCategoryStats(categorized);
        console.log('✅ Categories:');
        for (const [category, count] of Object.entries(categoryStats)) {
            console.log(`   ${category}: ${count}`);
        }

        // Step 10: Write to markdown
        console.log('\n📄 Writing markdown...');
        const writeStart = Date.now();

        const writeResult = await writer.write(categorized);

        stats.recordWritingTime(Date.now() - writeStart);
        console.log(`✅ Archive: ${writeResult.archiveFile}`);
        console.log(`✅ Knowledge files: ${writeResult.knowledgeFiles.length}`);

        // Step 11: Update state
        state.markBatchProcessed(categorized.map(b => b.id));
        state.save();

        // Step 12: Show stats
        stats.end();
        console.log('\n' + stats.formatStats());

        // Step 13: Send success notification
        const archiveStats = writer.getArchiveStats();
        await webhook.notifySuccess({
            bookmarksProcessed: bookmarks.length,
            knowledgeFilesCreated: writeResult.knowledgeFiles.length,
            totalInArchive: archiveStats.totalEntries,
            duration: stats.getTotalDuration(),
        });

        console.log('\n✨ Done!\n');
    } catch (error) {
        stats.recordError();
        await webhook.notifyError(error.message);
        console.error('❌ Error:', error);
        throw error;
    }
}

// Run the example
archiveBookmarks().catch(console.error);
